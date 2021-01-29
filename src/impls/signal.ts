import StorageRecord from "../models/StorageRecord";
import { NODE_ENV } from '../config/env';
import * as db from '../config/db';
import {
    ProtocolStoreBackend, IdentityKey, Session,
    PreKey, SignedPreKey,
    Unprocessed, Group, Configuration,
} from "@throneless/libsignal-service";

const DIALECT = db[NODE_ENV].dialect;

const debug = NODE_ENV === 'development' ?
    (...args: any[]) => console.info(...args) :
    (...args: any[]) => {};

function base64ToArrayBuffer(value: string): ArrayBuffer {
    const buffer = Buffer.from(value, 'base64');
    const { byteOffset, byteLength } = buffer;
    return buffer.buffer.slice(byteOffset, byteOffset + byteLength);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    return Buffer.from(buffer).toString('base64');
}

function base64ToUint8Array(value: string): Uint8Array {
    const buffer = Buffer.from(value, 'base64');
    const { byteOffset, byteLength } = buffer;
    return new Uint8Array(buffer.buffer.slice(byteOffset, byteOffset + byteLength));
}

function uint8ArrayToBase64(array: Uint8Array): string {
    return Buffer.from(array).toString('base64');
}

const loadIdentityKey = ({data}: StorageRecord) => ({
    ...data,
    publicKey: base64ToArrayBuffer(data.publicKey),
} as IdentityKey);

const storeIdentityKey = (data: IdentityKey) => ({
    ...data,
    publicKey: arrayBufferToBase64(data.publicKey),
});

// The record field contains weird JSON data with invalid unicode
// characters. In order to make it round-trip safe to/from the
// database I encode it as base64.
const loadSession = ({data}: StorageRecord) => {
    const { record } = data;
    return {
        ...data,
        record: typeof record === 'string' ?
            Buffer.from(record, 'base64').toString() :
            record,
    } as Session;
};

const storeSession = (data: Session) => {
    const { record } = data;
    return {
        ...data,
        record: typeof record === 'string' ?
            // maybe from 'binary' encoding?
            Buffer.from(record).toString('base64') :
            record,
    };
};

const loadPreKey = ({data}: StorageRecord) => ({
    ...data,
    publicKey:  base64ToArrayBuffer(data.publicKey),
    privateKey: base64ToArrayBuffer(data.privateKey),
} as PreKey);

const storePreKey = (data: PreKey) => ({
    ...data,
    publicKey:  arrayBufferToBase64(data.publicKey),
    privateKey: arrayBufferToBase64(data.privateKey),
});

const loadSignedPreKey = ({data}: StorageRecord) => ({
    ...data,
    publicKey:  base64ToArrayBuffer(data.publicKey),
    privateKey: base64ToArrayBuffer(data.privateKey),
} as SignedPreKey);

const storeSignedPreKey = (data: SignedPreKey) => ({
    ...data,
    publicKey:  arrayBufferToBase64(data.publicKey),
    privateKey: arrayBufferToBase64(data.privateKey),
});

const loadUnprocessed = ({data}: StorageRecord) => {
    const { envelope } = data;

    if (typeof envelope === 'string') {
        return {
            ...data,
            envelope: base64ToUint8Array(envelope),
        } as Unprocessed;
    }
    return data as Unprocessed;
};

const storeUnprocessed = (data: Unprocessed) => {
    const { envelope } = data;

    if (envelope instanceof Uint8Array) {
        return {
            ...data,
            envelope: uint8ArrayToBase64(envelope)
        };
    }

    return data;
};

const loadConfiguration = ({data}: StorageRecord) => {
    const { id } = data;
    if (data.id === 'identityKey') {
        const { value } = data;
        return {
            id,
            value: {
                pubKey:  base64ToArrayBuffer(value.pubKey),
                privKey: base64ToArrayBuffer(value.privKey),
            }
        };
    } else {
        return data;
    }
};

