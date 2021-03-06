import {
    MessageSender, MessageReceiver, ProtocolStore,
    MessageEvent, ConfigurationEvent, GroupEvent, ContactEvent,
    VerifiedEvent, SentEvent, DeliveryEvent, ReadEvent, ErrorEvent,
    CloseEvent, ReconnectEvent,
    Event,
    EventType,
    MessageEventData,
} from '@throneless/libsignal-service';
import { NODE_ENV } from './config/env';
import { SignalStorage } from './impls/signal';
import Account from './models/Account';
import OauthClient from './models/OauthClient';
import { deliverWebhook } from './webhook';
import { inspect } from 'util';

export interface Connection {
    readonly clientId: string;
    readonly tel: string;
    readonly sender: MessageSender;
    readonly receiver: MessageReceiver;
    readonly listeners: Map<EventType, (event: Event) => Promise<void>>;
}

const connections = new Map<string, Connection>();

async function disconnectInternal(connection: Connection): Promise<void> {
    await connection.receiver.close();
}

// TODO: move payload handling and webhook delivery in own file?

interface Payload {
    // TODO
    receiver: string;
    type: string;
    payload?: any;
}

interface StrippedInAttachment {
    cdnId?: string;
    cdnKey?: string;
    cdnNumber?: number;
    key: string;
    digest: string;
    size: number;
    fileName: string;
    contentType?: string;
    flags?: number;
    caption?: string;
    blurHash?: string;
    uploadTimestamp: number;
}

interface StrippedMessageEventData {
    source: string;
    sourceUuid: string;
    sourceDevice: number;
    timestamp: number;
    receivedAt?: number;
    message: {
        attachments: StrippedInAttachment[];
        body: string;
        contact: string[]; // TODO: array of something?
        preview: string[]; // TODO: array of something?
    };
    group?: {
        id: string;
    };
}

// just to make sure thare are no weird types that crash JSON.stringify()
// or that would be huge arrays of nubmers (Buffer)
function convertMessage(data: MessageEventData): StrippedMessageEventData {
    const {
        source, sourceUuid, sourceDevice, timestamp,
        receivedAt, message, group,
    } = data;

    const {
        attachments,
        body,
        contact,
        preview,
    } = message;

    return {
        source,
        sourceUuid,
        sourceDevice,
        timestamp: Number(timestamp),
        receivedAt,
        message: {
            attachments: attachments.map(({
                cdnId, cdnKey, cdnNumber, key, digest, size,
                fileName, contentType, flags, caption, blurHash,
                uploadTimestamp
            }) =>({
                cdnId, cdnKey, cdnNumber, key, digest, size,
                fileName, contentType, flags, caption, blurHash,
                uploadTimestamp: Number(uploadTimestamp),
            })),
            body,
            contact,
            preview,
        },
        group,
    };
}

async function deliverEvent(clientId: string, tel: string, event: Event, payload: Payload): Promise<void> {
    try {
        const client = await OauthClient.findOne({
            where: { id: clientId }
        });

        if (!client) {
            console.error(`Tried to deliver webhook to client ${clientId} and tel ${tel}, but client is (no longer?) in database.`);
        } else {
            if (NODE_ENV === 'development') {
                console.log(`Sending webhook to ${client.webhookUri || '/dev/null'}:`,
                    payload.type === 'message' ? inspect(payload, { depth: null }) : payload);
            }
            if (client.webhookUri) {
                await deliverWebhook(client.webhookUri, JSON.stringify(payload), {
                    secret: client.webhookSecret,
                    token: client.webhookToken,
                });
            }
        }

        if (event.confirm) {
            event.confirm();
        }
    } catch (error) {
        console.error(`Webhook delivery to ${tel} for client ${clientId} failed:`, error);
        if (NODE_ENV === 'development') {
            console.error(`Webhook payload was:`,
                payload.type === 'message' ? inspect(payload, { depth: null }) : payload);
        }
    }
}

