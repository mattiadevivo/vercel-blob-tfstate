import { z } from 'zod';

const EnvSchema = z.object({
    AUTH_PASSWORD: z.string().default(''),
    BLOB_READ_WRITE_TOKEN: z.string(),
    HTTP_HOST: z.string().default('0.0.0.0'),
    HTTP_PORT: z.coerce.number().default(3000),
    REDIS_URL: z.string().default('redis://localhost:6379'),
});

const ConfigSchema = z.object({
    auth: EnvSchema.pick({ AUTH_PASSWORD: true }),
    blob: EnvSchema.pick({ BLOB_READ_WRITE_TOKEN: true }),
    http: EnvSchema.pick({ HTTP_HOST: true, HTTP_PORT: true }),
    redis: EnvSchema.pick({ REDIS_URL: true }),
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
                HTTP_HOST: env.HTTP_HOST,
                HTTP_PORT: env.HTTP_PORT,
            },
            redis: {
                REDIS_URL: env.REDIS_URL,
            },
        };
    }
}

export { Config };
