import { Request, Response } from 'express';
import { Token } from 'oauth2-server';
import { NotFound } from '../errors';
import Account from '../models/Account';
import { getOrCreateConnection } from '../connections';

export async function sendMessage (req: Request, res: Response) {
    const token = res.locals.oauthToken as Token;

    const account = await Account.findOne({
        where: { clientId: token.client.id, tel: req.params.tel }
    });

    if (!account) {
        throw new NotFound('Could not find account with given tel.');
    }

    const connection = await getOrCreateConnection(account);

    // TODO
    const result = await connection.sender.sendMessage(req.body);

    return res.json({
        ...result,
        errors: result.errors.map(error => ({
            name: error.name,
            message: error.message,
            code: error.code,
        }))
    });
}
