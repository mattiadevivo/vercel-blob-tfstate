// oxlint-disable init-declarations
import type { Hono } from 'hono';
import { type Mocked, beforeEach, describe, expect, test, vi } from 'vitest';

import type { StateService } from '../../../../src/application/state-service';
import {
    LockConflictError,
    LockMismatchError,
    StateNotFoundError,
} from '../../../../src/domain/errors';
import type { LockInfo } from '../../../../src/domain/lock-info';
import { createStateRouter } from '../../../../src/http/state/index';

describe('createStateRouter', () => {
    let router: Hono;
    let stateServiceMock: Mocked<StateService>;

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
        stateServiceMock = {
            acquireLock: vi.fn(),
            deleteState: vi.fn(),
            getState: vi.fn(),
            releaseLock: vi.fn(),
            updateState: vi.fn(),
        } as unknown as Mocked<StateService>;
        router = createStateRouter(stateServiceMock);
    });

    describe('POST /:name/lock', () => {
        test('should acquire the lock and return 200', async () => {
            const response = await router.request('/test/lock', {
                body: JSON.stringify(lockInfo),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            });

            expect(response.status).toBe(200);
            expect(stateServiceMock.acquireLock).toHaveBeenCalledOnce();
            expect(stateServiceMock.acquireLock).toHaveBeenCalledWith('test', lockInfo);
        });

        test('should return 409 with the existing lock on conflict', async () => {
            const existingLock: LockInfo = { ...lockInfo, ID: 'different-lock-id' };
            stateServiceMock.acquireLock.mockRejectedValue(new LockConflictError(existingLock));

            const response = await router.request('/test/lock', {
                body: JSON.stringify(lockInfo),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            });

            expect(response.status).toBe(409);
            expect(await response.json()).toEqual(existingLock);
        });

        test('should return 400 when the lock body is invalid', async () => {
            const response = await router.request('/test/lock', {
                body: JSON.stringify({ Operation: 'OperationTypeApply' }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            });

            expect(response.status).toBe(400);
            expect(stateServiceMock.acquireLock).not.toHaveBeenCalled();
        });
    });

    describe('DELETE /:name/lock', () => {
        test('should release the lock and return 200', async () => {
            const response = await router.request('/test/lock', {
                body: JSON.stringify(lockInfo),
                method: 'DELETE',
            });

            expect(response.status).toBe(200);
            expect(stateServiceMock.releaseLock).toHaveBeenCalledOnce();
            expect(stateServiceMock.releaseLock).toHaveBeenCalledWith('test', lockInfo);
        });

        test('should force release the lock when the body is empty', async () => {
            const response = await router.request('/test/lock', { method: 'DELETE' });

            expect(response.status).toBe(200);
            expect(stateServiceMock.releaseLock).toHaveBeenCalledOnce();
            expect(stateServiceMock.releaseLock).toHaveBeenCalledWith('test', null);
        });

        test('should return 409 with the existing lock on mismatch', async () => {
            const existingLock: LockInfo = { ...lockInfo, ID: 'different-lock-id' };
            stateServiceMock.releaseLock.mockRejectedValue(new LockMismatchError(existingLock));

            const response = await router.request('/test/lock', {
                body: JSON.stringify(lockInfo),
                method: 'DELETE',
            });

            expect(response.status).toBe(409);
            expect(await response.json()).toEqual(existingLock);
        });
    });

    describe('GET /:name', () => {
        test('should return the state as JSON', async () => {
            const state = JSON.stringify({ serial: 1, version: 4 });
            stateServiceMock.getState.mockResolvedValue(state);

            const response = await router.request('/test');

            expect(response.status).toBe(200);
            expect(response.headers.get('Content-Type')).toBe('application/json');
            expect(await response.text()).toEqual(state);
            expect(stateServiceMock.getState).toHaveBeenCalledOnce();
            expect(stateServiceMock.getState).toHaveBeenCalledWith('test');
        });

        test('should return 404 when the state does not exist', async () => {
            stateServiceMock.getState.mockRejectedValue(new StateNotFoundError('test'));

            const response = await router.request('/test');

            expect(response.status).toBe(404);
        });
    });

    describe.each(['POST', 'PUT'])('%s /:name', (method) => {
        test('should update the state and return 200', async () => {
            const response = await router.request('/test?ID=lock-id', {
                body: 'new state',
                method,
            });

            expect(response.status).toBe(200);
            expect(stateServiceMock.updateState).toHaveBeenCalledOnce();
            expect(stateServiceMock.updateState).toHaveBeenCalledWith(
                'test',
                'new state',
                'lock-id',
            );
        });

        test('should update the state without a lock ID', async () => {
            const response = await router.request('/test', {
                body: 'new state',
                method,
            });

            expect(response.status).toBe(200);
            expect(stateServiceMock.updateState).toHaveBeenCalledOnce();
            expect(stateServiceMock.updateState).toHaveBeenCalledWith(
                'test',
                'new state',
                // oxlint-disable-next-line no-undefined
                undefined,
            );
        });

        test('should return 409 with the existing lock on mismatch', async () => {
            const existingLock: LockInfo = { ...lockInfo, ID: 'different-lock-id' };
            stateServiceMock.updateState.mockRejectedValue(new LockMismatchError(existingLock));

            const response = await router.request('/test?ID=lock-id', {
                body: 'new state',
                method,
            });

            expect(response.status).toBe(409);
            expect(await response.json()).toEqual(existingLock);
        });
    });

    describe('DELETE /:name', () => {
        test('should delete the state and return 200', async () => {
            const response = await router.request('/test', { method: 'DELETE' });

            expect(response.status).toBe(200);
            expect(stateServiceMock.deleteState).toHaveBeenCalledOnce();
            expect(stateServiceMock.deleteState).toHaveBeenCalledWith('test');
        });
    });
});
