export const NODE_ENV = (() => {
    const NODE_ENV = process.env.NODE_ENV || 'development';

    switch (NODE_ENV) {
        case 'development':
        case 'test':
        case 'production':
            return NODE_ENV;

        default:
            throw new Error(`Illegal NODE_ENV: ${NODE_ENV}`);
    }
})();

export const { DB_USERNAME, DB_PASSWORD, DB_DATABASE, DB_HOST, DB_STORAGE } = process.env;

export const DB_DIALECT = (() => {
    const DB_DIALECT = process.env.DB_DIALECT || 'sqlite';

    switch (DB_DIALECT) {
        case 'mysql':
        case 'postgres':
        case 'sqlite':
        case 'mariadb':
            return DB_DIALECT;

        case 'mssql':
            throw new Error(`DB_DIALECT mssql is not supported because it lacks support for JSON columns.`);

        default:
            throw new Error(`Illegal DB_DIALECT: ${DB_DIALECT}`);
    }
})();

export const PORT = +(process.env.PORT || 8080);

if (PORT <= 0) {
    throw new Error(`Illegal PORT: ${PORT}`);
}
