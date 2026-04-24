import { z } from 'zod';
const StateSchema = z.object({
    check_results: z.array(z.any()).optional(),
    lineage: z.string(),
    outputs: z.record(z.string(), z.unknown()),
    resources: z.array(z.any()),
    serial: z.number(),
    terraform_version: z.string(),
    version: z.optional(z.number()),
});

type State = z.infer<typeof StateSchema>;

export type { State };
export { StateSchema };
