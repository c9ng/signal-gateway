import { Options } from "sequelize/types";
import { DB_USERNAME, DB_PASSWORD, DB_DATABASE, DB_HOST, DB_STORAGE, DB_DIALECT } from './env';

export const development: Options = {
    username: DB_USERNAME || "development",
    password: DB_PASSWORD,
    database: DB_DATABASE || "signal_gateway_dev",
    host:     DB_HOST || "db",
    storage:  DB_STORAGE || '/var/lib/signal-gateway/dev.db',
    dialect:  DB_DIALECT,
};

export const test: Options = {
    username: DB_USERNAME || "test",
    password: DB_PASSWORD,
    database: DB_DATABASE || "signal_gateway_test",
    host:     DB_HOST || "db",
    storage:  DB_STORAGE || '/var/lib/signal-gateway/test.db',
    dialect:  DB_DIALECT,
};

export const production: Options = {
    username: DB_USERNAME || "production",
    password: DB_PASSWORD,
    database: DB_DATABASE || "signal_gateway",
    host:     DB_HOST || "db",
    storage:  DB_STORAGE || '/var/lib/signal-gateway/prod.db',
    dialect:  DB_DIALECT,
};
