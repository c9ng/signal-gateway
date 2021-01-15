import { Request, Response } from 'express';
import { Token } from 'oauth2-server';
import { NotFound } from '../errors';
import Account from '../models/Account';

export async function sendMessage (req: Request, res: Response) {
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
