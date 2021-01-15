import 'source-map-support/register';
import * as http from 'http';
import * as net from 'net';
import express from 'express';
import routes from './routes';
import { PORT } from './config/env';
import {
    InsufficientScopeError, OAuthError, UnauthorizedClientError, AccessDeniedError,
    UnauthorizedRequestError, InvalidArgumentError, InvalidRequestError, InvalidScopeError,
    UnsupportedGrantTypeError, UnsupportedResponseTypeError, InvalidTokenError,
    InvalidClientError, InvalidGrantError
} from 'oauth2-server';
import { HttpError } from './errors';

const app = express();
const server = http.createServer(app)

// track connections for graceful shutdown
const connections = new Set<net.Socket>();

server.on('connection', connection => {
    connections.add(connection);
    connection.on('close', () => {
        connections.delete(connection);
        if (connections.size === 0 && !server.listening) {
            afterAllConnectionsShutdown();
        }
    });
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

app.use('/', routes);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
        return next(err);
    }

    if (err instanceof HttpError) {
        switch (err.status) {
            case 403:
            case 404:
                // don't log a stack trace for these errors
                // TODO: refine logging strategy
                break;

            default:
                console.error(err.stack ?? `${err.name}: ${err.message}`);
        }
        return res.status(err.status).json(err.toJSON());
    }

    if (err instanceof OAuthError) {
        console.error(err);

        if (err instanceof AccessDeniedError ||
            err instanceof InsufficientScopeError ||
            err instanceof UnauthorizedClientError ||
            err instanceof UnauthorizedRequestError) {
            return res.status(403).json({
                error: 'forbidden',
                error_description: err.message,
            });
        }

        if (err instanceof InvalidArgumentError ||
            err instanceof InvalidRequestError ||
            err instanceof InvalidScopeError ||
            err instanceof InvalidTokenError ||
            err instanceof InvalidGrantError ||
            err instanceof InvalidClientError ||
            err instanceof UnsupportedGrantTypeError ||
            err instanceof UnsupportedResponseTypeError) {
            return res.status(401).json({
                error: 'validation_failed',
                error_description: err.message,
            });
        }
    }

    console.error(err.stack ?? `${err.name}: ${err.message}`);
    return res.status(500).json({
        error: 'internal_error',
        error_description: 'Internal Server Error',
    });
});

main();

async function main() {
    console.info(`Starting API server (PID: ${process.pid})...`);
    try {
        server.listen(PORT, () => {
            console.info(`REST API is now listening on port ${PORT}!`);
        });
    } catch(err) {
        console.error(err);
        await afterAllConnectionsShutdown();
        process.exit(1);
    }
}

async function afterAllConnectionsShutdown() {
    console.info('After all connections shutdown handler...');

    // TODO
}

function shutdown(signal: string) {
    if (server.listening) {
        console.info(`Received ${signal}, shutting down HTTP server...`);
        server.close(err => {
            if (err) {
                console.error('Error shutting down HTTP server:');
                console.error(err);
            } else {
                console.info('HTTP server is shut down');
            }

            if (connections.size === 0) {
                afterAllConnectionsShutdown();
            }
        });
    }
}
