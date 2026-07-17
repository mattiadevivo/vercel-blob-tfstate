import type { State } from '../state.js';

interface StateStore {
    delete(name: string): Promise<void>;
    get(name: string): Promise<State | null>;
    put(name: string, state: State): Promise<void>;
}

export type { StateStore };
