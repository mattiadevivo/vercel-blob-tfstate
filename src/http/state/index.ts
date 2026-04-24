import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.json('list state'));
app.post('/', (c) => c.json('create a state', 201));
app.get('/:id', (c) => c.json(`get ${c.req.param('id')}`));

export { app };
