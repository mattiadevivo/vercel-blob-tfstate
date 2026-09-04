import { z } from 'zod';

import { LockInfoSchema } from '../../domain/lock-info.js';

// Success responses in the Terraform backend protocol have no body.
const EmptyResponseSchema = z.null();

// 409 responses return the lock currently held so Terraform can report who owns it.
const HeldLockResponseSchema = LockInfoSchema;

// The server never inspects the state, it only stores and returns it verbatim.
// Terraform state files are always JSON objects
const StateDocumentSchema = z.record(z.string(), z.unknown());

export { EmptyResponseSchema, HeldLockResponseSchema, StateDocumentSchema };
