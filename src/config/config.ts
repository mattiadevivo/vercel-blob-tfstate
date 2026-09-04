import { z } from 'zod';

const EnvSchema = z.object({
    APP_VERSION: z.string().default('dev'),
    AUTH_PASSWORD: z.string().default(''),
    BLOB_READ_WRITE_TOKEN: z.string(),
    HTTP_HOST: z.string().default('0.0.0.0'),
    HTTP_PORT: z.coerce.number().default(3000),
    HTTP_SERVER_DESCRIPTION: z
        .string()
        .default('HTTP Server used to host Terraform/OpentTofu storage backend for state'),
    HTTP_SERVER_NAME: z.string().default('Vercel Blob Tfstate API'),
    REDIS_LOCK_ACQUIRE_ATTEMPTS: z.coerce.number().int().positive().default(3),
    REDIS_URL: z.string().default('redis://localhost:6379'),
});

const ConfigSchema = z.object({
    auth: EnvSchema.pick({ AUTH_PASSWORD: true }),
    blob: EnvSchema.pick({ BLOB_READ_WRITE_TOKEN: true }),
    http: EnvSchema.pick({
        APP_VERSION: true,
        HTTP_HOST: true,
        HTTP_PORT: true,
        HTTP_SERVER_DESCRIPTION: true,
        HTTP_SERVER_NAME: true,
    }),
    redis: EnvSchema.pick({ REDIS_LOCK_ACQUIRE_ATTEMPTS: true, REDIS_URL: true }),
});

class Config {
    env: z.infer<typeof ConfigSchema>;

    constructor() {
        const env = EnvSchema.parse(process.env);
        this.env = {
            auth: {
                AUTH_PASSWORD: env.AUTH_PASSWORD,
            },
            blob: {
                BLOB_READ_WRITE_TOKEN: env.BLOB_READ_WRITE_TOKEN,
            },
            http: {
                APP_VERSION: env.APP_VERSION,
                HTTP_HOST: env.HTTP_HOST,
                HTTP_PORT: env.HTTP_PORT,
                HTTP_SERVER_DESCRIPTION: env.HTTP_SERVER_DESCRIPTION,
                HTTP_SERVER_NAME: env.HTTP_SERVER_NAME,
            },
            redis: {
                REDIS_LOCK_ACQUIRE_ATTEMPTS: env.REDIS_LOCK_ACQUIRE_ATTEMPTS,
                REDIS_URL: env.REDIS_URL,
            },
        };
    }
}

export { Config };
