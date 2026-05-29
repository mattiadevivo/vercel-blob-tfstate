import { LockConflictError, LockMismatchError, StateNotFoundError } from '../../domain/errors.js';
import { type LockInfo, LockInfoSchema } from '../../domain/lock-info.js';
import { Hono } from 'hono';
import type { StateService } from '../../application/state-service.js';

const parseLockBody = (body: string): LockInfo => LockInfoSchema.parse(JSON.parse(body));

const createStateRouter = (stateService: StateService): Hono => {
    const router = new Hono();

    router.post('/:name/lock', async (context) => {
        const name = context.req.param('name');
        const body = await context.req.json();
        console.log('Received body for lock release:', body);
        const lockInfo = LockInfoSchema.parse(body);

        try {
            await stateService.acquireLock(name, lockInfo);
            return context.body(null, 200);
        } catch (error) {
            if (error instanceof LockConflictError) {
                return context.json(error.existingLock, 409);
            }
            throw error;
        }
    });

    // oxlint-disable-next-line max-statements
    router.delete('/:name/lock', async (context) => {
        const name = context.req.param('name');
        const body = await context.req.text();
        // oxlint-disable-next-line no-ternary
        const lockInfo: LockInfo | undefined = body.length === 0 ? undefined : parseLockBody(body);


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

    router.get('/:name', async (context) => {
        const name = context.req.param('name');

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

    router.post('/:name', async (context) => {
        const name = context.req.param('name');
        const lockId = context.req.query('ID');
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
    });

    router.put('/:name', async (context) => {
        const name = context.req.param('name');
        const lockId = context.req.query('ID');
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
    });

    router.delete('/:name', async (context) => {
        const name = context.req.param('name');
        await stateService.deleteState(name);
        return context.body(null, 200);
    });

    return router;
};

export { createStateRouter };
