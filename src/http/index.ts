import { serve } from '@hono/node-server';
import { swaggerUI } from '@hono/swagger-ui';
import { Hono } from 'hono';
import { openAPIRouteHandler } from 'hono-openapi';
import { basicAuth } from 'hono/basic-auth';
import { logger } from 'hono/logger';

import type { StateService } from '../application/state-service.js';
import { createStateRouter } from './state/index.js';

interface HttpConfig {
    APP_VERSION: string;
    HTTP_HOST: string;
    HTTP_PORT: number;
    HTTP_SERVER_DESCRIPTION: string;
    HTTP_SERVER_NAME: string;
}

class HttpApp {
    private app: Hono;
    private config: HttpConfig;

    constructor(config: HttpConfig, stateService: StateService, authPassword: string) {
        this.app = new Hono();
        this.config = config;

        this.app.use(logger());
        this.app.get('/health', (context) => context.json({ status: 'ok' }));

        this.app.use(
            '/state/*',
            basicAuth({
                verifyUser: (_username, password) => password === authPassword,
            }),
        );

        this.app.route('/state', createStateRouter(stateService));
        this.app.get(
            '/openapi',
            openAPIRouteHandler(this.app, {
                documentation: {
                    info: {
                        description: this.config.HTTP_SERVER_DESCRIPTION,
                        title: this.config.HTTP_SERVER_NAME,
                        version: this.config.APP_VERSION,
                    },
                    servers: [
                        {
                            description: 'Local Server',
                            url: `http://${this.config.HTTP_HOST}:${this.config.HTTP_PORT}`,
                        },
                        {
                            description: 'Local Server - localhost',
                            url: `http://localhost:${this.config.HTTP_PORT}`,
                        },
                    ],
                },
            }),
        );
        if (this.config.APP_VERSION === "dev") {
            this.app.get('/ui', swaggerUI({ url: '/openapi' }));
        }
    }

    run(): void {
        serve({
            fetch: this.app.fetch,
            hostname: this.config.HTTP_HOST,
            port: this.config.HTTP_PORT,
        });
    }
}

export { HttpApp };
export type { HttpConfig };
