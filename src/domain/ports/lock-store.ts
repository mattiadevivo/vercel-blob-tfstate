import type { LockInfo } from '../lock-info.js';

interface LockStore {
    delete(name: string): Promise<void>;
    get(name: string): Promise<LockInfo | null>;
    /**
     * Atomically acquires the lock. Returns null on success, or the currently
     * held lock when someone else already holds it.
     */
    tryAcquire(name: string, lockInfo: LockInfo): Promise<LockInfo | null>;
}

export type { LockStore };
