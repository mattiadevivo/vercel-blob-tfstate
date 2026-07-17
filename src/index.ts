import dotenv from 'dotenv';

import { StateService } from './application/state-service.js';
import { Config } from './config/config.js';
import { HttpApp } from './http/index.js';
import { BlobStateStore } from './infrastructure/blob-state-store.js';
import { RedisLockStore } from './infrastructure/redis-lock-store.js';
const main = (): void => {
    dotenv.config();
    const config = new Config();

    const stateStore = new BlobStateStore(config.env.blob.BLOB_READ_WRITE_TOKEN);
    const lockStore = new RedisLockStore(config.env.redis);
    const stateService = new StateService(stateStore, lockStore);

    const httpApp = new HttpApp(config.env.http, stateService, config.env.auth.AUTH_PASSWORD);
    httpApp.run();
};

main();
