import { randomBytes, scrypt, pbkdf2, timingSafeEqual } from 'crypto';
import { DataType, Model, Column, Table, AllowNull, PrimaryKey, Default, Comment } from 'sequelize-typescript';
import { literal } from 'sequelize';
import {
    NODE_ENV,
    SECRET_BYTE_COUNT,
    SALT_BYTE_COUNT,
    HASH_BYTE_COUNT,
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    PBKDF2_ITERATIONS,
    PBKDF2_DIGEST,
    SECRET_HASH_ALGORITHM,
} from '../config/env';
import * as db from '../config/db';

const DIALECT = db[NODE_ENV].dialect;

export const SCOPES = new Set<string>([
    'read:accounts',
    'write:accounts',
    'read:messages',
    'write:messages',
]);

export type GrantType = 'authorization_code'|'client_credentials'|'implicit'|'refresh_token'|'password';

@Table
export default class OauthClient extends Model {
    @AllowNull(false)
    @PrimaryKey
    @Column(DataType.UUID)
    id!: string;

    @AllowNull(false)
    @Column(DataType.TEXT)
    name!: string;

    @AllowNull(false)
    @Column(DataType.TEXT)
    secretHash!: string;

    @AllowNull
    @Column(DIALECT === 'postgres' ? DataType.ARRAY(DataType.TEXT) : DataType.JSON)
    redirectUris!: string[];

    @AllowNull(false)
    @Column(DIALECT === 'postgres' ?
        DataType.ARRAY(DataType.ENUM('authorization_code', 'client_credentials', 'implicit', 'refresh_token', 'password')) :
        DataType.JSON)
    grants!: GrantType[];

    @AllowNull
    @Column(DataType.INTEGER)
    accessTokenLifetime!: number|null;

    @AllowNull
    @Column(DataType.INTEGER)
    refreshTokenLifetime!: number|null;

    @AllowNull
    @Column(DataType.TEXT)
    webhookUri!: string|null;

    @AllowNull
    @Comment('Verification token passed along in plain text with the webhook message.')
    @Column(DataType.TEXT)
    webhookToken!: string|null;

    @AllowNull(false)
    @Comment('Secret used for webhook message signing.')
    @Column(DataType.TEXT)
    webhookSecret!: string;

    static async generateSecret(): Promise<string> {
        return new Promise((resolve, reject) => {
            randomBytes(SECRET_BYTE_COUNT, (err, bytes) => {
                if (err) {
                    return reject(err);
                }
                resolve(bytes.toString('base64'));
            })
        });
    }

    static async hashSecret(secret: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const secretBytes = Buffer.from(secret);
            randomBytes(SALT_BYTE_COUNT, (err, saltBytes) => {
                if (err) {
                    return reject(err);
                }
                const saltStr = saltBytes.toString('base64');

                switch (SECRET_HASH_ALGORITHM) {
                    case 'scrypt':
                        scrypt(secretBytes, saltBytes, HASH_BYTE_COUNT, {
                            cost:            SCRYPT_COST,
                            blockSize:       SCRYPT_BLOCK_SIZE,
                            parallelization: SCRYPT_PARALLELIZATION,
                        }, (err, derivedKey) => {
                            if (err) {
                                return reject(err);
                            }
                            const keyStr = derivedKey.toString('base64');
                            resolve(`scrypt.${SCRYPT_COST}.${SCRYPT_BLOCK_SIZE}.${SCRYPT_PARALLELIZATION}.${saltStr}.${keyStr}`);
                        });
                        break;

                    case 'pbkdf2':
                        pbkdf2(secretBytes, saltBytes, PBKDF2_ITERATIONS, HASH_BYTE_COUNT, PBKDF2_DIGEST, (err, derivedKey) => {
                            if (err) {
                                return reject(err);
                            }
                            const keyStr = derivedKey.toString('base64');
                            resolve(`pbkdf2.${PBKDF2_ITERATIONS}.${PBKDF2_DIGEST}.${saltStr}.${keyStr}`);
                        });
                        break;
                }
            })
        });
    }

    static async compareSecret(inputSecret: string, secretHash: string): Promise<boolean> {
        const secretBytes = Buffer.from(inputSecret);
        const hash = secretHash.split('.');
        const algo = hash[0];

        switch (algo) {
            case 'scrypt':
            {
                const cost            = +hash[1];
                const blockSize       = +hash[2];
                const parallelization = +hash[3];
                const salt = Buffer.from(hash[4], 'base64');
                const key  = Buffer.from(hash[5], 'base64');

                return new Promise((resolve, reject) => {
                    scrypt(secretBytes, salt, key.length, { cost, blockSize, parallelization }, (err, derivedKey) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve(timingSafeEqual(key, derivedKey));
                    });
                });
            }

            case 'pbkdf2':
            {
                const iterations = +hash[1];
                const digest     =  hash[2];
                const salt = Buffer.from(hash[3], 'base64');
                const key  = Buffer.from(hash[4], 'base64');

                return new Promise((resolve, reject) => {
                    pbkdf2(secretBytes, salt, iterations, key.length, digest, (err, derivedKey) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve(timingSafeEqual(key, derivedKey));
                    });
                });
            }

            default:
                throw new Error(`Unknown password hashing algorith: ${algo}`);
        }
    }

    async isSecret(secret: string): Promise<boolean> {
        return OauthClient.compareSecret(secret, this.secretHash);
    }
}
