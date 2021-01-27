import errors from './errors';

export interface IdentityKey {
    id: string;
}

export interface Session {
    id: string;
    number?: string|number; // TODO
}

export interface PreKey {
    id: string;
}

export interface SignedPreKey {
    id: string;
}

export interface Unprocessed {
    id: string;
    attempts?: number;
}

export interface Configuration {
    id: string;
}

export interface ProtocolStoreBackend {
    pollDelay?: number;

    getAllIdentityKeys(): Promise<IdentityKey[]>;
    createOrUpdateIdentityKey(data: IdentityKey): Promise<void>;
    removeIdentityKeyById(id: string): Promise<void>;

    getAllSessions(): Promise<Session[]>;
    createOrUpdateSession(data: Session): Promise<void>;
    removeSessionById(id: string): Promise<void>;
    removeSessionsByNumber(number: string|number): Promise<void>;
    removeAllSessions(): Promise<void>;

    getAllPreKeys(): Promise<PreKey[]>;
    createOrUpdatePreKey(data: PreKey): Promise<void>;
    removePreKeyById(id: string): Promise<void>;
    removeAllPreKeys(): Promise<void>;

    getAllSignedPreKeys(): Promise<SignedPreKey[]>;
    createOrUpdateSignedPreKey(data: SignedPreKey): Promise<void>;
    removeSignedPreKeyById(id: string): Promise<void>;
    removeAllSignedPreKeys(): Promise<void>;

    getAllUnprocessed(): Promise<Unprocessed[]>;
    getUnprocessedCount(): Promise<number>;
    saveUnprocessed(data: Unprocessed): Promise<void>;
    getUnprocessedById(id: string): Promise<Unprocessed|null>;
    updateUnprocessedAttempts(id: string, attempts: number): Promise<void>;
    updateUnprocessedWithData(id: string, data: Unprocessed): Promise<void>;
    removeUnprocessed(id: string): Promise<void>;
    removeAllUnprocessed(): Promise<void>;

    getAllConfiguration(): Promise<Configuration[]>;
    createOrUpdateConfiguration(data: Configuration): Promise<void>;
    removeConfigurationById(id: string): Promise<void>;
    removeAllConfiguration(): Promise<void>;

    removeAll(): Promise<void>;
}

export class ProtocolStore {
    readonly storage: ProtocolStoreBackend;

    constructor(storage: ProtocolStoreBackend);
    load(): Promise<void>;
}

export class AccountManager {
    readonly username: string;
    readonly password: string
    readonly store: ProtocolStore;

    constructor(username: string, password: string, store: ProtocolStore);

    registerSingleDevice(code: string): Promise<any>; // TODO
    requestSMSVerification(): Promise<any>; // TODO
    requestVoiceVerification(): Promise<any>; // TODO
    registerSecondDevice(setProvisioningUrl: string, confirmNumber: string, progressCallback?: () => void): Promise<any>; // TODO
}

export interface OutMessage {
    body?: string;
    attachments?: Attachment[];
    quote?: string; // TODO
    preview?: string; // TODO
    sticker?: string; // TODO
    reaction?: string; // TODO
    expireTimer?: string; // TODO
}

export interface SendMessageOptions {
    // TODO
}

export interface GroupOptions {
    // TODO
}

export interface Profile {
    // TODO
}

export interface Avatar {
    // TODO
}

export interface SendMessageResult {
    successfulIdentifiers: string[];
    failoverIdentifiers: string[];
    errors: errors.OutgoingMessageError[];
    unidentifiedDeliveries: string[];
}

export class MessageSender {
    readonly store: ProtocolStore;

    constructor(store: ProtocolStore);

    connect(): Promise<void>;

    getProfile(number: string, options?: { accessKey: string }): Promise<Profile>;
    getAvatar(path: string): Promise<Avatar>;

    sendMessage(message: OutMessage & { recipients: string[] }, options?: SendMessageOptions): Promise<SendMessageResult>
    sendMessageToIdentifier(message: OutMessage & { identifier: string }, options?: SendMessageOptions): Promise<SendMessageResult>;
    sendMessageToNumber(message: OutMessage & { number: string }, options?: SendMessageOptions): Promise<SendMessageResult>;
    sendMessageToGroup(message: OutMessage & { groupId: string }, options?: SendMessageOptions): Promise<SendMessageResult>;

    resetSession(identifier: string, timestamp: string, options?: { /* TODO */ }): Promise<void>;

    createGroup(targetIdentifiers: string[], id: string, name: string, avatar?: Attachment|null, options?: GroupOptions): Promise<string>;
    updateGroup(groupId: string, name: string, avatar: Attachment|null, targetIdentifiers: string[], options?: GroupOptions): Promise<void>;
    addIdentifierToGroup(groupId: string, newIdentifiers: string[], options?: GroupOptions): Promise<void>;
    addNumberToGroup(groupId: string, newNumbers: string[], options?: GroupOptions): Promise<void>;
    setGroupName(groupId: string, name: string, groupIdentifiers: string[], options?: GroupOptions): Promise<void>;
    leaveGroup(groupId: string, groupIdentifiers: string[], options?: GroupOptions): Promise<void>;
}

