import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import * as qs from 'querystring';
import { createHmac } from 'crypto';

export abstract class WebhookError extends Error {
    readonly uri: string;

    constructor(uri: string, message?: string) {
        super(message);

        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
        this.uri = uri;
    }
}

export class WebhookRetriesExceededError extends WebhookError {
    readonly tries: number;
    readonly maxRetries: number;

    constructor(tries: number, maxRetries: number, uri: string, message?: string) {
        super(uri, message ?? `Too many retries for webhook delivery to: ${uri}`);
        this.tries = tries;
        this.maxRetries = maxRetries;
    }
}

export class WebhookInvalidStatusError extends WebhookError {
    readonly statusCode: number;

    constructor(statusCode: number, uri: string, message?: string) {
        super(uri, message ?? `Illegal response status: ${statusCode} ${uri}`);
        this.statusCode = statusCode;
    }
}

export interface WebhookOptions {
    secret?: string;
    algorithm?: string;
    token?: string|null;
    tokenParam?: string;
    maxRetries?: number;
    retryDelayMs?: number;
    signatureHeader?: string;
    headers?: http.OutgoingHttpHeaders;
    onRetry?: (error: Error, count: number) => void;
    onResponse?: (body: Buffer, headers: http.IncomingHttpHeaders) => void;
}

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function deliverWebhook(uri: string, payload: string|Buffer, options?: WebhookOptions): Promise<void> {
    const parsedUrl = new URL(uri);
    const maxRetries = options?.maxRetries ?? 5;
    const retryDelayMs = options?.retryDelayMs ?? 10000;
    const token = options?.token;
    const tokenParam = options?.tokenParam ?? 'token';
    const secret = options?.secret;
    const algorithm = options?.algorithm ?? 'sha512';
    const signatureHeader = options?.signatureHeader ?? 'X-Hook-Signature';
    const onRetry = options?.onRetry;
    const onResponse = options?.onResponse;
    let tries = 0;
    let uriWithToken = uri;

    if (token) {
        const query = parsedUrl.search ? qs.parse(parsedUrl.search) : {};
        query[tokenParam] = token;
        parsedUrl.search = qs.stringify(query);
        uriWithToken = parsedUrl.toString();
    }

    const headers: http.OutgoingHttpHeaders = {
        ...options?.headers,
        'Content-Length': Buffer.byteLength(payload),
    };

    if (secret) {
        const hmac = createHmac(algorithm, secret);
        hmac.update(payload);
        const signature = hmac.digest('hex');
        headers[signatureHeader] = signature;
    }

    const requestOptions: http.RequestOptions = {
        method: 'POST',
        headers,
    };

    for (;;) {
        try {
            await new Promise<void>((resolve, reject) => {
                function cb(res: http.IncomingMessage) {
                    if (res.statusCode !== undefined && (res.statusCode < 200 || res.statusCode >= 300)) {
                        return reject(new WebhookInvalidStatusError(res.statusCode, uri));
                    }

                    res.on('error', reject);

                    if (onResponse) {
                        const buf: Buffer[] = [];
                        res.on('data', data => buf.push(data));
                        res.on('end', () => {
                            const body = Buffer.concat(buf);
                            onResponse(body, res.headers);
                            resolve();
                        });
                    } else {
                        res.on('end', resolve);
                    }
                }

                try {
                    const req = parsedUrl.protocol === 'https:' ?
                        https.request(uriWithToken, requestOptions, cb) :
                        http.request(uriWithToken, requestOptions, cb);

                    req.on('error', reject);
                    req.write(payload);
                    req.end();
                } catch (error) {
                    reject(error);
                }
            });
            break;
        } catch (error) {
            ++ tries;
            if (onRetry) {
                onRetry(error, tries);
            }
            if (tries > maxRetries) {
                throw new WebhookRetriesExceededError(tries, maxRetries, uri);
            }
            await sleep(retryDelayMs);
        }
    }
}
