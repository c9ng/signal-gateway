import { Request, Response } from 'express';
import Account from '../models/Account';
import { Token } from 'oauth2-server';
import { NotFound } from '../errors';
import { getOrCreateConnection } from '../connections';

export async function getAttachment (req: Request, res: Response) {
    // TODO: maybe do this automatically for all attachments and return
    //       them in the webhook JSON as base64 string?
    
    const token = res.locals.oauthToken as Token;

    const account = await Account.findOne({
        where: { clientId: token.client.id, tel: req.params.tel }
    });

    if (!account) {
        throw new NotFound('Could not find account with given tel.');
    }

    const connection = await getOrCreateConnection(account);

    // needs cdnId || cdnKey, cdnNumber, key, digest
    const attachment = await connection.receiver.handleAttachment(req.body);

    // XXX: lost contentType (and fileName) here and I don't want to rely on user input for that
    return res.send(Buffer.from(attachment.data));
}
