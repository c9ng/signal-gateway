import {
    MessageSender, MessageReceiver, ProtocolStore,
    MessageEvent, ConfigurationEvent, GroupEvent, ContactEvent,
    VerifiedEvent, SentEvent, DeliveryEvent, ReadEvent, ErrorEvent,
    CloseEvent,
    Event,
} from '@throneless/libsignal-service';
import { SignalStorage } from './impls/signal';
import Account from './models/Account';
import OauthClient from './models/OauthClient';
import { deliverWebhook } from './webhook';

export interface Connection {
    clientId: string;
    tel: string;
    sender: MessageSender;
    receiver: MessageReceiver;
}

const connections = new Map<string, Connection>();

async function disconnectInternal(connection: Connection): Promise<void> {
    connection.receiver.shutdown();
}

interface Payload {
    // TODO
    receiver: string;
    type: string;
    payload?: any;
}

async function deliverEvent(clientId: string, tel: string, event: Event, payload: Payload): Promise<void> {
    try {
        const client = await OauthClient.findOne({
            where: { clientId }
        });

        // TODO: error logging?
        if (client?.webhookUri) {
            await deliverWebhook(client.webhookUri, JSON.stringify(payload), {
                secret: client.webhookSecret,
                token: client.webhookToken,
            });
        }

        event.confirm();
    } catch (error) {
        console.error(`Webhook delivery to ${tel} for client ${clientId} failed:`, error);
    }
}

const HANDLERS = {
    message: (clientId: string, tel: string) => async (event: MessageEvent) =>
        deliverEvent(clientId, tel, event, { receiver: tel, type: event.type, payload: event.data }),

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

    // TODO: error details
    error: (clientId: string, tel: string) => async (event: ErrorEvent) =>
        deliverEvent(clientId, tel, event, { receiver: tel, type: event.type }),

    close: (clientId: string, tel: string) => async (event: CloseEvent) =>
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
    const sender = new MessageSender(protocolStore);
    const receiver = new MessageReceiver();

    connection = { clientId, tel, sender, receiver };
    connections.set(key, connection);

    for (const eventType of new Set(account.events)) {
        // TypeScript is not intelligent enough to see this is fine:
        (receiver as any).addEventListener(eventType, HANDLERS[eventType](clientId, tel));
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
    const accounts = await Account.findAll();

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
