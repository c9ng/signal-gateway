import { EventType, AccountManager } from '@throneless/libsignal-service';
import { Request, Response } from 'express';
import { Token } from 'oauth2-server';
import { NotFound, BadRequest, HttpError, Forbidden } from '../errors';
import Account from '../models/Account';
import { getOrCreateConnection, connect, disconnect, updateEvents } from '../connections';

function validateTel(tel: any): string {
    if (tel == undefined) {
        throw new BadRequest('Parameter "tel" is required.');
    }

    if (typeof tel !== 'string') {
        throw new BadRequest(`Parameter "tel" has illegal type: ${typeof tel} (${JSON.stringify(tel)})`);
    }

    const norm = tel.replace(/[-\s().]+/g, '');
    if (norm.length === 0) {
        throw new BadRequest('Parameter "tel" is required.');
    }

    if (!/^\+?[0-9]+$/.test(norm)) {
        throw new BadRequest(`Parameter "tel" is not a valid phone number: ${tel}`);
    }

    return norm;
}

function validateEvents(events: any): EventType[] {
    if (!events) {
        return [];
    }

    const eventsArray = Array.isArray(events) ?
        [...new Set(events)] :
        String(events).split(',');
        eventsArray.sort();

    for (const event of eventsArray) {
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
            case 'reconnect':
                break;

            default:
                throw new BadRequest(`Illegal event type: ${event}`);
        }
    }

    return eventsArray as EventType[];
}

export async function createAccount (req: Request, res: Response) {
    const token = res.locals.oauthToken as Token;

    const events = validateEvents(req.body.events);
    const tel = validateTel(req.body.tel);

    const { name } = req.body;

    if (typeof name !== 'string' || name.length === 0) {
        throw new BadRequest('Parameter "name" is required.');
    }

    const account = await Account.create({
        clientId: token.client.id,
        tel,
        name,
        events,
        deviceRegistered: false,
    });

    return res.json({
        account: {
            tel:  account.tel,
            name: account.name,
            events,
            deviceRegistered: account.deviceRegistered,
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
            deviceRegistered: account.deviceRegistered,
        }))
    });
}

export async function getAccount (req: Request, res: Response) {
    const token = res.locals.oauthToken as Token;

    const account = await Account.findOne({
        where: { clientId: token.client.id, tel: validateTel(req.params.tel) }
    });

    if (!account) {
        throw new NotFound('Could not find account with given tel.');
    }

    return res.json({
        account: {
            tel:    account.tel,
            name:   account.name,
            events: account.events,
            deviceRegistered: account.deviceRegistered,
        }
    });
}

export async function updateAccount (req: Request, res: Response) {
    const token = res.locals.oauthToken as Token;

    const account = await Account.findOne({
        where: { clientId: token.client.id, tel: validateTel(req.params.tel) }
    });

    if (!account) {
        throw new NotFound('Could not find account with given tel.');
    }

    if ('events' in req.body) {
        account.events = validateEvents(req.body.events);
    }

    const { name } = req.body;
    if (typeof name === 'string' && name.length > 0) {
        account.name = name;
    }

    await account.save();
    await updateEvents(account);

    return res.json({
        account: {
            tel:    account.tel,
            name:   account.name,
            events: account.events,
            deviceRegistered: account.deviceRegistered,
        }
    });
}

export async function deleteAccount (req: Request, res: Response) {
    const token = res.locals.oauthToken as Token;

    const account = await Account.findOne({
        where: { clientId: token.client.id, tel: validateTel(req.params.tel) }
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
        where: { clientId: token.client.id, tel: validateTel(req.params.tel) }
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
        where: { clientId: token.client.id, tel: validateTel(req.params.tel) }
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
        where: { clientId: token.client.id, tel: validateTel(req.params.tel) }
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

    account.deviceRegistered = true;
    await account.save();

    await connect(account);

    return res.json({
        account: {
            tel:    account.tel,
            name:   account.name,
            events: account.events,
            deviceRegistered: account.deviceRegistered,
        }
    });
}
