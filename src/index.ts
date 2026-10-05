import dotenv from 'dotenv';

import { StateService } from './application/state-service.js';
import { Config } from './config/config.js';
import type { LockStore } from './domain/ports/lock-store.js';
import { HttpApp } from './http/index.js';
import { BlobStateStore } from './infrastructure/blob-state-store.js';
import { InMemoryLockStore } from './infrastructure/in-memory-lock-store.js';
import { RedisLockStore } from './infrastructure/redis-lock-store.js';

/*
 * Build the lock store for the configured backend. Only the 'redis' backend
 * constructs a Redis client; 'memory' keeps locks in-process so the service can
 * run standalone (e.g. the non-Redis image or CI) without reaching out to
 * redis://localhost:6379.
 */
const createLockStore = (config: Config): LockStore => {
    if (config.env.lock.LOCK_BACKEND === 'redis') {
        return new RedisLockStore(config.env.redis);
    }

    return new InMemoryLockStore();
};

const main = (): void => {
    dotenv.config();
    const config = new Config();

    const stateStore = new BlobStateStore(config.env.blob.BLOB_READ_WRITE_TOKEN);
    const lockStore = createLockStore(config);
    const stateService = new StateService(stateStore, lockStore);

    const httpApp = new HttpApp(config.env.http, stateService, config.env.auth.AUTH_PASSWORD);
    httpApp.run();
};

main();
