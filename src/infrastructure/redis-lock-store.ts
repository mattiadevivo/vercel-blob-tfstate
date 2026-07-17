import { Redis } from 'ioredis';

import type { LockInfo } from '../domain/lock-info.js';
import type { LockStore } from '../domain/ports/lock-store.js';

class RedisLockStore implements LockStore {
    private redis: Redis;

    constructor(redisUrl: string) {
        this.redis = new Redis(redisUrl);
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

    async put(name: string, lockInfo: LockInfo): Promise<void> {
        await this.redis.set(this.lockKey(name), JSON.stringify(lockInfo));
    }

    private lockKey(name: string): string {
        return `tfstate:lock:${name}`;
    }
}

export { RedisLockStore };
