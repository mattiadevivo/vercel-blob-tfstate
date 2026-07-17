import { LockConflictError, LockMismatchError, StateNotFoundError } from '../domain/errors.js';
import type { LockInfo } from '../domain/lock-info.js';
import type { LockStore } from '../domain/ports/lock-store.js';
import type { StateStore } from '../domain/ports/state-store.js';
import type { State } from '../domain/state.js';

class StateService {
    private lockStore: LockStore;
    private stateStore: StateStore;

    constructor(stateStore: StateStore, lockStore: LockStore) {
        this.lockStore = lockStore;
        this.stateStore = stateStore;
    }

    async acquireLock(name: string, lockInfo: LockInfo): Promise<void> {
        const existingLock = await this.lockStore.tryAcquire(name, lockInfo);

        // Re-acquiring a lock we already hold (same ID) is a no-op.
        if (existingLock && existingLock.ID !== lockInfo.ID) {
            throw new LockConflictError(existingLock);
        }
    }

    async deleteState(name: string): Promise<void> {
        await this.stateStore.delete(name);
    }

    async getState(name: string): Promise<State> {
        const state = await this.stateStore.get(name);
        console.log('StateService.getState', { name, state });

        if (state === null) {
            throw new StateNotFoundError(name);
        }

        return state;
    }

    // LockInfo is optional: when undefined, the lock is deleted unconditionally (force-unlock).
    async releaseLock(name: string, lockInfo: LockInfo | null): Promise<void> {
        if (lockInfo === null) {
            // Force unlock
            await this.lockStore.delete(name);
            return;
        }

        const existing = await this.lockStore.get(name);

        if (!existing) {
            return;
        }

        if (existing.ID !== lockInfo.ID) {
            throw new LockMismatchError(existing);
        }

        await this.lockStore.delete(name);
    }

    // LockId is optional: absent when the backend is configured without locking.
    async updateState(name: string, state: State, lockId?: LockInfo['ID']): Promise<void> {
        if (lockId) {
            const existing = await this.lockStore.get(name);

            if (existing && existing.ID !== lockId) {
                throw new LockMismatchError(existing);
            }
        }

        await this.stateStore.put(name, state);
    }
}

export { StateService };
