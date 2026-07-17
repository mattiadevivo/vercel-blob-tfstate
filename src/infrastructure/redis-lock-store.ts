import { Redis } from 'ioredis';

import type { LockInfo } from '../domain/lock-info.js';
import type { LockStore } from '../domain/ports/lock-store.js';

interface RedisConfig {
    REDIS_LOCK_ACQUIRE_ATTEMPTS: number;
    REDIS_URL: string;
}

class RedisLockStore implements LockStore {
    private maxAcquireAttempts: number;
    private redis: Redis;

    constructor(config: RedisConfig) {
        this.maxAcquireAttempts = config.REDIS_LOCK_ACQUIRE_ATTEMPTS;
        this.redis = new Redis(config.REDIS_URL);
    }

    async delete(name: string): Promise<void> {
        await this.redis.del(this.lockKey(name));
    }

    async get(name: string): Promise<LockInfo | null> {
        const data = await this.redis.get(this.lockKey(name));

        if (!data) {
            return null;
        }

        return JSON.parse(data) as LockInfo;
    }

    async tryAcquire(name: string, lockInfo: LockInfo): Promise<LockInfo | null> {
        const key = this.lockKey(name);
        const value = JSON.stringify(lockInfo);

        /*
         * A failed SET NX followed by an empty GET means the holder released
         * the lock in between; retry. Hitting the attempt limit means Redis is
         * misbehaving, not lock contention.
         */
        for (let attempt = 0; attempt < this.maxAcquireAttempts; attempt++) {
            // oxlint-disable-next-line no-await-in-loop
            const result = await this.redis.set(key, value, 'NX');

            if (result === 'OK') {
                return null;
            }

            // oxlint-disable-next-line no-await-in-loop
            const existing = await this.redis.get(key);

            if (existing) {
                return JSON.parse(existing) as LockInfo;
            }
        }

        throw new Error(
            `Failed to acquire or inspect lock "${name}" after ${this.maxAcquireAttempts} attempts`,
        );
    }

    private lockKey(name: string): string {
        return `tfstate:lock:${name}`;
    }
}

export { RedisLockStore };
export type { RedisConfig };
