import { EventType, AccountManager } from '@throneless/libsignal-service';
import { Request, Response } from 'express';
import { Token } from 'oauth2-server';
import { NotFound, BadRequest, HttpError, Forbidden } from '../errors';
import Account from '../models/Account';
import { getOrCreateConnection, connect, disconnect, updateEvents } from '../connections';

function validateEvents(events: string[]): EventType[] {
    for (const event of events) {
        switch (event) {
            case 'message':
            case 'configuration':
            case 'group':
            case 'contact':
            case 'verified':
            case 'sent':
            case 'delivery':
            case 'read':
            case 'error':
                break;

            default:
                throw new BadRequest(`Illegal event type: ${event}`);
        }
    }

    return events as EventType[];
}

export async function createAccount (req: Request, res: Response) {
    const token = res.locals.oauthToken as Token;

    let events: any = req.body.events;

    if (!events) {
        events = [];
    } else if (!Array.isArray(events)) {
        events = [...new Set(String(events).split(','))];
    } else {
        events = [...new Set(events)];
    }

    events.sort();
    validateEvents(events);

    const account = await Account.create({
        clientId:  token.client.id,
        tel:  req.body.tel,
        name: req.body.name,
        events,
    });

    await connect(account);

    return res.json({
        account: {
            tel:  account.tel,
            name: account.name,
            events,
        }
    });
}

export async function getAccounts (req: Request, res: Response) {
    const token = res.locals.oauthToken as Token;

    const accounts = await Account.findAll({
        where: { clientId: token.client.id }
    });

    return res.json({
        accounts: accounts.map(account => ({
            tel:    account.tel,
            name:   account.name,
            events: account.events,
        }))
    });
}

export async function getAccount (req: Request, res: Response) {
    const token = res.locals.oauthToken as Token;

    const account = await Account.findOne({
        where: { clientId: token.client.id, tel: req.params.tel }
    });

    if (!account) {
        throw new NotFound('Could not find account with given tel.');
    }

    return res.json({
        account: {
            tel:    account.tel,
            name:   account.name,
            events: account.events,
        }
    });
}

export async function updateAccount (req: Request, res: Response) {
    const token = res.locals.oauthToken as Token;

    const account = await Account.findOne({
        where: { clientId: token.client.id, tel: req.params.tel }
    });

    if (!account) {
        throw new NotFound('Could not find account with given tel.');
    }

    if ('events' in req.body) {
        const events: any = req.body.event;
        if (!events) {
            account.events = [];
        } else if (!Array.isArray(events)) {
            account.events = [...new Set(String(events).split(','))] as any;
        } else {
            account.events = [...new Set(events)];
        }
        account.events.sort();
        validateEvents(account.events);
    }

    const { name } = req.body;
    if (typeof name === 'string') {
        account.name = name;
    }

    await account.save();
    await updateEvents(account);

    return res.json({
        account: {
            tel:    account.tel,
            name:   account.name,
            events: account.events,
        }
    });
}

export async function deleteAccount (req: Request, res: Response) {
    const token = res.locals.oauthToken as Token;

    const account = await Account.findOne({
        where: { clientId: token.client.id, tel: req.params.tel }
    });

    if (!account) {
        throw new NotFound('Could not find account with given tel.');
    }

    await account.destroy();
    await disconnect(account);

    return res.json({success: true});
}

export async function requestSMSVerification (req: Request, res: Response) {
    const token = res.locals.oauthToken as Token;
    const { password } = req.body;

    if (typeof password !== 'string' || password.length === 0) {
        throw new BadRequest('Parameter "password" is required.');
    }

    const account = await Account.findOne({
        where: { clientId: token.client.id, tel: req.params.tel }
    });

    if (!account) {
        throw new NotFound('Could not find account with given tel.');
    }

    const connection = await getOrCreateConnection(account);
    const accountManager = new AccountManager(account.tel, password, connection.sender.store);
    try {
        await accountManager.requestSMSVerification();
    } catch (error) {
        if (error.name === 'HTTPError') {
            throw new HttpError(error.code, error.message, error);
        }
        throw error;
    }

    return res.json({success: true});
}

export async function requestVoiceVerification (req: Request, res: Response) {
    const token = res.locals.oauthToken as Token;
    const { password } = req.body;

    if (typeof password !== 'string' || password.length === 0) {
        throw new BadRequest('Parameter "password" is required.');
    }

    const account = await Account.findOne({
        where: { clientId: token.client.id, tel: req.params.tel }
    });

    if (!account) {
        throw new NotFound('Could not find account with given tel.');
    }

    const connection = await getOrCreateConnection(account);
    const accountManager = new AccountManager(account.tel, password, connection.sender.store);

    try {
        await accountManager.requestVoiceVerification();
    } catch (error) {
        if (error.name === 'HTTPError') {
            throw new HttpError(error.code, error.message, error);
        }
        throw error;
    }

    return res.json({success: true});
}

export async function registerSingleDevice (req: Request, res: Response) {
    const token = res.locals.oauthToken as Token;
    const { password, code } = req.body;

    if (typeof password !== 'string' || password.length === 0) {
        throw new BadRequest('Parameter "password" is required.');
    }

    if (typeof code !== 'string' || code.length === 0) {
        throw new BadRequest('Parameter "code" is required.');
    }

    const account = await Account.findOne({
        where: { clientId: token.client.id, tel: req.params.tel }
    });

    if (!account) {
        throw new NotFound('Could not find account with given tel.');
    }

    const connection = await getOrCreateConnection(account);
    const accountManager = new AccountManager(account.tel, password, connection.sender.store);

    try {
        await accountManager.registerSingleDevice(code);
    } catch (error) {
        if (error.name === 'HTTPError') {
            if (error.code === 403) {
                throw new Forbidden('Invalid code, please try again.', error);
            }
            throw new HttpError(error.code, error.message, error);
        }
        throw error;
    }

    return res.json({success: true});
}
