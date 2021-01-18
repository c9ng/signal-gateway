import { EventType } from '@throneless/libsignal-service';
import { Request, Response } from 'express';
import { Token } from 'oauth2-server';
import { NotFound, BadRequest } from '../errors';
import Account from '../models/Account';

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

    let events: any = req.params.events;

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
        tel:  req.params.tel,
        name: req.params.name,
        events,
    });

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

    if ('events' in req.params) {
        const { events } = req.params;
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

    if ('name' in req.params) {
        account.name = req.params.name;
    }

    await account.save();

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

    return res.json({
        success: true
    });
}

export async function verifyAccount (req: Request, res: Response) {
    const token = res.locals.oauthToken as Token;

    const account = await Account.findOne({
        where: { clientId: token.client.id, tel: req.params.tel }
    });

    if (!account) {
        throw new NotFound('Could not find account with given tel.');
    }

    // TODO
    throw new Error('not implemented');

    return res.json({
        success: true
    });
}
