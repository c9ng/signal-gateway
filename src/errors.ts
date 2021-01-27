export abstract class BaseError extends Error {
    readonly cause?: Error;

    constructor(message?: string, cause?: Error) {
        super(message);

        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
        this.cause = cause;
    }
}

const HTTP_ERROR_MAP: { [code: number]: string } = Object.assign(Object.create(null), {
    400: 'validation_failed',
    403: 'forbidden',
    404: 'not_found',
    500: 'internal_error',
    501: 'not_implemented',
});

export class HttpError extends BaseError {
    readonly status: number;

    constructor(status: number, message?: string, cause?: Error) {
        super(message, cause);
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
    constructor(message?: string, cause?: Error) {
        super(403, message, cause);
    }
}

export class NotFound extends HttpError {
    constructor(message?: string, cause?: Error) {
        super(404, message, cause);
    }
}

export class InternalError extends HttpError {
    constructor(message?: string, cause?: Error) {
        super(500, message, cause);
    }
}

export class NotImplemented extends HttpError {
    constructor(message?: string, cause?: Error) {
        super(501, message, cause);
    }
}
export class BadRequest extends HttpError {
    constructor(message?: string, cause?: Error) {
        super(400, message, cause);
    }
}
