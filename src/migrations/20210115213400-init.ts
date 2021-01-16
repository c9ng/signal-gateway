import { QueryInterface, DataTypes, Op, literal } from 'sequelize';
import { NODE_ENV } from '../config/env';
import * as db from '../config/db';

const { INTEGER, TEXT, DATE, ENUM, ARRAY, UUID, JSON, JSONB } = DataTypes;
const DIALECT = db[NODE_ENV].dialect;

export async function up(query: QueryInterface) {
    await query.createTable('OauthClients', {
        id: {
            type: UUID,
            primaryKey: true,
            defaultValue: DIALECT === 'postgres' ? literal('gen_random_uuid()') : undefined,
        },

        createdAt: {
            type: DATE,
        },

        updatedAt: {
            type: DATE,
        },

        name: {
            type: TEXT,
            allowNull: false,
        },

        secretHash: {
            type: TEXT,
            allowNull: false,
        },

        redirectUris: {
            type: DIALECT === 'postgres' ? ARRAY(TEXT) : JSON,
            allowNull: true,
        },

        grants: {
            type: DIALECT === 'postgres' ?
                ARRAY(ENUM('authorization_code', 'client_credentials', 'implicit', 'refresh_token', 'password')) :
                JSON,
            allowNull: false,
        },

        accessTokenLifetime: {
            type: INTEGER,
            allowNull: true,
        },

        refreshTokenLifetime: {
            type: INTEGER,
            allowNull: true,
        },

        webhookUri: {
            type: TEXT,
            allowNull: true,
        },

        webhookToken: {
            type: TEXT,
            allowNull: true,
            comment: 'Verification token passed along in plain text with the webhook message.',
        },

        webhookSecret: {
            type: TEXT,
            allowNull: false,
            comment: 'Secret used for webhook message signing.',
        },
    });

    await query.createTable('OauthTokens', {
        id: {
            type: INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },

        createdAt: {
            type: DATE,
        },

        updatedAt: {
            type: DATE,
        },

        accessToken: {
            type: TEXT,
            allowNull: false,
        },

        accessTokenExpiresAt: {
            type: DATE,
            allowNull: true,
        },

        refreshToken: {
            type: TEXT,
            allowNull: true,
        },

        refreshTokenExpiresAt: {
            type: DATE,
            allowNull: true,
        },

        scope: {
            type: DIALECT === 'postgres' ? ARRAY(TEXT) : JSON,
            allowNull: false,
            defaultValue: [],
        },

        clientId: {
            type: UUID,
            allowNull: false,
            references: {
                model: 'OauthClients',
            },
        },
    });

    await query.addIndex('OauthTokens', ['accessToken'], { unique: true });
    await query.addIndex('OauthTokens', ['refreshToken'], {
        where: {
            refreshToken: {
                [Op.ne]: null
            }
        }
    });

    await query.createTable('OauthAuthorizationCodes', {
        id: {
            type: INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },

        createdAt: {
            type: DATE,
        },

        updatedAt: {
            type: DATE,
        },

        authorizationCode: {
            type: TEXT,
            allowNull: false,
        },

        expiresAt: {
            type: DATE,
            allowNull: false,
        },

        redirectUri: {
            type: TEXT,
            allowNull: false,
            defaultValue: 'urn:ietf:wg:oauth:2.0:oob',
        },

        refreshTokenExpiresAt: {
            type: DATE,
            allowNull: true,
        },

        scope: {
            type: DIALECT === 'postgres' ? ARRAY(TEXT) : JSON,
            allowNull: false,
            defaultValue: [],
        },

        clientId: {
            type: UUID,
            allowNull: false,
            references: {
                model: 'OauthClients',
            },
        },
    });

    await query.createTable('Account', {
        clientId: {
            type: UUID,
            allowNull: false,
            primaryKey: true,
            references: {
                model: 'OauthClients',
            },
        },

        tel: {
            type: TEXT,
            allowNull: false,
            primaryKey: true,
        },

        createdAt: {
            type: DATE,
        },

        updatedAt: {
            type: DATE,
        },

        name: {
            type: TEXT,
            allowNull: false,
        },
    });

    await query.addIndex('Account', ['clientId', 'name'], { unique: true });

    await query.createTable('Storage', {
        clientId: {
            type: UUID,
            allowNull: false,
            primaryKey: true,
            references: {
                model: 'OauthClients',
            },
        },

        tel: {
            type: TEXT,
            allowNull: false,
            primaryKey: true,
        },

        createdAt: {
            type: DATE,
        },

        updatedAt: {
            type: DATE,
        },

        type: {
            type: TEXT,
            allowNull: false,
            primaryKey: true,
        },

        id: {
            type: TEXT,
            allowNull: false,
            primaryKey: true,
        },

        data: {
            type: DIALECT === 'postgres' ? JSONB : JSON,
        },
    });
}

export async function down(query: QueryInterface) {
    await query.dropTable('OauthClients');
    await query.dropTable('OauthTokens');
    await query.dropTable('OauthAuthorizationCodes');
    await query.dropTable('Accounts');
}
