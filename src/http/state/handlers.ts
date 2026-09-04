import { createFactory } from 'hono/factory';

import type { StateService } from '../../application/state-service.js';
import { LockConflictError, LockMismatchError, StateNotFoundError } from '../../domain/errors.js';
import { type LockInfo, LockInfoSchema } from '../../domain/lock-info.js';
import { LockIdQuerySchema, NameParamsSchema } from '../schemas/common.js';
import { jsonBodyValidator, pathParamsValidator, queryParamsValidator } from '../validators/req.js';

const factory = createFactory();

const parseLockBody = (body: string): LockInfo => LockInfoSchema.parse(JSON.parse(body));

const acquireLockHandlers = (stateService: StateService) =>
    factory.createHandlers(
        pathParamsValidator(NameParamsSchema),
        jsonBodyValidator(LockInfoSchema),
        async (context) => {
            const { name } = context.req.valid('param');
            const body = context.req.valid('json');

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

const releaseLockHandlers = (stateService: StateService) =>
    factory.createHandlers(pathParamsValidator(NameParamsSchema), async (context) => {
        const { name } = context.req.valid('param');
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

const getStateHandlers = (stateService: StateService) =>
    factory.createHandlers(pathParamsValidator(NameParamsSchema), async (context) => {
        const { name } = context.req.valid('param');

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

const updateStateHandlers = (stateService: StateService) =>
    factory.createHandlers(
        pathParamsValidator(NameParamsSchema),
        queryParamsValidator(LockIdQuerySchema),
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

const deleteStateHandlers = (stateService: StateService) =>
    factory.createHandlers(pathParamsValidator(NameParamsSchema), async (context) => {
        const { name } = context.req.valid('param');
        await stateService.deleteState(name);
        return context.body(null, 200);
    });

export {
    acquireLockHandlers,
    deleteStateHandlers,
    getStateHandlers,
    releaseLockHandlers,
    updateStateHandlers,
};
