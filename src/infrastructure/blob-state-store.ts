import { del, get as getBlob, list, put } from '@vercel/blob';
import type { State } from '../domain/state.js';
import type { StateStore } from '../domain/ports/state-store.js';

class BlobStateStore implements StateStore {
    private token: string;

    constructor(token: string) {
        this.token = token;
    }

    async delete(name: string): Promise<void> {
        const { blobs } = await list({ prefix: this.statePath(name), token: this.token });

        if (blobs.length === 0) {
            return;
        }

        await del(
            blobs.map((blob) => blob.url),
            { token: this.token },
        );
    }

    async get(name: string): Promise<State | undefined> {
        const result = await getBlob(this.statePath(name), {
            access: 'private',
            token: this.token,
        });

        if (result === null || result.statusCode !== 200) {
            return undefined;
        }

        return new Response(result.stream).text();
    }

    async put(name: string, state: State): Promise<void> {
        await put(this.statePath(name), state, {
            access: 'private',
            addRandomSuffix: false,
            allowOverwrite: true,
            contentType: 'application/json',
            token: this.token,

        });
    }

    private statePath(name: string): string {
        return `tfstate/${name}/state.json`;
    }
}

export { BlobStateStore };
