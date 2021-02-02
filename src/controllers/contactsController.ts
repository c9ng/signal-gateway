import { Request, Response } from 'express';
import Account from '../models/Account';
import { Token } from 'oauth2-server';
import { NotFound, BadRequest, HttpError } from '../errors';
import { getOrCreateConnection } from '../connections';
import * as crypto from "@throneless/libsignal-service/src/crypto";

export async function getContact (req: Request, res: Response) {
    const token = res.locals.oauthToken as Token;

    const account = await Account.findOne({
        where: { clientId: token.client.id, tel: req.params.tel }
    });

    if (!account) {
        throw new NotFound('Could not find account with given tel.');
    }

    const { contactTel } = req.params;

    if (!contactTel || typeof contactTel !== 'string') {
        throw new BadRequest(`Missing or illegal contactTel parameter: ${JSON.stringify(contactTel)}`);
    }

    const connection = await getOrCreateConnection(account);
    let profile: any;
    
    try {
        profile = await connection.sender.getProfile(contactTel);
    } catch (error) {
        if (error.name === 'HTTPError') {
            throw new HttpError(error.code, error.message, error);
        }
        throw error;
    }

    if (profile.name !== null) {
        // XXX: does not seem to work. I always get: { given: "", family: null }
        const profileKey = await connection.sender.store.getProfileKey();

        const name = await crypto.decryptProfileName(profile.name, profileKey);
        profile.name = {
            given:  Buffer.from(name.given).toString("UTF-8"),
            family: name.family !== null ? Buffer.from(name.family).toString("UTF-8") : null,
        };
    }

    return res.json(profile);
}

export async function getAvatar (req: Request, res: Response) {
    const token = res.locals.oauthToken as Token;

    const account = await Account.findOne({
        where: { clientId: token.client.id, tel: req.params.tel }
    });

    if (!account) {
        throw new NotFound('Could not find account with given tel.');
    }

    const { path } = req.params;

    if (!path || typeof path !== 'string') {
        throw new BadRequest(`Missing or illegal path parameter: ${JSON.stringify(path)}`);
    }

    const connection = await getOrCreateConnection(account);
    let encryptedAvatar: ArrayBuffer;
    
    try {
        encryptedAvatar = await connection.sender.getAvatar(path);
    } catch (error) {
        if (error.name === 'HTTPError') {
            throw new HttpError(error.code, error.message, error);
        }
        throw error;
    }
    // TODO: decrypt avatar somehow
    const profileKey = await connection.sender.store.getProfileKey() as any;
    const avatar = await crypto.decryptProfile(encryptedAvatar, profileKey);
    // XXX: decryptProfile() just returns undefined!!!

    return res.send(Buffer.from(avatar));
}
