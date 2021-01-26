import { NODE_ENV } from './config/env';
import * as db from './config/db';
const DIALECT = db[NODE_ENV].dialect;

export function isEqualSets<T>(set1: Set<T>, set2: Iterable<T>): boolean {
    let count = 0;
    for (const value of set2) {
        if (!set1.has(value)) {
            return false;
        }
        count ++;
    }
    return count === set1.size;
}

// couldn't find something for that in sequelize:
export function quoteSqlNameMySQL(name: string): string {
    return `\`${name.replace('`', '``')}\``;
}

export function quoteSqlNameMSSQL(name: string): string {
    return `[${name.replace(']', ']]')}]`;
}

export function quoteSqlNameSQL99(name: string): string {
    return `"${name.replace('"', '""')}"`;
}

export const quoteSqlName =
    DIALECT === 'mssql'                          ? quoteSqlNameMSSQL :
    DIALECT === 'mariadb' || DIALECT === 'mysql' ? quoteSqlNameMySQL :
                                                   quoteSqlNameSQL99;

export function isUrl(value: string): boolean {
    return /^https?:\/\/[-a-z0-9][^\s]*$/i.test(value);
}

const URLSAFE_BASE64_ENCODE: {[key: string]: string} = {
    '+': '-',
    '/': '_',
    '=': '',
    ' ': '',
    '\n': '',
};

const URLSAFE_BASE64_DECODE: {[key: string]: string} = {
    '-': '+',
    '_': '/',
    ' ': '',
    '\n': '',
};

export function encodeUrlsafeBase64(data: Buffer): string {
    return data.toString('base64').replace(/[+\/ \n=]/g, ch => URLSAFE_BASE64_ENCODE[ch]);
}

export function decodeUrlsafeBase64(data: String): Buffer {
    return Buffer.from(data.replace(/[-_ \n]/g, ch => URLSAFE_BASE64_DECODE[ch]), 'base64');
}
