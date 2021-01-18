import * as yargs from 'yargs';
import { v4 as uuidv4 } from 'uuid';
import './lib/config';
import { NODE_ENV } from './config/env';
import OauthClient from './models/OauthClient';

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

    if (NODE_ENV === 'production' && webhookUri !== null && !webhookUri.startsWith('https:')) {
        throw new Error(`Only HTTPS webhook URIs are allowed in production!`);
    }

    const client = await OauthClient.create({
        id: uuidv4(),
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
