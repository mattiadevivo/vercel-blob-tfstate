// oxlint-disable init-declarations
import { beforeEach, describe, expect, test } from 'vitest';

import type { LockInfo } from '../../../src/domain/lock-info.js';
import { InMemoryLockStore } from '../../../src/infrastructure/in-memory-lock-store.js';

describe('InMemoryLockStore', () => {
    let store: InMemoryLockStore;

    const lockInfo: LockInfo = {
        Created: new Date(2026, 0, 1).toISOString(),
        ID: '2f24ea68-4098-9379-13b6-a2fb3ff0d76e',
        Info: '',
        Operation: 'OperationTypeApply',
        Path: '',
        Version: '1.13.3',
        Who: 'testrunner',
    };

    beforeEach(() => {
        store = new InMemoryLockStore();
    });

    describe('get', () => {
        test('should return null when no lock is held', async () => {
            expect(await store.get('test')).toBeNull();
        });

        test('should return the held lock info', async () => {
            await store.tryAcquire('test', lockInfo);

            expect(await store.get('test')).toEqual(lockInfo);
        });
    });

    describe('tryAcquire', () => {
        test('should acquire the lock and return null when free', async () => {
            expect(await store.tryAcquire('test', lockInfo)).toBeNull();
        });

        test('should return the existing lock when already held', async () => {
            const existingLock: LockInfo = { ...lockInfo, ID: 'different-lock-id' };
            await store.tryAcquire('test', existingLock);

            expect(await store.tryAcquire('test', lockInfo)).toEqual(existingLock);
        });

        test('should scope locks per name', async () => {
            await store.tryAcquire('a', lockInfo);

            expect(await store.tryAcquire('b', lockInfo)).toBeNull();
        });
    });

    describe('delete', () => {
        test('should release the lock so it can be re-acquired', async () => {
            await store.tryAcquire('test', lockInfo);
            await store.delete('test');

            expect(await store.get('test')).toBeNull();
            expect(await store.tryAcquire('test', lockInfo)).toBeNull();
        });

        test('should be a no-op when no lock is held', async () => {
            await expect(store.delete('test')).resolves.toBeUndefined();
        });
    });
});