export type EventType = 'message' | 'configuration' | 'group' | 'contact' | 'verified' | 'sent' | 'delivery' | 'read' | 'error' | 'close';

export abstract class Event {
    readonly type: string;
    constructor(type: string);
    confirm(): void;
}

export interface Attachment {
    fileName: string;
    contentType?: string;
    width?: number;
    height?: number;
    data: ArrayBuffer;
    size: number;
    flags?: string|number; // TODO
}

export interface InAttachment {
    cdnId?: string;
    cdnKey?: string;
    cdnNumber?: string;
    key: string;
    digest: string;
    size: number;
}

export interface AttachmentPointer {
    // TODO
    cdnId?: string;
    cdnKey?: string;
    cdnNumber?: string;
    size: number;
    data: ArrayBuffer;
}

export class MessageEvent extends Event {
    readonly type: 'message';
    readonly data: {
        message: {
            attachemnts: InAttachment[]
        },
        group?: {
            id: string
        },
        body: string
    }
}

export class ConfigurationEvent extends Event {
    readonly type: 'configuration';
    readonly configuration: {
        [key: string]: any; // TODO
    }
}

export class GroupEvent extends Event {
    readonly type: 'group';
    readonly groupDetails: {
        [key: string]: any; // TODO
    }
}

export class ContactEvent extends Event {
    readonly type: 'contact';
    readonly contactDetails: {
        [key: string]: any; // TODO
    }
}

export class VerifiedEvent extends Event {
    readonly type: 'verified';
    readonly verified: boolean; // TODO
}

export class SentEvent extends Event {
    readonly type: 'sent';
    readonly data: {
        // TODO
        deviceId: string;
        destination: string;
        timestamp: string;
    }
}

export class DeliveryEvent extends Event {
    readonly type: 'delivery';
    readonly deliveryReceipt: {
        // TODO
        source: string;
        sourceDevice: string;
        timestamp: string;
    }
}

export class ReadEvent extends Event {
    readonly type: 'read';
    readonly read: {
        // TODO
        reader: string;
        timestamp: string;
    }
}

export class ErrorEvent extends Event {
    readonly type: 'error';
}

export class CloseEvent extends Event {
    readonly type: 'close';
}

export class MessageReceiver {
    connect(): Promise<void>;

    //addEventListener(eventType: EventType,       handler: (event: Event)              => void): void;
    addEventListener(eventType: 'message',       handler: (event: MessageEvent)       => void): void;
    addEventListener(eventType: 'configuration', handler: (event: ConfigurationEvent) => void): void;
    addEventListener(eventType: 'group',         handler: (event: GroupEvent)         => void): void;
    addEventListener(eventType: 'contact',       handler: (event: ContactEvent)       => void): void;
    addEventListener(eventType: 'verified',      handler: (event: VerifiedEvent)      => void): void;
    addEventListener(eventType: 'sent',          handler: (event: SentEvent)          => void): void;
    addEventListener(eventType: 'delivery',      handler: (event: DeliveryEvent)      => void): void;
    addEventListener(eventType: 'read',          handler: (event: ReadEvent)          => void): void;
    addEventListener(eventType: 'error',         handler: (event: ErrorEvent)         => void): void;
    addEventListener(eventType: 'close',         handler: (event: CloseEvent)         => void): void;

    //removeEventListener(eventType: EventType,       handler: (event: Event)              => void): void;
    removeEventListener(eventType: 'message',       handler: (event: MessageEvent)       => void): void;
    removeEventListener(eventType: 'configuration', handler: (event: ConfigurationEvent) => void): void;
    removeEventListener(eventType: 'group',         handler: (event: GroupEvent)         => void): void;
    removeEventListener(eventType: 'contact',       handler: (event: ContactEvent)       => void): void;
    removeEventListener(eventType: 'verified',      handler: (event: VerifiedEvent)      => void): void;
    removeEventListener(eventType: 'sent',          handler: (event: SentEvent)          => void): void;
    removeEventListener(eventType: 'delivery',      handler: (event: DeliveryEvent)      => void): void;
    removeEventListener(eventType: 'read',          handler: (event: ReadEvent)          => void): void;
    removeEventListener(eventType: 'error',         handler: (event: ErrorEvent)         => void): void;
    removeEventListener(eventType: 'close',         handler: (event: CloseEvent)         => void): void;

    handleAttachment(attachment: InAttachment): Promise<AttachmentPointer>;

    shutdown(): void;
}


export module AttachmentHelper {
    function isImage(mimeType: string): boolean;
    function isAudio(mimeType: string): boolean;
    function contentTypeToFileName(mimeType: string): string;

    function lodaFile(file: string, caption?: string): Promise<Attachment>;
    function saveFile(file: { fileName?: string, data: ArrayBuffer|string|Buffer, contentType: string}, dest: string): Promise<string>;
}
