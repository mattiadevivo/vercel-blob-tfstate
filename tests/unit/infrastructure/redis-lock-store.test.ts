// oxlint-disable init-declarations
import { Redis } from 'ioredis';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { LockInfo } from '../../../src/domain/lock-info.js';
import { RedisLockStore } from '../../../src/infrastructure/redis-lock-store.js';

vi.mock('ioredis', () => {
    const RedisMock = vi.fn();
    RedisMock.prototype.del = vi.fn();
    RedisMock.prototype.get = vi.fn();
    RedisMock.prototype.set = vi.fn();
    return { Redis: RedisMock };
});

describe('RedisLockStore', () => {
    let store: RedisLockStore;

    const config = {
        REDIS_LOCK_ACQUIRE_ATTEMPTS: 3,
        REDIS_URL: 'redis://localhost:6379',
    };

    const lockInfo: LockInfo = {
        Created: new Date(2026, 0, 1).toISOString(),
        ID: '2f24ea68-4098-9379-13b6-a2fb3ff0d76e',
        Info: '',
        Operation: 'OperationTypeApply',
        Path: '',
        Version: '1.13.3',
        Who: 'testrunner',
    };

    const delMock = vi.mocked(Redis.prototype.del);
    const getMock = vi.mocked(Redis.prototype.get);
    const setMock = vi.mocked(Redis.prototype.set);

    beforeEach(() => {
        vi.clearAllMocks();
        store = new RedisLockStore(config);
    });

    describe('delete', () => {
        test('should delete the lock key', async () => {
            await store.delete('test');

            expect(delMock).toHaveBeenCalledOnce();
            expect(delMock).toHaveBeenCalledWith('tfstate:lock:test');
        });
    });

    describe('get', () => {
        test('should return the parsed lock info', async () => {
            getMock.mockResolvedValue(JSON.stringify(lockInfo));

            const result = await store.get('test');

            expect(result).toEqual(lockInfo);
            expect(getMock).toHaveBeenCalledOnce();
            expect(getMock).toHaveBeenCalledWith('tfstate:lock:test');
        });

        test('should return null when no lock is held', async () => {
            getMock.mockResolvedValue(null);

            const result = await store.get('test');

            expect(result).toBeNull();
        });
    });

    describe('tryAcquire', () => {
        test('should acquire the lock and return null when the key is free', async () => {
            setMock.mockResolvedValue('OK');

            const result = await store.tryAcquire('test', lockInfo);

            expect(result).toBeNull();
            expect(setMock).toHaveBeenCalledOnce();
            expect(setMock).toHaveBeenCalledWith(
                'tfstate:lock:test',
                JSON.stringify(lockInfo),
                'NX',
            );
            expect(getMock).not.toHaveBeenCalled();
        });

        test('should return the existing lock when the key is already held', async () => {
            const existingLock: LockInfo = { ...lockInfo, ID: 'different-lock-id' };
            setMock.mockResolvedValue(null);
            getMock.mockResolvedValue(JSON.stringify(existingLock));

            const result = await store.tryAcquire('test', lockInfo);

            expect(result).toEqual(existingLock);
            expect(setMock).toHaveBeenCalledOnce();
            expect(getMock).toHaveBeenCalledOnce();
            expect(getMock).toHaveBeenCalledWith('tfstate:lock:test');
        });

        test('should retry when the lock is released between SET NX and GET', async () => {
            setMock.mockResolvedValueOnce(null).mockResolvedValueOnce('OK');
            getMock.mockResolvedValue(null);

            const result = await store.tryAcquire('test', lockInfo);

            expect(result).toBeNull();
            expect(setMock).toHaveBeenCalledTimes(2);
            expect(getMock).toHaveBeenCalledOnce();
        });

        test('should throw after exhausting the configured attempts', async () => {
            setMock.mockResolvedValue(null);
            getMock.mockResolvedValue(null);

            await expect(store.tryAcquire('test', lockInfo)).rejects.toThrow(
                'Failed to acquire or inspect lock "test" after 3 attempts',
            );

            expect(setMock).toHaveBeenCalledTimes(3);
            expect(getMock).toHaveBeenCalledTimes(3);
        });
    });
});
