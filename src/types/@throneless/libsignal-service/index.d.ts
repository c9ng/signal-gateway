import errors from './errors';

export interface IdentityKey {
    id: string;
    publicKey: ArrayBuffer;
    firstUse: boolean;
    timestamp: number;
    verified: number;
    nonblockingApproval: boolean;
}

export interface Session {
    id: string;
    number: string;
    deviceId: number;

    // seems to be a (invalid!!) JSON string. wtf.
    // this might not rount trip to/from the database?
    // so maybe better encode as base64
    record: string;
}

export interface PreKey {
    id: string;
    publicKey:  ArrayBuffer;
    privateKey: ArrayBuffer;
}

export interface SignedPreKey {
    id: string;
    publicKey:  ArrayBuffer;
    privateKey: ArrayBuffer;
    created_at: number;
    confirmed: boolean;
}

export interface Unprocessed {
    id: string;
    version: number;
    envelope?: Uint8Array;
    timestamp: number;
    attempts: number;

    // I don't quite understand the code in libsignal-service...
    source?:          string; // guessed type
    sourceUuid?:      string; // guessed type
    sourceDevice?:    string; // guessed type
    serverTimestamp?: number; // guessed type
    decrypted?:       string;
}

export interface Group {
    id: string;
    numbers: string[];
    numberRegistrationIds?: {
        [number: string]: {
            // it really seems to just be the empty object?
        }
    }
}

export interface Config<Value=any> {
    id: string;
    value: Value;
}

export interface NumberIdConfig extends Config<string> {
    id: 'number_id'
}

export interface UuidIdConfig extends Config<string> {
    id: 'uuid_id'
}

export interface DevicenameEncryptedConfig extends Config<boolean> {
    id: 'deviceNameEncrypted'
}

export interface SignedKeyIdConfig extends Config<number> {
    id: 'signedKeyId'
}

export interface SignedKeyRotationRejected extends Config<boolean> {
    id: 'signedKeyRotationRejected'
}

export interface MaxPreKeyIdConfig extends Config<number> {
    id: 'maxPreKeyId'
}

export interface BlockedConfig extends Config<string[]> {
    id: 'blocked'
}

export interface BlockedUuidsConfig extends Config<string[]> {
    id: 'blocked-uuids'
}

export interface BlockedGroupsConfig extends Config<string[]> {
    id: 'blocked-groups'
}

export interface IdentityKeyConfig extends Config<{
    pubKey:  ArrayBuffer; // TODO
    privKey: ArrayBuffer; // TODO
}> {
    id: 'identityKey'
}

export interface PasswordConfig extends Config<string> {
    id: 'password'
}

export interface RegistrationIdConfig extends Config<number> {
    id: 'registrationId'
}

export interface ProfileKeyConfig extends Config<string|number> {
    id: 'profileKey'
    // TODO: guessed value type
}

export interface UserAgentConfig extends Config<string> {
    id: 'userAgent'
}

export interface ReadReceiptsSettingAgentConfig extends Config<boolean> {
    id: 'read-receipts-setting'
}

export interface RegionCodeConfig extends Config<string> {
    id: 'regionCode'
}

export interface SignalingKeyConfig extends Config<string> {
    id: 'signaling_key'
    // TODO: guessed value type
}

export type Configuration =
    NumberIdConfig | UuidIdConfig | DevicenameEncryptedConfig | SignedKeyIdConfig |
    SignedKeyRotationRejected | MaxPreKeyIdConfig | BlockedConfig | BlockedUuidsConfig |
    BlockedGroupsConfig | IdentityKeyConfig | PasswordConfig | RegistrationIdConfig |
    ProfileKeyConfig | UserAgentConfig | ReadReceiptsSettingAgentConfig | RegionCodeConfig |
    SignalingKeyConfig;

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

    createOrUpdateGroup(data: Group): Promise<void>;
    getGroupById(id: string): Promise<Group|null>;
    getAllGroups(): Promise<Group[]>;
    getAllGroupIds(): Promise<string[]>;
    removeGroupById(id: string): Promise<void>;

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

    hasGroups(): boolean;
    createNewGroup(groupId: string|undefined|null, numbers: string[]): Promise<Group>;
    getGroup(groupId: string): Promise<Group|undefined>;
    getGroupNumbers(groupId: string): Promise<string[]|undefined>;

    getNumber(): Promise<string>;
    getUuid(): Promise<string>;
}

export class AccountManager {
    readonly username: string;
    readonly password: string
    readonly store: ProtocolStore;

    constructor(username: string, password: string, store: ProtocolStore);

    registerSingleDevice(code: string): Promise<any>;
    requestSMSVerification(): Promise<any>;
    requestVoiceVerification(): Promise<any>;
    registerSecondDevice(setProvisioningUrl: string, confirmNumber: string, progressCallback?: () => void): Promise<any>;
}

