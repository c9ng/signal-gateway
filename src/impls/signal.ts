import StorageRecord, { Data } from "../models/StorageRecord";
import { NODE_ENV } from '../config/env';
import * as db from '../config/db';

const DIALECT = db[NODE_ENV].dialect;

export class SignalStorage {
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

        return records.map(record => record.data);
    }

    async createOrUpdateIdentityKey(data: Data) {
        return StorageRecord.upsert({
            clientId: this.clientId,
            tel:      this.tel,
            type:     'IdentityKey',
            id:       data.id,
            data,
        });
    }

    async removeIdentityKeyById(id: string) {
        return StorageRecord.destroy({
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

        return records.map(record => record.data);
    }

    async createOrUpdateSession(data: Data) {
        return StorageRecord.upsert({
            clientId: this.clientId,
            tel:      this.tel,
            type:     'Session',
            id:       data.id,
            data,
        });
    }

    async removeSessionById(id: string) {
        return StorageRecord.destroy({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Session',
                id,
            }
        });
    }

    async postgresRemoveSessionsByNumber(number: string|number) {
        return StorageRecord.destroy({
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
            if (record.data?.number === number) {
                await record.destroy();
            }
        }
    }
    
    removeSessionsByNumber = DIALECT === 'postgres' ?
        this.postgresRemoveSessionsByNumber :
        this.fallbackRemoveSessionsByNumber;

    async removeAllSessions() {
        return StorageRecord.destroy({
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

        return records.map(record => record.data);
    }

    async createOrUpdatePreKey(data: Data) {
        return StorageRecord.upsert({
            clientId: this.clientId,
            tel:      this.tel,
            type:     'PreKey',
            id:       data.id,
            data,
        });
    }

    async removePreKeyById(id: string) {
        return StorageRecord.destroy({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'PreKey',
                id,
            }
        });
    }

    async removeAllPreKeys() {
        return StorageRecord.destroy({
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

        return records.map(record => record.data);
    }

    async createOrUpdateSignedPreKey(data: Data) {
        return StorageRecord.upsert({
            clientId: this.clientId,
            tel:      this.tel,
            type:     'SignedPreKey',
            id:       data.id,
            data,
        });
    }

    async removeSignedPreKeyById(id: string) {
        return StorageRecord.destroy({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'SignedPreKey',
                id,
            }
        });
    }

    async removeAllSignedPreKeys() {
        return StorageRecord.destroy({
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

        return records.map(record => record.data);
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

        return record?.data;
    }

    async saveUnprocessed(data: Data) {
        return StorageRecord.upsert({
            clientId: this.clientId,
            tel:      this.tel,
            type:     'Unprocessed',
            id:       data.id,
            data,
        });
    }

    async postgresUpdateUnprocessedAttempts(id: string, attempts: number) {
        return StorageRecord.update({
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
            return StorageRecord.create({
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Unprocessed',
                id,
                data:     { attempts },
            });
        }

        if (!record.data) {
            record.data = {};
        }

        record.data.attempts = attempts;

        return record.save();
    }

    // updates the 'attempts' property of the unprocessed message
    updateUnprocessedAttempts = DIALECT === 'postgres' ?
        this.postgresUpdateUnprocessedAttempts :
        this.fallbackUpdateUnprocessedAttempts;

    async updateUnprocessedWithData(id: string, data: Data) {
        return StorageRecord.upsert({
            clientId: this.clientId,
            tel:      this.tel,
            type:     'Unprocessed',
            id,
            data,
        });
    }

    async removeUnprocessed(id: string) {
        return StorageRecord.destroy({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Unprocessed',
                id,
            }
        });
    }

    async removeAllUnprocessed() {
        return StorageRecord.destroy({
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

        return records.map(record => record.data);
    }

    async createOrUpdateConfiguration(data: Data) {
        return StorageRecord.upsert({
            clientId: this.clientId,
            tel:      this.tel,
            type:     'Configuration',
            id:       data.id,
            data,
        });
    }

    async removeConfigurationById(id: string) {
        return StorageRecord.destroy({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Configuration',
                id,
            }
        });
    }

    async removeAllConfiguration() {
        return StorageRecord.destroy({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
                type:     'Configuration',
            }
        });
    }

    // ==== All ====
    async removeAll() {
        return StorageRecord.destroy({
            where: {
                clientId: this.clientId,
                tel:      this.tel,
            }
        });
    }
}