const storeConfiguration = (data: Configuration) => {
    const { id } = data;
    if (data.id === 'identityKey') {
        const { value } = data;
        return {
            id,
            value: {
                pubKey:  arrayBufferToBase64(value.pubKey),
                privKey: arrayBufferToBase64(value.privKey),
            }
        };
    } else {
        return data;
    }
};

export class SignalStorage implements ProtocolStoreBackend {
    readonly clientId: string;
    readonly tel: string;

    constructor(clientId: string, tel: string) {
        this.clientId = clientId;
        this.tel      = tel;
    }

    // ==== IdentityKey ====
    async getAllIdentityKeys() {
        const records = await StorageRecord.findAll({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'IdentityKey',
            }
        });

        return records.map(loadIdentityKey);
    }

    async createOrUpdateIdentityKey(data: IdentityKey) {
        debug('createOrUpdateIdentityKey:', data);
        await StorageRecord.upsert({
            clientId: this.clientId,
            tel:      this.tel,
            type:     'IdentityKey',
            id:       data.id,
            data:     storeIdentityKey(data),
        });
    }

    async removeIdentityKeyById(id: string) {
        await StorageRecord.destroy({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'IdentityKey',
                id,
            }
        });
    }

    // ==== Session ====
    async getAllSessions() {
        const records = await StorageRecord.findAll({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Session',
            }
        });

        return records.map(loadSession);
    }

    async createOrUpdateSession(data: Session) {
        debug('createOrUpdateSession:', data);
        await StorageRecord.upsert({
            clientId: this.clientId,
            tel:      this.tel,
            type:     'Session',
            id:       data.id,
            data:     storeSession(data),
        });
    }

    async removeSessionById(id: string) {
        await StorageRecord.destroy({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Session',
                id,
            }
        });
    }

    async postgresRemoveSessionsByNumber(number: string|number) {
        await StorageRecord.destroy({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Session',
                data: {
                    number,
                },
            }
        });

    }

    async fallbackRemoveSessionsByNumber(number: string|number) {
        const records = await StorageRecord.findAll({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Session',
            }
        });

        for (const record of records) {
            const session = record.data as Session;
            if (session?.number === number) {
                await record.destroy();
            }
        }
    }
    
    removeSessionsByNumber = DIALECT === 'postgres' ?
        this.postgresRemoveSessionsByNumber :
        this.fallbackRemoveSessionsByNumber;

    async removeAllSessions() {
        await StorageRecord.destroy({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Session',
            }
        });
    }

    // ==== PreKey ====
    async getAllPreKeys() {
        const records = await StorageRecord.findAll({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'PreKey',
            }
        });

        return records.map(loadPreKey);
    }

    async createOrUpdatePreKey(data: PreKey) {
        debug('createOrUpdatePreKey:', data);
        await StorageRecord.upsert({
            clientId: this.clientId,
            tel:      this.tel,
            type:     'PreKey',
            id:       data.id,
            data:     storePreKey(data),
        });
    }

    async removePreKeyById(id: string) {
        await StorageRecord.destroy({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'PreKey',
                id,
            }
        });
    }

    async removeAllPreKeys() {
        await StorageRecord.destroy({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'PreKey',
            }
        });
    }

    // ==== SignedPreKey ====
    async getAllSignedPreKeys() {
        const records = await StorageRecord.findAll({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'SignedPreKey',
            }
        });

        return records.map(loadSignedPreKey);
    }

    async createOrUpdateSignedPreKey(data: SignedPreKey) {
        debug('createOrUpdateSignedPreKey:', data);
        await StorageRecord.upsert({
            clientId: this.clientId,
            tel:      this.tel,
            type:     'SignedPreKey',
            id:       data.id,
            data:     storeSignedPreKey(data),
        });
    }

    async removeSignedPreKeyById(id: string) {
        await StorageRecord.destroy({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'SignedPreKey',
                id,
            }
        });
    }

    async removeAllSignedPreKeys() {
        await StorageRecord.destroy({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'SignedPreKey',
            }
        });
    }

    // ==== Unprocessed ====
    async getAllUnprocessed() {
        const records = await StorageRecord.findAll({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Unprocessed',
            }
        });

        return records.map(loadUnprocessed);
    }

    async getUnprocessedCount() {
        // returns the number of unprocessed messages
        return StorageRecord.count({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Unprocessed',
            }
        });
    }

    async getUnprocessedById(id: string) {
        const record = await StorageRecord.findOne({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Unprocessed',
                id,
            }
        });

        if (!record) {
            return null;
        }

        return loadUnprocessed(record);
    }

    async saveUnprocessed(data: Unprocessed) {
        debug('saveUnprocessed:', data);
        await StorageRecord.upsert({
            clientId: this.clientId,
            tel:      this.tel,
            type:     'Unprocessed',
            id:       data.id,
            data:     storeUnprocessed(data),
        });
    }

    async postgresUpdateUnprocessedAttempts(id: string, attempts: number) {
        await StorageRecord.update({
            'data.attempts': attempts,
        }, {
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Unprocessed',
                id,
            }
        });
    }

    async fallbackUpdateUnprocessedAttempts(id: string, attempts: number) {
        const record = await StorageRecord.findOne({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Unprocessed',
                id,
            }
        });

        if (!record) {
            await StorageRecord.create({
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Unprocessed',
                id,
                data:     { attempts },
            });
            return;
        }

        if (!record.data) {
            record.data = {};
        }

        record.data.attempts = attempts;

        await record.save();
    }

    // updates the 'attempts' property of the unprocessed message
    updateUnprocessedAttempts = DIALECT === 'postgres' ?
        this.postgresUpdateUnprocessedAttempts :
        this.fallbackUpdateUnprocessedAttempts;

    async updateUnprocessedWithData(id: string, data: Unprocessed) {
        debug('updateUnprocessedWithData:', data);
        await StorageRecord.upsert({
            clientId: this.clientId,
            tel:      this.tel,
            type:     'Unprocessed',
            id,
            data,
        });
    }

    async removeUnprocessed(id: string) {
        await StorageRecord.destroy({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Unprocessed',
                id,
            }
        });
    }

    async removeAllUnprocessed() {
        await StorageRecord.destroy({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Unprocessed',
            }
        });
    }

    // ==== Group ====
    async createOrUpdateGroup(data: Group): Promise<void> {
        debug('createOrUpdateGroup:', data);
        const { id } = data;
        await StorageRecord.upsert({
            clientId: this.clientId,
            tel:      this.tel,
            type:     'Group',
            id,
            data,
        });
    }

    async getGroupById(id: string): Promise<Group|null> {
        const record = await StorageRecord.findOne({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Group',
                id,
            }
        });

        if (!record) {
            return null;
        }

        return record.data as Group;
    }

    async getAllGroups(): Promise<Group[]> {
        const records = await StorageRecord.findAll({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Group',
            }
        });

        return records.map(record => record.data as Group);
    }

    async getAllGroupIds(): Promise<string[]> {
        const records = await StorageRecord.findAll({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Group',
            },
            attributes: ['id']
        });

        return records.map(record => record.id);
    }

    async removeGroupById(id: string): Promise<void> {
        await StorageRecord.destroy({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Group',
                id,
            }
        });
    }

    // ==== Configuration ====
    async getAllConfiguration() {
        const records = await StorageRecord.findAll({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Configuration',
            }
        });

        return records.map(loadConfiguration);
    }

    async createOrUpdateConfiguration(data: Configuration) {
        debug('createOrUpdateConfiguration:', data);
        await StorageRecord.upsert({
            clientId: this.clientId,
            tel:      this.tel,
            type:     'Configuration',
            id:       data.id,
            data:     storeConfiguration(data),
        });
    }

    async removeConfigurationById(id: string) {
        await StorageRecord.destroy({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Configuration',
                id,
            }
        });
    }

    async removeAllConfiguration() {
        await StorageRecord.destroy({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Configuration',
            }
        });
    }

    // ==== All ====
    async removeAll() {
        await StorageRecord.destroy({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
            }
        });
    }
}
