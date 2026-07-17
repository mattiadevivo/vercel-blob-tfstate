import { z } from 'zod';

export const NameSchema = z.object({
    name: z.string(),
});

// Terraform appends ?ID=<lock-id> to state updates when locking is enabled.
export const LockIdSchema = z.object({
    ID: z.string().optional(),
});
