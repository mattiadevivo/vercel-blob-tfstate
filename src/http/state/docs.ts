import { describeRoute, resolver } from 'hono-openapi';
import type { z } from 'zod';

import { EmptyResponseSchema, HeldLockResponseSchema, StateDocumentSchema } from './schemas.js';

const jsonResponse = (schema: z.ZodType, description: string) => ({
    content: {
        'application/json': {
            schema: resolver(schema),
        },
    },
    description,
});

const acquireLockDocs = describeRoute({
    description: 'Acquire the lock for a state',
    responses: {
        200: jsonResponse(EmptyResponseSchema, 'Lock acquired'),
        409: jsonResponse(HeldLockResponseSchema, 'Lock already held by another operation'),
    },
});

const releaseLockDocs = describeRoute({
    description: 'Release the lock for a state. An empty body force-unlocks.',
    responses: {
        200: jsonResponse(EmptyResponseSchema, 'Lock released'),
        409: jsonResponse(HeldLockResponseSchema, 'Lock held by a different operation'),
    },
});

// A 200 returns the raw state document (use StateDocumentSchema from ./schemas.js).
// A 404 returns an empty body when the state does not exist.
const getStateDocs = describeRoute({
    description: 'Get the current state document',
    responses: {
        200: jsonResponse(StateDocumentSchema, 'State document'),
        404: jsonResponse(EmptyResponseSchema, 'State does not exist'),
    },
});

const updateStateDocs = describeRoute({
    description: 'Create or update the state document',
    // The requestBody field only accepts plain OpenAPI schema objects.
    // Resolver() output is supported in responses only, so this mirrors StateDocumentSchema.
    requestBody: {
        content: {
            'application/json': {
                schema: {},
            },
        },
        description: 'Raw Terraform state document, stored verbatim',
    },
    responses: {
        200: jsonResponse(EmptyResponseSchema, 'State stored'),
        409: jsonResponse(HeldLockResponseSchema, 'Lock held by a different operation'),
    },
});

const deleteStateDocs = describeRoute({
    description: 'Delete the state document',
    responses: {
        200: jsonResponse(EmptyResponseSchema, 'State deleted'),
    },
});

export { acquireLockDocs, deleteStateDocs, getStateDocs, releaseLockDocs, updateStateDocs };
