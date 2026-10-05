import type { LockInfo } from '../domain/lock-info.js';
import type { LockStore } from '../domain/ports/lock-store.js';

/**
 * In-process lock store used when no external lock backend (Redis) is
 * configured. It is suitable for single-instance deployments: locks live in the
 * process memory and are lost on restart. Because Node.js runs a single thread
 * and there is no `await` between reading and writing the map, `tryAcquire` is
 * atomic without the retry loop the Redis implementation needs.
 */
class InMemoryLockStore implements LockStore {
    private locks = new Map<string, LockInfo>();

    delete(name: string): Promise<void> {
        this.locks.delete(this.lockKey(name));
        return Promise.resolve();
    }

    get(name: string): Promise<LockInfo | null> {
        return Promise.resolve(this.locks.get(this.lockKey(name)) ?? null);
    }

    tryAcquire(name: string, lockInfo: LockInfo): Promise<LockInfo | null> {
        const key = this.lockKey(name);
        const existing = this.locks.get(key);

        if (existing) {
            return Promise.resolve(existing);
        }

        this.locks.set(key, lockInfo);
        return Promise.resolve(null);
    }

    private lockKey(name: string): string {
        return `tfstate:lock:${name}`;
    }
}

export { InMemoryLockStore };
