function getNumber(key: string, defaultValue: number, options?: { min?: number, max?: number, nan?: boolean, infinite?: boolean }): number {
    const value = process.env[key];

    if (value === undefined) {
        return defaultValue;
    }

    const num = +value;

    if (options) {
        const { min, max, nan, infinite } = options;
        if (min !== undefined && num < min) {
            throw new Error(`${key} out of range: ${num} < ${min}`);
        }

        if (max !== undefined && num > max) {
            throw new Error(`${key} out of range: ${num} > ${max}`);
        }

        if (!nan && isNaN(num)) {
            throw new Error(`NaN value not allowed for ${key}`);
        }

        if (!infinite && !isFinite(num)) {
            throw new Error(`${key} may not have infinite value: ${num}`);
        }
    }

    return num;
}

export const {
    NODE_ENV,
    SEEDS_DIR,
    DB_USERNAME, DB_PASSWORD, DB_DATABASE, DB_HOST, DB_STORAGE, DB_DIALECT,
    PORT,
    SECRET_BYTE_COUNT,
    SALT_BYTE_COUNT,
    HASH_BYTE_COUNT,
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    PBKDF2_ITERATIONS,
    PBKDF2_DIGEST,
    SECRET_HASH_ALGORITHM,
} = (() => {
    const NODE_ENV = process.env.NODE_ENV || 'development';

    switch (NODE_ENV) {
        case 'development':
        case 'test':
        case 'production':
            break;

        default:
            throw new Error(`Illegal NODE_ENV: ${NODE_ENV}`);
    }

    const {
        PBKDF2_DIGEST,
        DB_USERNAME, DB_PASSWORD, DB_DATABASE, DB_HOST, DB_STORAGE,
        SEEDS_DIR
    } = process.env;

    const DB_DIALECT = process.env.DB_DIALECT || 'sqlite';
    switch (DB_DIALECT) {
        case 'mysql':
        case 'postgres':
        case 'sqlite':
        case 'mariadb':
            break;

        case 'mssql':
            throw new Error(`DB_DIALECT mssql is not supported because it lacks support for JSON columns.`);

        default:
            throw new Error(`Illegal DB_DIALECT: ${DB_DIALECT}`);
    }

    const PORT = +(process.env.PORT || 8080);
    if (PORT <= 0 || PORT > 65535 || isNaN(PORT)) {
        throw new Error(`Illegal PORT: ${process.env.PORT}`);
    }

    let { SECRET_HASH_ALGORITHM } = process.env;
    switch (SECRET_HASH_ALGORITHM) {
        case 'scrypt':
        case 'pbkdf2':
            break;

        case undefined:
            SECRET_HASH_ALGORITHM = 'scrypt';
            break;

        default:
            throw new Error(`Illegal SECRET_HASH_ALGORITHM: ${SECRET_HASH_ALGORITHM}`);
    }

    return {
        SECRET_BYTE_COUNT:      getNumber('SECRET_BYTE_COUNT',     48, { min:        32 }),
        SALT_BYTE_COUNT:        getNumber('SALT_BYTE_COUNT',       48, { min:        16 }),
        HASH_BYTE_COUNT:        getNumber('HASH_BYTE_COUNT',       64, { min:        48 }),
        SCRYPT_COST:            getNumber('SCRYPT_COST',    16 * 1024, { min: 16 * 1024 }),
        SCRYPT_BLOCK_SIZE:      getNumber('SCRYPT_BLOCK_SIZE',      8, { min:         8 }),
        SCRYPT_PARALLELIZATION: getNumber('SCRYPT_PARALLELIZATION', 1, { min:         1 }),
        PBKDF2_ITERATIONS:      getNumber('PBKDF2_ITERATIONS', 100000, { min:    100000 }),
        PBKDF2_DIGEST: PBKDF2_DIGEST || 'sha3-512',
        SECRET_HASH_ALGORITHM: SECRET_HASH_ALGORITHM as 'scrypt' | 'pbkdf2',
        NODE_ENV,
        DB_USERNAME, DB_PASSWORD, DB_DATABASE, DB_HOST, DB_STORAGE, DB_DIALECT,
        PORT,
        SEEDS_DIR: SEEDS_DIR ?? '/var/lib/signal-gateway/seeds',
    };
})();
