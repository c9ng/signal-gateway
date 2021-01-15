import { Request, Response } from 'express';
import { Token } from 'oauth2-server';
import { NotFound } from '../errors';
import Account from '../models/Account';

export async function createAccount (req: Request, res: Response) {
    const token = res.locals.oauthToken as Token;

    const account = await Account.create({
        clientId:  token.client.id,
        tel:  req.params.tel,
        name: req.params.name,
    });

    return res.json({
        account: {
            tel:  account.tel,
            name: account.name,
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
            tel:  account.tel,
            name: account.name,
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
            tel:  account.tel,
            name: account.name,
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

    if ('name' in req.params) {
        account.name = req.params.name;
    }

    await account.save();

    return res.json({
        account: {
            tel:  account.tel,
            name: account.name,
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

    return res.json({
        success: false
    });
}