const HANDLERS = {
    message: (clientId: string, tel: string) => async (event: MessageEvent) =>
        deliverEvent(clientId, tel, event, { receiver: tel, type: event.type, payload: convertMessage(event.data) }),

    configuration: (clientId: string, tel: string) => async (event: ConfigurationEvent) =>
        deliverEvent(clientId, tel, event, { receiver: tel, type: event.type, payload: event.configuration }),

    group: (clientId: string, tel: string) => async (event: GroupEvent) =>
        deliverEvent(clientId, tel, event, { receiver: tel, type: event.type, payload: event.groupDetails }),

    contact: (clientId: string, tel: string) => async (event: ContactEvent) =>
        deliverEvent(clientId, tel, event, { receiver: tel, type: event.type, payload: event.contactDetails }),

    verified: (clientId: string, tel: string) => async (event: VerifiedEvent) =>
        deliverEvent(clientId, tel, event, { receiver: tel, type: event.type, payload: event.verified }),

    sent: (clientId: string, tel: string) => async (event: SentEvent) =>
        deliverEvent(clientId, tel, event, { receiver: tel, type: event.type, payload: event.data }),

    delivery: (clientId: string, tel: string) => async (event: DeliveryEvent) =>
        deliverEvent(clientId, tel, event, { receiver: tel, type: event.type, payload: event.deliveryReceipt }),

    read: (clientId: string, tel: string) => async (event: ReadEvent) =>
        deliverEvent(clientId, tel, event, { receiver: tel, type: event.type }),

    error: (clientId: string, tel: string) => async (event: ErrorEvent) =>
        deliverEvent(clientId, tel, event, { receiver: tel, type: event.type,
            payload: event.error instanceof Error ? {
                name: event.error.name,
                message: event.error.message,
            } : event.error
        }),

    close: (clientId: string, tel: string) => async (event: CloseEvent) =>
        deliverEvent(clientId, tel, event, { receiver: tel, type: event.type }),

    reconnect: (clientId: string, tel: string) => async (event: ReconnectEvent) =>
        deliverEvent(clientId, tel, event, { receiver: tel, type: event.type }),
}

export async function connect(account: Account): Promise<Connection> {
    const { clientId, tel } = account;
    const key = `${clientId}/${tel}`;
    let connection = connections.get(key);

    if (connection) {
        connections.delete(key);
        await disconnectInternal(connection);
    }

    const storeBackend = new SignalStorage(account.clientId, account.tel);
    const protocolStore = new ProtocolStore(storeBackend);
    await protocolStore.load();

    const sender = new MessageSender(protocolStore);
    await sender.connect();

    // TODO: when do we need signalingKey?
    const receiver = new MessageReceiver(protocolStore);
    await receiver.connect();

    const listeners = new Map<EventType, (event: Event) => Promise<void>>();

    connection = { clientId, tel, sender, receiver, listeners };
    connections.set(key, connection);

    for (const eventType of new Set(account.events)) {
        // TypeScript is not intelligent enough to see this is fine:
        const listener = HANDLERS[eventType](clientId, tel);
        listeners.set(eventType, listener as any);
        (receiver as any).addEventListener(eventType, listener);
    }

    receiver.addEventListener('error', event => {
        const { error } = event;
        console.error(error ?? 'unknown error event');
    });

    return connection;
}

export async function updateEvents(account: Account): Promise<Connection|null> {
    const { clientId, tel } = account;
    const key = `${clientId}/${tel}`;
    let connection = connections.get(key);

    if (!connection) {
        return null;
    }

    const { listeners, receiver } = connection;
    const events = new Set(account.events);

    for (const [eventType, listener] of [...listeners]) {
        if (!events.has(eventType)) {
            (receiver as any).removeEventListener(eventType, listener);
            listeners.delete(eventType);
        }
    }

    for (const eventType of events) {
        if (!connection.listeners.has(eventType)) {
            // TypeScript is not intelligent enough to see this is fine:
            const listener = HANDLERS[eventType](clientId, tel);
            listeners.set(eventType, listener as any);
            (receiver as any).addEventListener(eventType, listener);
        }
    }

    return connection;
}

export async function disconnect(account: Account): Promise<void> {
    const key = `${account.clientId}/${account.tel}`;
    const connection = connections.get(key);

    if (connection) {
        connections.delete(key);
        await disconnectInternal(connection);
    }
}

export function getConnection(account: Account): Connection|undefined {
    const key = `${account.clientId}/${account.tel}`;
    return connections.get(key);
}

export async function getOrCreateConnection(account: Account): Promise<Connection> {
    const key = `${account.clientId}/${account.tel}`;
    return connections.get(key) ?? connect(account);
}

export async function startUp(): Promise<void> {
    const accounts = await Account.findAll({
        where: {
            deviceRegistered: true
        }
    });

    for (const account of accounts) {
        await connect(account);
    }
}

export async function shutDown(): Promise<void> {
    for (const [key, connection] of connections) {
        await disconnectInternal(connection);
    }
    connections.clear();
}
