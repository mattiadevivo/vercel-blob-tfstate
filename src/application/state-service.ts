import { LockConflictError, LockMismatchError, StateNotFoundError } from '../domain/errors.js';
import type { LockInfo } from '../domain/lock-info.js';
import type { LockStore } from '../domain/ports/lock-store.js';
import type { State } from '../domain/state.js';
import type { StateStore } from '../domain/ports/state-store.js';

class StateService {
    private lockStore: LockStore;
    private stateStore: StateStore;

    constructor(stateStore: StateStore, lockStore: LockStore) {
        this.lockStore = lockStore;
        this.stateStore = stateStore;
    }

    async acquireLock(name: string, lockInfo: LockInfo): Promise<void> {
        const existing = await this.lockStore.get(name);

        if (existing) {
            if (existing.ID === lockInfo.ID) {
                return;
            }
            throw new LockConflictError(existing);
        }

        await this.lockStore.put(name, lockInfo);
    }

    async deleteState(name: string): Promise<void> {
        await this.stateStore.delete(name);
    }

    async getState(name: string): Promise<State> {
        const state = await this.stateStore.get(name);
        console.log("StateService.getState", { name, state });

        if (state === undefined) {
            throw new StateNotFoundError(name);
        }

        return state;
    }

    // LockInfo is optional: when undefined, the lock is deleted unconditionally (force-unlock).
    async releaseLock(name: string, lockInfo: LockInfo | undefined): Promise<void> {
        if (lockInfo === undefined) {
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
    async updateState(name: string, state: State, lockId: LockInfo["ID"] | undefined): Promise<void> {
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
