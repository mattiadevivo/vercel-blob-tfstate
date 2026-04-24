import { z } from 'zod';

const LockInfoSchema = z.object({
    ID: z.uuid(),
    Operation: z.enum(['OperationTypePlan', 'OperationTypeApply', 'OperationTypeDestroy']),
});

type LockInfo = z.infer<typeof LockInfoSchema>;

export type { LockInfo };
export { LockInfoSchema };
