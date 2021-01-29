import { Request, Response } from 'express';
import { Token } from 'oauth2-server';
import { NotFound, HttpError, NotImplemented, BadRequest } from '../errors';
import Account from '../models/Account';
import { getOrCreateConnection } from '../connections';
import { Attachment, OutMessageToRecipients } from '@throneless/libsignal-service';

const MESSAGE_STRING_KEYS: Array<'body'|'quote'|'preview'|'sticker'|'reaction'> =
    ['body', 'quote', 'preview', 'sticker', 'reaction'];

const GROUP_UNKNOWN = 0;
const GROUP_UPDATE  = 1;
const GROUP_DELIVER = 2;
const GROUP_QUIT    = 3;

function convertMessage(data: any): OutMessageToRecipients {
    const message: OutMessageToRecipients = {
        recipients: []
    };

    if (!data || typeof data !== 'object') {
        throw new BadRequest('JSON root element is not an object');
    }

    const {
        recipients,
        attachments,
        expireTimer,
    } = data;

    if (!Array.isArray(recipients)) {
        throw new BadRequest('Key recipients is missing or not an array.');
    }

    for (const recipient of recipients) {
        if (!recipient || typeof recipient !== 'string') {
            throw new BadRequest(`Illegal message recipient: ${JSON.stringify(recipient)}`);
        }
        message.recipients.push(recipient);
    }

    for (const key of MESSAGE_STRING_KEYS) {
        const value = data[key];
        if (value !== undefined) {
            if (typeof value !== 'string') {
                throw new BadRequest(`Illegal message ${key}: ${JSON.stringify(value)}`);
            }
            message[key] = value;
        }
    }

    if (attachments !== undefined) {
        if (!Array.isArray(attachments)) {
            throw new BadRequest(`Illegal message attachments: ${JSON.stringify(attachments)}`);
        }

        message.attachments = [];
        for (const attachment of attachments) {
            if (!attachment || typeof attachment !== 'object') {
                throw new BadRequest(`Illegal attachment: ${JSON.stringify(attachment)}`);
            }

            const {
                fileName,
                contentType,
                width,
                height,
                data,
                size,
                flags,
            } = attachment;

            if (fileName === undefined) {
                throw new BadRequest(`Missing attachment key fileName.`);
            }

            if (typeof fileName !== 'string') {
                throw new BadRequest(`Illegal attachment fileName: ${JSON.stringify(fileName)}`);
            }

            if (data === undefined) {
                throw new BadRequest(`Missing attachment key data.`);
            }

            if (typeof data !== 'string') {
                throw new BadRequest(`Illegal attachment data: ${JSON.stringify(data)}`);
            }

            // TODO: maybe allow supplying data via multipart form encoding or via url?
            const buffer = Buffer.from(data, 'base64');
            const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

            if (size === undefined) {
                throw new BadRequest(`Missing attachment key size.`);
            }

            if (typeof size !== 'number' || size < 0) {
                throw new BadRequest(`Illegal attachment size: ${JSON.stringify(size)}`);
            }

            const validAttachment: Attachment = {
                fileName,
                data: arrayBuffer,
                size,
            };

            if (contentType !== undefined) {
                if (typeof contentType !== 'string') {
                    throw new BadRequest(`Illegal attachment contentType: ${JSON.stringify(contentType)}`);
                }
                validAttachment.contentType = contentType;
            }

            if (width !== undefined) {
                if (typeof width !== 'number' || width < 0) {
                    throw new BadRequest(`Illegal attachment width: ${JSON.stringify(width)}`);
                }
                validAttachment.width = width;
            }

            if (height !== undefined) {
                if (typeof height !== 'number' || height < 0) {
                    throw new BadRequest(`Illegal attachment height: ${JSON.stringify(height)}`);
                }
                validAttachment.height = height;
            }

            if (flags !== undefined) {
                if (typeof flags !== 'number' && typeof flags !== 'string') {
                    throw new BadRequest(`Illegal attachment flags: ${JSON.stringify(flags)}`);
                }
                validAttachment.flags = flags;
            }

            message.attachments.push(validAttachment);
        }
    }

    if (expireTimer !== undefined) {
        if (typeof expireTimer !== 'string' && typeof expireTimer !== 'number') {
            throw new BadRequest(`Illegal message expireTimer: ${JSON.stringify(expireTimer)}`);
        }
        message.expireTimer = expireTimer;
    }

    return message;
}

export async function sendMessage (req: Request, res: Response) {
    const token = res.locals.oauthToken as Token;
    const message = convertMessage(req.body);

    const account = await Account.findOne({
        where: { clientId: token.client.id, tel: req.params.tel }
    });

    if (!account) {
        throw new NotFound('Could not find account with given tel.');
    }

    const connection = await getOrCreateConnection(account);

    let result;
    try {
        result = await connection.sender.sendMessage(message);
    } catch (error) {
        if (error.name === 'HTTPError') {
            throw new HttpError(error.code, error.message, error);
        }
        throw error;
    }

    return res.json({
        ...result,
        errors: result.errors.map(error => ({
            name: error.name,
            message: error.message,
            code: error.code,
        }))
    });
}

export async function sendMessageToGroup (req: Request, res: Response) {
    const token = res.locals.oauthToken as Token;
    const { body } = req;
    let groupId;
    if (body && typeof body === 'object') {
        body.recipients = [];
        groupId = body.groupId;
    }

    const message = convertMessage(body);

    if (groupId === undefined) {
        throw new BadRequest(`Missing message key groupId.`);
    }

    if (typeof groupId !== 'string' || !groupId) {
        throw new BadRequest(`Illegal message groupId: ${JSON.stringify(groupId)}`);
    }

    const account = await Account.findOne({
        where: { clientId: token.client.id, tel: req.params.tel }
    });

    if (!account) {
        throw new NotFound('Could not find account with given tel.');
    }

    const connection = await getOrCreateConnection(account);
    const { store } = connection.sender;

    if (store.hasGroups()) {
        const groupNumbers = await store.getGroupNumbers(groupId);
        if (!groupNumbers) {
            throw new NotFound(`Group not found: ${JSON.stringify(groupId)}`);
        }
        message.recipients = groupNumbers;
    }

    const myNumber = await store.getNumber();
    const myUuid   = await store.getUuid();

    message.recipients = message.recipients.filter(
        id => id !== myNumber && id !== myUuid
    );

    message.group = {
        id: groupId,
        type: GROUP_DELIVER,
    };

    let result;
    try {
        result = await connection.sender.sendMessage(message);
    } catch (error) {
        if (error.name === 'HTTPError') {
            throw new HttpError(error.code, error.message, error);
        }
        throw error;
    }

    return res.json({
        ...result,
        errors: result.errors.map(error => ({
            name: error.name,
            message: error.message,
            code: error.code,
        }))
    });
}
