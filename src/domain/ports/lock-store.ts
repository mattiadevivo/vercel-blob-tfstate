import type { LockInfo } from '../lock-info.js';

interface LockStore {
    delete(name: string): Promise<void>;
    get(name: string): Promise<LockInfo | null>;
    put(name: string, lockInfo: LockInfo): Promise<void>;
}

export type { LockStore };
