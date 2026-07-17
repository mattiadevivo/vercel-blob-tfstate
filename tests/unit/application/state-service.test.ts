import { readFileSync } from 'node:fs';

// oxlint-disable init-declarations
import { type Mocked, beforeEach, describe, expect, test, vi } from 'vitest';

import { StateService } from '../../../src/application/state-service';
import {
    LockConflictError,
    LockMismatchError,
    StateNotFoundError,
} from '../../../src/domain/errors';
import type { LockInfo } from '../../../src/domain/lock-info';
import type { LockStore } from '../../../src/domain/ports/lock-store';
import type { StateStore } from '../../../src/domain/ports/state-store';

describe('StateService', () => {
    let service: StateService;
    let stateStoreMock: Mocked<StateStore>;
    let lockStoreMock: Mocked<LockStore>;

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
        stateStoreMock = {
            delete: vi.fn(),
            get: vi.fn(),
            put: vi.fn(),
        };
        lockStoreMock = {
            delete: vi.fn(),
            get: vi.fn(),
            tryAcquire: vi.fn(),
        };
        service = new StateService(stateStoreMock, lockStoreMock);
    });

    describe('acquireLock', () => {
        test('should acquire lock successfully', async () => {
            lockStoreMock.tryAcquire.mockResolvedValue(null);

            await service.acquireLock('test', lockInfo);

            expect(lockStoreMock.tryAcquire).toHaveBeenCalledOnce();
            expect(lockStoreMock.tryAcquire).toHaveBeenCalledWith('test', lockInfo);
        });

        test('should succeed if the same lock ID is already held', async () => {
            lockStoreMock.tryAcquire.mockResolvedValue(lockInfo);

            await expect(service.acquireLock('test', lockInfo)).resolves.toBeUndefined();

            expect(lockStoreMock.tryAcquire).toHaveBeenCalledOnce();
            expect(lockStoreMock.tryAcquire).toHaveBeenCalledWith('test', lockInfo);
        });

        test('should raise LockConflictError if lock is already acquired', async () => {
            lockStoreMock.tryAcquire.mockResolvedValue({
                ...lockInfo,
                ID: 'different-lock-id',
            });

            await expect(service.acquireLock('test', lockInfo)).rejects.toThrow(LockConflictError);

            expect(lockStoreMock.tryAcquire).toHaveBeenCalledOnce();
            expect(lockStoreMock.tryAcquire).toHaveBeenCalledWith('test', lockInfo);
        });
    });

    describe('deleteState', () => {
        test('should delete state successfully', async () => {
            await service.deleteState('test');

            expect(stateStoreMock.delete).toHaveBeenCalledOnce();
            expect(stateStoreMock.delete).toHaveBeenCalledWith('test');
        });
    });

    describe('getState', () => {
        test('should get state successfully', async () => {
            const state = readFileSync('tests/unit/application/state.json', 'utf8');
            stateStoreMock.get.mockResolvedValue(state);

            const result = await service.getState('test');

            expect(result).toEqual(state);

            expect(stateStoreMock.get).toHaveBeenCalledOnce();
            expect(stateStoreMock.get).toHaveBeenCalledWith('test');
        });
        test('should raise StateNotFoundError if state is not found', async () => {
            stateStoreMock.get.mockResolvedValue(null);

            await expect(service.getState('test')).rejects.toThrow(StateNotFoundError);

            expect(stateStoreMock.get).toHaveBeenCalledOnce();
            expect(stateStoreMock.get).toHaveBeenCalledWith('test');
        });
    });

    describe('releaseLock', () => {
        test('should release lock successfully', async () => {
            lockStoreMock.get.mockResolvedValue(lockInfo);

            await service.releaseLock('test', lockInfo);

            expect(lockStoreMock.get).toHaveBeenCalledOnce();
            expect(lockStoreMock.get).toHaveBeenCalledWith('test');
            expect(lockStoreMock.delete).toHaveBeenCalledOnce();
            expect(lockStoreMock.delete).toHaveBeenCalledWith('test');
        });
        test('should raise LockMismatchError if lock ID does not match', async () => {
            lockStoreMock.get.mockResolvedValue({
                ...lockInfo,
                ID: 'different-lock-id',
            });

            await expect(service.releaseLock('test', lockInfo)).rejects.toThrow(LockMismatchError);

            expect(lockStoreMock.get).toHaveBeenCalledOnce();
            expect(lockStoreMock.get).toHaveBeenCalledWith('test');
            expect(lockStoreMock.delete).not.toHaveBeenCalled();
        });
        test('should force release lock if lockInfo is undefined', async () => {
            await service.releaseLock('test', null);

            expect(lockStoreMock.get).not.toHaveBeenCalled();
            expect(lockStoreMock.delete).toHaveBeenCalledOnce();
            expect(lockStoreMock.delete).toHaveBeenCalledWith('test');
        });
    });

    describe('updateState', () => {
        test('should update state successfully without lock', async () => {
            await service.updateState('test', 'new state', null);

            expect(stateStoreMock.put).toHaveBeenCalledOnce();
            expect(stateStoreMock.put).toHaveBeenCalledWith('test', 'new state');
            expect(lockStoreMock.get).not.toHaveBeenCalled();
        });
        test('should update state successfully with lock', async () => {
            lockStoreMock.get.mockResolvedValue(lockInfo);

            await service.updateState('test', 'new state', lockInfo.ID);

            expect(stateStoreMock.put).toHaveBeenCalledOnce();
            expect(stateStoreMock.put).toHaveBeenCalledWith('test', 'new state');
            expect(lockStoreMock.get).toHaveBeenCalledOnce();
            expect(lockStoreMock.get).toHaveBeenCalledWith('test');
        });
        test('should raise LockMismatchError if lock ID does not match', async () => {
            lockStoreMock.get.mockResolvedValue({
                ...lockInfo,
                ID: 'different-lock-id',
            });

            await expect(service.updateState('test', 'new state', lockInfo.ID)).rejects.toThrow(
                LockMismatchError,
            );

            expect(lockStoreMock.get).toHaveBeenCalledOnce();
            expect(lockStoreMock.get).toHaveBeenCalledWith('test');
            expect(stateStoreMock.put).not.toHaveBeenCalled();
        });
    });
});
