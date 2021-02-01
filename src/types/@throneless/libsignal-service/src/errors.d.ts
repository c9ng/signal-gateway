// TODO

export class ReplayableError extends Error {
    readonly functionCode?: string|number;
}

export class IncomingIdentityKeyError extends ReplayableError {
    readonly name: 'IncomingIdentityKeyError';
    readonly identityKey: string;
    readonly identifier: string;
}

export class OutgoingIdentityKeyError extends ReplayableError {
    readonly name: 'OutgoingIdentityKeyError';
    readonly identityKey: string;
    readonly identifier: string;
}

export class OutgoingMessageError extends ReplayableError {
    readonly name: 'OutgoingMessageError';
    readonly code?: number;
}

export class SendMessageNetworkError extends ReplayableError {
    readonly name: 'SendMessageNetworkError';
    readonly identifier: string;
    readonly code: number;
}

export class SignedPreKeyRotationError extends ReplayableError {
    readonly name: 'SignedPreKeyRotationError';
}

export class MessageError extends ReplayableError {
    readonly name: 'MessageError';
    readonly code: number;
}

export class UnregisteredUserError extends Error {
    readonly name: 'UnregisteredUserError';
    readonly identifier: string;
    readonly code: number;
}
