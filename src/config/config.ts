import { z } from "zod";

const EnvSchema = z.object({
    HTTP_PORT: z.number().default(3000),
    HTTP_HOST: z.string().default("0.0.0.0"),
    BLOB_READ_WRITE_TOKEN: z.string({}),
})

const ConfigSchema = z.object({
    http: EnvSchema.pick({ HTTP_PORT: true, HTTP_HOST: true }),
    blob: EnvSchema.pick({ BLOB_READ_WRITE_TOKEN: true }),
});

class Config {
    env: z.infer<typeof ConfigSchema>;

    constructor() {
        const env = EnvSchema.parse(process.env);
        this.env = {
            http: {
                HTTP_PORT: env.HTTP_PORT,
                HTTP_HOST: env.HTTP_HOST,
            },
            blob: {
                BLOB_READ_WRITE_TOKEN: env.BLOB_READ_WRITE_TOKEN,
            }
        }
    }
}

export { Config };
