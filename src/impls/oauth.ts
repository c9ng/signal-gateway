import OauthToken from '../models/OauthToken';
import OauthAuthorizationCode from '../models/OauthAuthorizationCode';
import OauthClient, { SCOPES } from '../models/OauthClient';
import { WhereOptions } from 'sequelize/types';

// we don't have any users, only clients, so all functions invloving users aren't going to be implemented!
interface User {}

const NULL_USER: User = {};

interface Client {
    id: string;
    grants: string|string[];
}

export async function getAccessToken(accessToken: string): Promise<{
    accessToken: string;
    accessTokenExpiresAt?: Date;
    scope?: string|string[];
    client: Client;
    user: User;
}|null> {
    const token = await OauthToken.findOne({
        where: { accessToken }
    });
    if (!token) {
        return null;
    }
    return {
        accessToken: token.accessToken,
        accessTokenExpiresAt: token.accessTokenExpiresAt ?? undefined,
        scope: token.scope,
        // XXX: documentation and types don't agree
        client: { id: String(token.clientId) } as Client,
        user: NULL_USER,
    };
}

export async function getRefreshToken(refreshToken: string): Promise<{
    refreshToken: string;
    refreshTokenExpiresAt?: Date;
    scope?: string|string[];
    client: Client;
    user: User;
}|null> {
    const token = await OauthToken.findOne({
        where: { refreshToken }
    });
    if (!token) {
        return null;
    }
    return {
        refreshToken: token.refreshToken as string,
        refreshTokenExpiresAt: token.refreshTokenExpiresAt ?? undefined,
        scope: token.scope,
        client: { id: String(token.clientId) } as Client,
        user: NULL_USER,
    };
}

// This model function is required if the authorization_code grant is used.
// -> so I wouldn't have needed it!
export async function getAuthorizationCode(authorizationCode: string): Promise<{
    authorizationCode: string;
    expiresAt: Date;
    redirectUri: string;
    scope?: string|string[];
    client: Client;
    user: User;
}|null> {
    const code = await OauthAuthorizationCode.findOne({
        where: { code: authorizationCode }
    });
    if (!code) {
        return null;
    }
    return {
        authorizationCode: code.authorizationCode,
        expiresAt: code.expiresAt,
        redirectUri: code.redirectUri,
        scope: code.scope,
        client: { id: String(code.clientId) } as Client,
        user: NULL_USER,
    };
}

export async function getClient(clientId: string, clientSecret: string|null): Promise<{
    id: string;
    redirectUris?: string[];
    grants: string[];
    accessTokenLifetime?: number;
    refreshTokenLifetime?: number;
}|null> {
    const where: WhereOptions = {
        id: clientId,
    };
    const client = await OauthClient.findOne({ where });
    if (!client) {
        return null;
    }
    if (clientSecret !== null && !await client.isSecret(clientSecret)) {
        return null;
    }
    return {
        id: String(client.id),
        redirectUris: client.redirectUris ?? [],
        grants: client.grants,
        accessTokenLifetime: client.accessTokenLifetime ?? undefined,
        refreshTokenLifetime: client.refreshTokenLifetime ?? undefined,
    };
}

export async function getUser(username: string, password: string): Promise<User|null> {
    return null;
}

export async function getUserFromClient(client: Client): Promise<User|null> {
    return client.grants.includes('client_credentials') ? NULL_USER : null;
}

export async function saveToken(token: {
    accessToken: string;
    accessTokenExpiresAt?: Date;
    refreshToken?: string;
    refreshTokenExpiresAt?: Date;
    scope?: string|string[];
}, client: Client, user: User): Promise<{
    accessToken: string;
    accessTokenExpiresAt?: Date;
    refreshToken?: string;
    refreshTokenExpiresAt?: Date;
    scope?: string[];
    client: Client;
    user: User;
}> {
    const scope = !token.scope ? [] :
        Array.isArray(token.scope) ? token.scope :
        token.scope.split(',');

    await OauthToken.create({
        clientId: client.id,
        accessToken: token.accessToken,
        accessTokenExpiresAt: token.accessTokenExpiresAt,
        refreshToken: token.refreshToken ?? null,
        refreshTokenExpiresAt: token.refreshTokenExpiresAt ?? null,
        scope,
    });

    return {
        ...token,
        scope,
        client,
        user,
    };
}

export async function saveAuthorizationCode(code: {
    authorizationCode: string;
    expiresAt: Date;
    redirectUri: string;
    scope?: string|string[];
}, client: Client, user: User): Promise<{
    authorizationCode: string;
    expiresAt: Date;
    redirectUri: string;
    scope?: string[];
    client: Client;
    user: User;
}> {
    const scope = !code.scope ? [] :
        Array.isArray(code.scope) ? code.scope :
        code.scope.split(',');

    await OauthAuthorizationCode.create({
        clientId: client.id,
        authorizationCode: code.authorizationCode,
        expiresAt: code.expiresAt,
        redirectUri: code.redirectUri,
        scope,
    });
    return {
        ...code,
        scope,
        client,
        user,
    };
}

export async function revokeToken(token: {
    refreshToken: string;
    refreshTokenExpiresAt?: Date;
    scope?: string|string[];
    client: Client;
    user: User;
}): Promise<boolean> {
    const count = await OauthToken.destroy({
        where: {
            refreshToken: token.refreshToken,
            clientId: token.client.id,
        }
    });
    return count > 0;
}

export async function revokeAuthorizationCode(code: {
    authorizationCode: string;
    expiresAt: Date;
    redirectUri?: string;
    scope?: string|string[];
    client: Client;
    user: User;
}): Promise<boolean> {
    const count = await OauthAuthorizationCode.destroy({
        where: {
            authorizationCode: code.authorizationCode,
            clientId: code.client.id,
        }
    });
    return count > 0;
}

// TODO: save allowed scopes in client model
export async function validateScope(user: User, client: Client, scope: string|string[]): Promise<string[]|null> {
    const scopes = Array.isArray(scope) ? scope : scope.split(',');
    for (const scope of scopes) {
        if (!SCOPES.has(scope)) {
            return null;
        }
    }

    return scopes;
}

// Invoked during request authentication to check if the provided access token
// was authorized the requested scopes.
// required if scopes are used with OAuth2Server#authenticate().
export async function verifyScope(token: {
    accessToken: string;
    accessTokenExpiresAt?: Date;
    scope?: string|string[];
    client: Client;
    user: User;
}, scope: string|string[]): Promise<boolean> {
    const scopes = Array.isArray(scope) ? scope :
        scope.split(',');

    if (!token.scope) {
        return false;
    }

    const allowedScopes = new Set(Array.isArray(token.scope) ? token.scope : token.scope.split(','));
    for (const scope of scopes) {
        if (!allowedScopes.has(scope)) {
            return false;
        }
    }

    return true;
}
