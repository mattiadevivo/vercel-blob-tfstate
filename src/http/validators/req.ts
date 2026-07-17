import { zValidator } from '@hono/zod-validator';
import type { z } from 'zod';

const pathParamsValidator = <Schema extends z.ZodObject<z.ZodRawShape>>(object: Schema) =>
    zValidator('param', object);
const queryParamsValidator = <Schema extends z.ZodObject<z.ZodRawShape>>(object: Schema) =>
    zValidator('query', object);
const jsonBodyValidator = <Schema extends z.ZodObject<z.ZodRawShape>>(object: Schema) =>
    zValidator('json', object);

export { pathParamsValidator, queryParamsValidator, jsonBodyValidator };
