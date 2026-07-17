import { z } from 'zod';

const LockInfoSchema = z.object({
    Created: z.string().optional(),
    ID: z.string().min(1),
    Info: z.string().optional(),
    Operation: z.string(),
    Path: z.string().optional(),
    Version: z.string().optional(),
    Who: z.string().optional(),
});

type LockInfo = z.infer<typeof LockInfoSchema>;

export type { LockInfo };
export { LockInfoSchema };
