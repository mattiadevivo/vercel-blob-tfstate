import { Hono } from 'hono';
import { app as stateRouter } from './state/index.js';
import { serve } from '@hono/node-server';
import type { Config } from '../config/config.js';

type HttpConfig = Config["env"]["http"];

class HttpApp {
  app: Hono;
  config: HttpConfig;

  constructor(config: HttpConfig) {
    this.app = new Hono();
    this.config = config;
    this.app.route("/state", stateRouter);
  }

  run() {
    serve({
      fetch: this.app.fetch,
      hostname: this.config.HTTP_HOST,
      port: this.config.HTTP_PORT,
    });
  }


}

export { HttpApp };
