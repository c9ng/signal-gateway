import * as yargs from 'yargs';
import { v4 as uuidv4 } from 'uuid';
import './lib/config';
import { NODE_ENV } from './config/env';
import OauthClient from './models/OauthClient';
import { isUrl } from './utils';

// npm run create:oauth:client --
//      --name "Client Name"
//      --grant client_credentails
//      --webhook-uri http://example.com/
//      --webhook-token foobar
//      --redirect-uri http://example.com/
//      --refresh-token-lifetime 123
//      --access-token-lifetime 123

async function main() {
    const argv = yargs.options({
        id:                       { nargs: 1, type: 'string' },
        name:                     { nargs: 1, type: 'string', required: true },
        grant:                    { nargs: 1, type: 'string', required: true },
        'webhook-uri':            { nargs: 1, type: 'string' },
        'webhook-token':          { nargs: 1, type: 'string' },
        'generate-webhook-token': { nargs: 0, type: 'boolean', conflicts: 'webhook-token' },
        'redirect-uri':           { nargs: 1, type: 'string' },
        'refresh-token-lifetime': { nargs: 1, type: 'number' },
        'access-token-lifetime':  { nargs: 1, type: 'number' },
    }).help().argv;

    const redirectUris: string[] = [];
    if (argv['redirect-uri']) {
        redirectUris.push(argv['redirect-uri']);
    }

    const secret = await OauthClient.generateSecret();
    const webhookToken = argv['generate-webhook-token'] ?
        await OauthClient.generateSecret() :
        argv['webhook-token'] ?? null;
    const webhookSecret = await OauthClient.generateSecret();
    const webhookUri = argv['webhook-uri'] ?? null;
    const id = argv.id;

    if (webhookUri !== null) {
        if (!isUrl(webhookUri)) {
            throw new Error(`Webhook URI is invalid!`);
        }

        if (NODE_ENV === 'production'&& !webhookUri.startsWith('https:')) {
            throw new Error(`Only HTTPS webhook URIs are allowed in production!`);
        }
    }

    if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        throw new Error(`Given ID is not a valid UUID!`);
    }

    const client = await OauthClient.create({
        id: id || uuidv4(),
        name: argv.name,
        secretHash: await OauthClient.hashSecret(secret),
        grants: [ argv.grant ],
        redirectUris,
        accessTokenLifetime:  argv['access-token-lifetime']  ?? null,
        refreshTokenLifetime: argv['refresh-token-lifetime'] ?? null,
        webhookUri,
        webhookToken,
        webhookSecret,
    });

    const json: {[key: string]: string|string[]|number|null} = { ...client.toJSON(), secret };
    delete json.secretHash;

    console.log(json);
    process.exit();
}

main();
