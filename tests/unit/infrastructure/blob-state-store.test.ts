// oxlint-disable init-declarations, max-statements
import {
    type GetBlobResult,
    type ListBlobResult,
    del,
    get as getBlob,
    list,
    put,
} from '@vercel/blob';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { BlobStateStore } from '../../../src/infrastructure/blob-state-store';

vi.mock('@vercel/blob', () => ({
    del: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    put: vi.fn(),
}));

describe('BlobStateStore', () => {
    let store: BlobStateStore;

    const token = 'blob-token';
    const state = JSON.stringify({ serial: 1, version: 4 });

    const delMock = vi.mocked(del);
    const getMock = vi.mocked(getBlob);
    const listMock = vi.mocked(list);
    const putMock = vi.mocked(put);

    beforeEach(() => {
        vi.clearAllMocks();
        store = new BlobStateStore(token);
    });

    describe('delete', () => {
        test('should delete all blobs under the state prefix', async () => {
            listMock.mockResolvedValue({
                blobs: [{ url: 'https://blob/one' }, { url: 'https://blob/two' }],
            } as unknown as ListBlobResult);

            await store.delete('test');

            expect(listMock).toHaveBeenCalledOnce();
            expect(listMock).toHaveBeenCalledWith({ prefix: 'tfstate/test/state.json', token });
            expect(delMock).toHaveBeenCalledOnce();
            expect(delMock).toHaveBeenCalledWith(['https://blob/one', 'https://blob/two'], {
                token,
            });
        });

        test('should not call del when no blobs exist', async () => {
            listMock.mockResolvedValue({ blobs: [] } as unknown as ListBlobResult);

            await store.delete('test');

            expect(delMock).not.toHaveBeenCalled();
        });
    });

    describe('get', () => {
        test('should return the state content', async () => {
            getMock.mockResolvedValue({
                statusCode: 200,
                stream: new Response(state).body,
            } as unknown as GetBlobResult);

            const result = await store.get('test');

            expect(result).toEqual(state);
            expect(getMock).toHaveBeenCalledOnce();
            expect(getMock).toHaveBeenCalledWith('tfstate/test/state.json', {
                access: 'private',
                token,
            });
        });

        test('should return null when the blob does not exist', async () => {
            getMock.mockResolvedValue(null);

            const result = await store.get('test');

            expect(result).toBeNull();
        });

        test('should return null when the status code is not 200', async () => {
            getMock.mockResolvedValue({ statusCode: 304 } as unknown as GetBlobResult);

            const result = await store.get('test');

            expect(result).toBeNull();
        });
    });

    describe('put', () => {
        test('should store the state under the state path', async () => {
            await store.put('test', state);

            expect(putMock).toHaveBeenCalledOnce();
            expect(putMock).toHaveBeenCalledWith('tfstate/test/state.json', state, {
                access: 'private',
                addRandomSuffix: false,
                allowOverwrite: true,
                contentType: 'application/json',
                token,
            });
        });
    });
});
