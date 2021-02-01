import { Router, Request, Response, NextFunction } from 'express';
import OAuth2Server from 'oauth2-server';
import { SCOPES } from './models/OauthClient';
import * as oauthModel from './impls/oauth';
import * as accountsController from './controllers/accountsController';
import * as messagesController from './controllers/messagesController';
import * as attachmentsController from './controllers/attachmentsController';
import * as contactsController from './controllers/contactsController';

const oauthServer = new OAuth2Server({
    model: oauthModel
});

function auth(...scopes: string[]) {
    const options: OAuth2Server.AuthenticateOptions = {};

    if (scopes.length > 0) {
        for (const scope of scopes) {
            if (!SCOPES.has(scope)) {
                throw new Error(`illegal scope: ${scope}`);
            }
        }
        options.scope = scopes;
    }

    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const request  = new OAuth2Server.Request(req);
            const response = new OAuth2Server.Response(res);

            const token = await oauthServer.authenticate(request, response, options);
            res.locals.oauthToken = token;
        } catch (err) {
            return next(err);
        }
        return next();
    }
}

async function obtainToken(req: Request, res: Response, next: NextFunction) {
    let token;
    try {
        const request  = new OAuth2Server.Request(req);
        const response = new OAuth2Server.Response(res);

        token = await oauthServer.token(request, response);
    } catch (err) {
        return next(err);
    }
    res.json(token);
}

const routes = Router();
export default routes;

const handle = (handler: (req: Request, res: Response) => Promise<any>) =>
    (req: Request, res: Response, next: NextFunction) => handler(req, res).catch(next);

// ==== OAuth ====
routes.post('/oauth/token', obtainToken);

// ==== Accounts ====
routes.post(  '/accounts',      auth('write:accounts'), handle(accountsController.createAccount));
routes.get(   '/accounts',      auth('read:accounts'),  handle(accountsController.getAccounts));
routes.get(   '/accounts/:tel', auth('read:accounts'),  handle(accountsController.getAccount));
routes.patch( '/accounts/:tel', auth('write:accounts'), handle(accountsController.updateAccount));
routes.delete('/accounts/:tel', auth('write:accounts'), handle(accountsController.deleteAccount));
routes.post(  '/accounts/:tel/verify_sms',             auth('write:accounts'), handle(accountsController.requestSMSVerification));
routes.post(  '/accounts/:tel/verify_voice',           auth('write:accounts'), handle(accountsController.requestVoiceVerification));
routes.post(  '/accounts/:tel/register_single_device', auth('write:accounts'), handle(accountsController.registerSingleDevice));
routes.get(   '/accounts/:tel/profile',                auth('write:accounts'), handle(accountsController.getProfile));

// ==== Messages ====
routes.post('/accounts/:tel/messages', auth('write:messages'), handle(messagesController.sendMessage));

// ==== Attachments ====
routes.post('/accounts/:tel/attachment', auth('read:attachments'), handle(attachmentsController.getAttachment));

// ==== Contacts ====
routes.get('/accounts/:tel/contacts/:contactTel', auth('read:accounts'), handle(contactsController.getContact));
routes.get('/accounts/:tel/avatars/:path(*)', auth('read:accounts'), handle(contactsController.getAvatar));
