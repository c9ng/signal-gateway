import StorageRecord from "../models/StorageRecord";
import { NODE_ENV } from '../config/env';
import * as db from '../config/db';
import {
    ProtocolStoreBackend, IdentityKey, Session,
    PreKey, SignedPreKey,
    Unprocessed, Configuration,
} from "@throneless/libsignal-service";

const DIALECT = db[NODE_ENV].dialect;

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

        return records.map(record => record.data as IdentityKey);
    }

    async createOrUpdateIdentityKey(data: IdentityKey) {
        await StorageRecord.upsert({
            clientId: this.clientId,
            tel:      this.tel,
            type:     'IdentityKey',
            id:       data.id,
            data,
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

        return records.map(record => record.data as Session);
    }

    async createOrUpdateSession(data: Session) {
        await StorageRecord.upsert({
            clientId: this.clientId,
            tel:      this.tel,
            type:     'Session',
            id:       data.id,
            data,
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

        return records.map(record => record.data as PreKey);
    }

    async createOrUpdatePreKey(data: PreKey) {
        await StorageRecord.upsert({
            clientId: this.clientId,
            tel:      this.tel,
            type:     'PreKey',
            id:       data.id,
            data,
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

        return records.map(record => record.data as SignedPreKey);
    }

    async createOrUpdateSignedPreKey(data: SignedPreKey) {
        await StorageRecord.upsert({
            clientId: this.clientId,
            tel:      this.tel,
            type:     'SignedPreKey',
            id:       data.id,
            data,
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

        return records.map(record => record.data as Unprocessed);
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

        return record?.data as Unprocessed;
    }

    async saveUnprocessed(data: Unprocessed) {
        await StorageRecord.upsert({
            clientId: this.clientId,
            tel:      this.tel,
            type:     'Unprocessed',
            id:       data.id,
            data,
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

        (record.data as Unprocessed).attempts = attempts;

        await record.save();
    }

    // updates the 'attempts' property of the unprocessed message
    updateUnprocessedAttempts = DIALECT === 'postgres' ?
        this.postgresUpdateUnprocessedAttempts :
        this.fallbackUpdateUnprocessedAttempts;

    async updateUnprocessedWithData(id: string, data: Unprocessed) {
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

    // ==== Configuration ====
    async getAllConfiguration() {
        const records = await StorageRecord.findAll({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Configuration',
            }
        });

        return records.map(record => record.data as Configuration);
    }

    async createOrUpdateConfiguration(data: Configuration) {
        await StorageRecord.upsert({
            clientId: this.clientId,
            tel:      this.tel,
            type:     'Configuration',
            id:       data.id,
            data,
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
