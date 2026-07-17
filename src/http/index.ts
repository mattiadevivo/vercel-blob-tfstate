import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import { logger } from 'hono/logger';

import type { StateService } from '../application/state-service.js';
import { createStateRouter } from './state/index.js';

interface HttpConfig {
    HTTP_HOST: string;
    HTTP_PORT: number;
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

        const stateRouter = createStateRouter(stateService);
        this.app.route('/state', stateRouter);
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
