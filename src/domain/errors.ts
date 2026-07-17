import type { LockInfo } from './lock-info.js';

class LockConflictError extends Error {
    existingLock: LockInfo;

    constructor(existingLock: LockInfo) {
        super(`Lock conflict: state is locked by ${existingLock.ID}`);
        this.existingLock = existingLock;
        this.name = 'LockConflictError';
    }
}

class LockMismatchError extends Error {
    existingLock: LockInfo;

    constructor(existingLock: LockInfo) {
        super(`Lock ID mismatch: state is locked by ${existingLock.ID}`);
        this.existingLock = existingLock;
        this.name = 'LockMismatchError';
    }
}

class StateNotFoundError extends Error {
    constructor(name: string) {
        super(`State not found: ${name}`);
        this.name = 'StateNotFoundError';
    }
}

export { LockConflictError, LockMismatchError, StateNotFoundError };
