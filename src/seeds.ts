import { promises as fs } from 'fs';
import { resolve } from 'path';
import { sequelize } from './config';
import OauthClient from './models/OauthClient';
import Account from './models/Account';
import { NODE_ENV, SEEDS_DIR } from './config/env';
import { isUrl } from './utils';

const MIN_SECRET_LENGTH = 16;

export async function loadSeeds(): Promise<void> {
    if (!SEEDS_DIR) {
        return;
    }
    console.info(`Loading DB seeds...`);
    await sequelize.transaction(async () => {
        if (await OauthClient.count() > 0) {
            console.info(`OauthClient table is not empty, skipping seeds.`);
            return;
        }
        for (const dirent of await fs.readdir(SEEDS_DIR, { withFileTypes: true })) {
            if (dirent.isFile() && /\.json$/i.test(dirent.name)) {
                const filename = resolve(SEEDS_DIR, dirent.name);
                try {
                    const rawData = await fs.readFile(filename);
                    const seed = JSON.parse(rawData.toString('UTF-8'));
                    if (typeof seed !== 'object' || seed === null) {
                        throw new TypeError('root value is not an object or is null');
                    }
                    if (!('clients' in seed)) {
                        throw new TypeError('root object does not contain a key "clients"');
                    }

                    const clients = seed.clients;
                    if (!Array.isArray(clients)) {
                        throw new TypeError('"clients" is not an array');
                    }
                    
                    for (let clientIndex = 0; clientIndex < clients.length; ++ clientIndex) {
                        const clientJson = clients[clientIndex];
                        if (typeof clientJson !== 'object') {
                            throw new TypeError(`clients[${clientIndex}] is not an object or is null`);
                        }

                        const {
                            id: clientId, name, grants, accessTokenLifetime,
                            webhookUri, webhookToken, accounts
                        } = clientJson;

                        let { secret, webhookSecret } = clientJson;

                        if (!clientId) {
                            throw new TypeError(`clients[${clientIndex}].id is missing`);
                        }

                        if (typeof clientId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId)) {
                            throw new TypeError(`clients[${clientIndex}].id is not a valid UUIDv4`);
                        }

                        if (typeof name !== 'string') {
                            throw new TypeError(`clients[${clientIndex}].name is not a string`);
                        }

                        if (secret == null) {
                            secret = await OauthClient.generateSecret();
                        } else if (typeof secret !== 'string') {
                            throw new TypeError(`clients[${clientIndex}].secret is not a string`);
                        } else if (secret.length < MIN_SECRET_LENGTH) {
                            throw new TypeError(`clients[${clientIndex}].secret is shorter than ${MIN_SECRET_LENGTH} characters`);
                        }

                        if (!grants) {
                            throw new TypeError(`clients[${clientIndex}].grants is missing`);
                        }

                        if (!Array.isArray(grants)) {
                            throw new TypeError(`clients[${clientIndex}].grants is not an array`);
                        }

                        for (let grantIndex = 0; grantIndex < grants.length; ++ grantIndex) {
                            const grant = grants[grantIndex];
                            switch (grant) {
                                case 'authorization_code':
                                case 'client_credentials':
                                case 'implicit':
                                case 'refresh_token':
                                case 'password':
                                    break;

                                default:
                                    throw new TypeError(`clients[${clientIndex}].grants[${grantIndex}] has illegal value: ${JSON.stringify(grant)}`);
                            }
                        }

                        if (accessTokenLifetime != null && (typeof accessTokenLifetime !== 'number' || accessTokenLifetime < 0)) {
                            throw new TypeError(`clients[${clientIndex}].accessTokenLifetime has illegal value: ${JSON.stringify(accessTokenLifetime)}`);
                        }

                        if (webhookUri != null && (typeof webhookUri !== 'string' || !isUrl(webhookUri))) {
                            throw new TypeError(`clients[${clientIndex}].webhookUri has illegal value: ${JSON.stringify(webhookUri)}`);
                        }

                        if (webhookToken != null && typeof webhookToken !== 'string') {
                            throw new TypeError(`clients[${clientIndex}].webhookToken has illegal value: ${JSON.stringify(webhookToken)}`);
                        }

                        if (webhookSecret == null) {
                            webhookSecret = await OauthClient.generateSecret();
                        } else if (typeof webhookSecret !== 'string') {
                            throw new TypeError(`clients[${clientIndex}].webhookToken has illegal type: ${typeof webhookSecret}`);
                        } else if (webhookSecret.length < MIN_SECRET_LENGTH) {
                            throw new TypeError(`clients[${clientIndex}].webhookToken is shorter than ${MIN_SECRET_LENGTH} characters`);
                        }

                        if (accounts != null && !Array.isArray(accounts)) {
                            throw new TypeError(`clients[${clientIndex}].accounts is not an array`);
                        }

                        await OauthClient.create({
                            id: clientId,
                            secretHash: await OauthClient.hashSecret(secret),
                            name,
                            grants,
                            accessTokenLifetime,
                            webhookUri,
                            webhookToken,
                            webhookSecret,
                        });

                        if (accounts) {
                            for (let accountIndex = 0; accountIndex < accounts.length; ++ accountIndex) {
                                const accountJson = accounts[accountIndex];

                                if (typeof accountJson !== 'object' || accountJson === null) {
                                    throw new TypeError(`clients[${clientIndex}].accounts[${accountIndex}] is not an object or is null`);
                                }

                                const { tel, name, events } = accountJson;

                                if (typeof tel !== 'string' || !tel) {
                                    throw new TypeError(`clients[${clientIndex}].accounts[${accountIndex}].tel has illegal type or value: ${JSON.stringify(tel)}`);
                                }

                                if (typeof name !== 'string' || !name) {
                                    throw new TypeError(`clients[${clientIndex}].accounts[${accountIndex}].name has illegal type or value: ${JSON.stringify(name)}`);
                                }

                                if (events != null) {
                                    if (!Array.isArray(events)) {
                                        throw new TypeError(`clients[${clientIndex}].accounts[${accountIndex}].events is not an array`);
                                    }

                                    for (let eventIndex = 0; eventIndex < events.length; ++ eventIndex) {
                                        const event = events[eventIndex];

                                        switch (event) {
                                            case 'message':
                                            case 'configuration':
                                            case 'group':
                                            case 'contact':
                                            case 'verified':
                                            case 'sent':
                                            case 'delivery':
                                            case 'read':
                                            case 'error':
                                                break;

                                            default:
                                                throw new TypeError(`clients[${clientIndex}].accounts[${accountIndex}].events[${eventIndex}] has illegal type or value: ${JSON.stringify(event)}`);
                                        }
                                    }
                                }

                                await Account.create({
                                    clientId,
                                    tel,
                                    name,
                                    events,
                                });
                            }
                        }

                        console.info(`client[${clientIndex}].id: ${clientId}`);
                        console.info(`client[${clientIndex}].secret: ${secret}`);
                        console.info(`client[${clientIndex}].webhookSecret: ${webhookSecret}`);
                    }
                } catch (error) {
                    if (NODE_ENV === 'development') {
                        console.error(error);
                    }
                    throw new TypeError(`Error loading DB seeds from file ${filename}: ${error.message}`);
                }
            }
        }
    });
}
