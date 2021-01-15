export abstract class BaseError extends Error {
    constructor(message?: string) {
        super(message);

        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

const HTTP_ERROR_MAP: { [code: number]: string } = Object.assign(Object.create(null), {
    400: 'validation_failed',
    403: 'forbidden',
    404: 'not_found',
    501: 'internal_error',
});

export class HttpError extends BaseError {
    readonly status: number;

    constructor(status: number, message?: string) {
        super(message);
        this.status = status;
    }

    toJSON() {
        return {
            error: HTTP_ERROR_MAP[this.status],
            error_description: this.message,
        };
    }
}

export class Forbidden extends HttpError {
    constructor(message?: string) {
        super(403, message);
    }
}

export class NotFound extends HttpError {
    constructor(message?: string) {
        super(404, message);
    }
}

export class InternalError extends HttpError {
    constructor(message?: string) {
        super(501, message);
    }
}