export interface OutMessage {
    body?: string;
    attachments?: Attachment[];
    quote?:       string; // TODO: whats the actual type?
    preview?:     string; // TODO: whats the actual type?
    sticker?:     string; // TODO: whats the actual type?
    reaction?:    string; // TODO: whats the actual type?
    expireTimer?: string|number; // TODO: maybe number? dunno
}

export interface OutMessageToRecipients extends OutMessage {
    recipients: string[];
    group?: {
        id: string,
        type: number,
    };
}

export interface OutMessageToIdentifier extends OutMessage {
    identifier: string;
}

export interface OutMessageToNumber extends OutMessage {
    number: string;
}

export interface OutMessageToGroup extends OutMessage {
    groupId: string
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

    sendMessage(message: OutMessageToRecipients, options?: SendMessageOptions): Promise<SendMessageResult>
    sendMessageToIdentifier(message: OutMessageToIdentifier, options?: SendMessageOptions): Promise<SendMessageResult>;
    sendMessageToNumber(message: OutMessageToNumber, options?: SendMessageOptions): Promise<SendMessageResult>;
    sendMessageToGroup(message: OutMessageToGroup, options?: SendMessageOptions): Promise<SendMessageResult>;

    resetSession(identifier: string, timestamp: string, options?: { /* TODO */ }): Promise<void>;

    createGroup(targetIdentifiers: string[], id: string, name: string, avatar?: Attachment|null, options?: GroupOptions): Promise<string>;
    updateGroup(groupId: string, name: string, avatar: Attachment|null, targetIdentifiers: string[], options?: GroupOptions): Promise<void>;
    addIdentifierToGroup(groupId: string, newIdentifiers: string[], options?: GroupOptions): Promise<void>;
    addNumberToGroup(groupId: string, newNumbers: string[], options?: GroupOptions): Promise<void>;
    setGroupName(groupId: string, name: string, groupIdentifiers: string[], options?: GroupOptions): Promise<void>;
    leaveGroup(groupId: string, groupIdentifiers: string[], options?: GroupOptions): Promise<void>;
}

export type EventType = 'message' | 'configuration' | 'group' | 'contact' | 'verified' | 'sent' | 'delivery' | 'read' | 'error' | 'close' | 'reconnect';

export class Event {
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

export interface MessageEvent extends Event {
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

export interface ConfigurationEvent extends Event {
    readonly type: 'configuration';
    readonly configuration: {
        [key: string]: any; // TODO
    }
}

export interface GroupEvent extends Event {
    readonly type: 'group';
    readonly groupDetails: {
        [key: string]: any; // TODO
    }
}

export interface ContactEvent extends Event {
    readonly type: 'contact';
    readonly contactDetails: {
        [key: string]: any; // TODO
    }
}

export interface VerifiedEvent extends Event {
    readonly type: 'verified';
    readonly verified: {
        state: string,
        destination: string,
        destinationUuid: string,
        identityKey: ArrayBuffer,
    };
}

export interface SentEvent extends Event {
    readonly type: 'sent';
    readonly data: {
        // TODO
        deviceId: string;
        destination: string;
        timestamp: string;
    }
}

export interface DeliveryEvent extends Event {
    readonly type: 'delivery';
    readonly deliveryReceipt: {
        // TODO
        source: string;
        sourceDevice: string;
        timestamp: string;
    }
}

export interface ReadEvent extends Event {
    readonly type: 'read';
    readonly read: {
        // TODO
        reader: string;
        timestamp: string;
    }
}

export interface ErrorEvent extends Event {
    readonly type: 'error';
    readonly error: any;
}

export interface CloseEvent extends Event {
    readonly type: 'close';
}

export interface ReconnectEvent extends Event {
    readonly type: 'reconnect';
}

export interface ReceiverOptions {
    retryCached?: boolean;
}

export class MessageReceiver {
    readonly store: ProtocolStore;
    readonly signalingKey?: ArrayBuffer | Buffer;

    constructor(store: ProtocolStore, signalingKey?: ArrayBuffer | Buffer, options?: ReceiverOptions);

    connect(): Promise<void>;

    addEventListener(eventType: EventType,       handler: (event: Event)              => void): void;
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
    addEventListener(eventType: 'reconnect',     handler: (event: ReconnectEvent)     => void): void;

    removeEventListener(eventType: EventType,       handler: (event: Event)              => void): void;
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
    removeEventListener(eventType: 'reconnect',     handler: (event: ReconnectEvent)     => void): void;

    handleAttachment(attachment: InAttachment): Promise<AttachmentPointer>;

    close(): Promise<any>; // same return type as drain()
    drain(): Promise<any>; // TODO: return type
}


export module AttachmentHelper {
    function isImage(mimeType: string): boolean;
    function isAudio(mimeType: string): boolean;
    function contentTypeToFileName(mimeType: string): string;

    function lodaFile(file: string, caption?: string): Promise<Attachment>;
    function saveFile(file: { fileName?: string, data: ArrayBuffer|string|Buffer, contentType: string}, dest: string): Promise<string>;
}
