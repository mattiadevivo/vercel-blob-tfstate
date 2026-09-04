import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Config } from '../../../src/config/config.js';

describe('Config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { BLOB_READ_WRITE_TOKEN: 'blob-token' };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    test('should apply defaults when optional variables are missing', () => {
        const config = new Config();

        expect(config.env).toEqual({
            auth: { AUTH_PASSWORD: '' },
            blob: { BLOB_READ_WRITE_TOKEN: 'blob-token' },
            http: {
                APP_VERSION: 'dev',
                HTTP_HOST: '0.0.0.0',
                HTTP_PORT: 3000,
                HTTP_SERVER_DESCRIPTION:
                    'HTTP Server used to host Terraform/OpentTofu storage backend for state',
                HTTP_SERVER_NAME: 'Vercel Blob Tfstate API',
            },
            redis: {
                REDIS_LOCK_ACQUIRE_ATTEMPTS: 3,
                REDIS_URL: 'redis://localhost:6379',
            },
        });
    });

    test('should read and coerce values from the environment', () => {
        process.env = {
            APP_VERSION: '1.2.3',
            AUTH_PASSWORD: 'secret',
            BLOB_READ_WRITE_TOKEN: 'blob-token',
            HTTP_HOST: '127.0.0.1',
            HTTP_PORT: '8090',
            HTTP_SERVER_DESCRIPTION: 'Test description',
            HTTP_SERVER_NAME: 'Test API',
            REDIS_LOCK_ACQUIRE_ATTEMPTS: '5',
            REDIS_URL: 'redis://redis:6379',
        };

        const config = new Config();

        expect(config.env).toEqual({
            auth: { AUTH_PASSWORD: 'secret' },
            blob: { BLOB_READ_WRITE_TOKEN: 'blob-token' },
            http: {
                APP_VERSION: '1.2.3',
                HTTP_HOST: '127.0.0.1',
                HTTP_PORT: 8090,
                HTTP_SERVER_DESCRIPTION: 'Test description',
                HTTP_SERVER_NAME: 'Test API',
            },
            redis: {
                REDIS_LOCK_ACQUIRE_ATTEMPTS: 5,
                REDIS_URL: 'redis://redis:6379',
            },
        });
    });

    test('should throw when BLOB_READ_WRITE_TOKEN is missing', () => {
        process.env = {};

        expect(() => new Config()).toThrow();
    });

    test('should throw when REDIS_LOCK_ACQUIRE_ATTEMPTS is not a positive integer', () => {
        process.env.REDIS_LOCK_ACQUIRE_ATTEMPTS = '0';

        expect(() => new Config()).toThrow();
    });
});
