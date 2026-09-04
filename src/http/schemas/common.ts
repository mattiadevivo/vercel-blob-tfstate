import { z } from 'zod';

// Path params shared by every /state route.
const NameParamsSchema = z.object({
    name: z.string(),
});

// Terraform appends ?ID=<lock-id> to state updates when locking is enabled.
const LockIdQuerySchema = z.object({
    ID: z.string().optional(),
});

export { LockIdQuerySchema, NameParamsSchema };
