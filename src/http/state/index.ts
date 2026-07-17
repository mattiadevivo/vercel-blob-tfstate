import { Hono } from 'hono';

import type { StateService } from '../../application/state-service.js';
import { LockConflictError, LockMismatchError, StateNotFoundError } from '../../domain/errors.js';
import { type LockInfo, LockInfoSchema } from '../../domain/lock-info.js';
import { jsonBodyValidator, pathParamsValidator, queryParamsValidator } from '../validators/req.js';
import { LockIdSchema, NameSchema } from '../validators/schemas.js';
import { parseLockBody } from './utils.js';

const createStateRouter = (stateService: StateService): Hono => {
    const router = new Hono();

    router.post(
        '/:name/lock',
        pathParamsValidator(NameSchema),
        jsonBodyValidator(LockInfoSchema),
        async (context) => {
            const pathParams = context.req.valid('param');
            const body = context.req.valid('json');

            const { name } = pathParams;

            try {
                await stateService.acquireLock(name, body);
                return context.body(null, 200);
            } catch (error) {
                if (error instanceof LockConflictError) {
                    return context.json(error.existingLock, 409);
                }
                throw error;
            }
        },
    );

    // oxlint-disable-next-line max-statements
    router.delete('/:name/lock', pathParamsValidator(NameSchema), async (context) => {
        const pathParams = context.req.valid('param');
        const { name } = pathParams;
        const body = await context.req.text();
        // oxlint-disable-next-line no-ternary
        const lockInfo: LockInfo | null = body.length === 0 ? null : parseLockBody(body);

        try {
            await stateService.releaseLock(name, lockInfo);
            return context.body(null, 200);
        } catch (error) {
            if (error instanceof LockMismatchError) {
                return context.json(error.existingLock, 409);
            }
            throw error;
        }
    });

    router.get('/:name', pathParamsValidator(NameSchema), async (context) => {
        const pathParams = context.req.valid('param');
        const { name } = pathParams;

        try {
            const state = await stateService.getState(name);
            return context.body(state, 200, { 'Content-Type': 'application/json' });
        } catch (error) {
            if (error instanceof StateNotFoundError) {
                return context.body(null, 404);
            }
            throw error;
        }
    });

    // Terraform's update_method defaults to POST but is user-configurable; support PUT too.
    router.on(
        ['POST', 'PUT'],
        '/:name',
        pathParamsValidator(NameSchema),
        queryParamsValidator(LockIdSchema),
        async (context) => {
            const { name } = context.req.valid('param');
            const { ID: lockId } = context.req.valid('query');
            const body = await context.req.text();

            try {
                await stateService.updateState(name, body, lockId);
                return context.body(null, 200);
            } catch (error) {
                if (error instanceof LockMismatchError) {
                    return context.json(error.existingLock, 409);
                }
                throw error;
            }
        },
    );

    router.delete('/:name', pathParamsValidator(NameSchema), async (context) => {
        const pathParams = context.req.valid('param');
        const { name } = pathParams;
        await stateService.deleteState(name);
        return context.body(null, 200);
    });

    return router;
};

export { createStateRouter };
