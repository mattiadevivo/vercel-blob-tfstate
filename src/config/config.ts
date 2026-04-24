import { z } from 'zod';

const EnvSchema = z.object({
    BLOB_READ_WRITE_TOKEN: z.string({}),
    HTTP_HOST: z.string().default('0.0.0.0'),
    HTTP_PORT: z.number().default(3000),
});

const ConfigSchema = z.object({
    blob: EnvSchema.pick({ BLOB_READ_WRITE_TOKEN: true }),
    http: EnvSchema.pick({ HTTP_HOST: true, HTTP_PORT: true }),
});

class Config {
    env: z.infer<typeof ConfigSchema>;

    constructor() {
        const env = EnvSchema.parse(process.env);
        this.env = {
            blob: {
                BLOB_READ_WRITE_TOKEN: env.BLOB_READ_WRITE_TOKEN,
            },
            http: {
                HTTP_HOST: env.HTTP_HOST,
                HTTP_PORT: env.HTTP_PORT,
            },
        };
    }
}

export { Config };
