import { Hono } from 'hono';

import type { StateService } from '../../application/state-service.js';
import {
    acquireLockDocs,
    deleteStateDocs,
    getStateDocs,
    releaseLockDocs,
    updateStateDocs,
} from './docs.js';
import {
    acquireLockHandlers,
    deleteStateHandlers,
    getStateHandlers,
    releaseLockHandlers,
    updateStateHandlers,
} from './handlers.js';

const createStateRouter = (stateService: StateService): Hono => {
    const router = new Hono();

    router.post('/:name/lock', acquireLockDocs, ...acquireLockHandlers(stateService));
    router.delete('/:name/lock', releaseLockDocs, ...releaseLockHandlers(stateService));
    router.get('/:name', getStateDocs, ...getStateHandlers(stateService));
    // Terraform's update_method defaults to POST but is user-configurable; support PUT too.
    router.on(['POST', 'PUT'], '/:name', updateStateDocs, ...updateStateHandlers(stateService));
    router.delete('/:name', deleteStateDocs, ...deleteStateHandlers(stateService));

    return router;
};

export { createStateRouter };
