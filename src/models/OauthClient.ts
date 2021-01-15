import { randomBytes } from 'crypto';
import { DataType, Model, Column, Table, AllowNull, PrimaryKey, Default, Comment } from 'sequelize-typescript';
import { literal } from 'sequelize';
import * as bcrypt from 'bcrypt';

export const BCRYPT_SALT_ROUNDS = 10;
export const SECRET_BYTES = 48;

export const SCOPES = new Set<string>([
    'read:accounts',
    'write:accounts',
    'read:messages',
    'write:messages',
]);

@Table
export default class OauthClient extends Model {
    @AllowNull(false)
    @PrimaryKey
    @Default(literal('gen_random_uuid()'))
    @Column(DataType.UUID)
    id!: string;

    @AllowNull(false)
    @Column(DataType.TEXT)
    name!: string;

    @AllowNull(false)
    @Column(DataType.TEXT)
    secretHash!: string;

    @AllowNull
    @Column(DataType.ARRAY(DataType.TEXT))
    redirectUris!: string[];

    @AllowNull(false)
    @Column(DataType.ARRAY(DataType.ENUM('authorization_code', 'client_credentials', 'implicit', 'refresh_token', 'password')))
    grants!: ('authorization_code'|'client_credentials'|'implicit'|'refresh_token'|'password')[];

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
            randomBytes(SECRET_BYTES, (err, bytes) => {
                if (err) {
                    return reject(err);
                }
                resolve(bytes.toString('hex'));
            })
        });
    }

    static async hashSecret(secret: string): Promise<string> {
        return bcrypt.hash(secret, BCRYPT_SALT_ROUNDS);
    }

    async isSecret(secret: string): Promise<boolean> {
        return bcrypt.compare(secret, this.secretHash);
    }
}
