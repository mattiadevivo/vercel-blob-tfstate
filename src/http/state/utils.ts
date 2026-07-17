import { type LockInfo, LockInfoSchema } from '../../domain/lock-info.js';

export const parseLockBody = (body: string): LockInfo => LockInfoSchema.parse(JSON.parse(body));
