/**
 * Terraform state is an opaque JSON blob. The server stores and returns it
 * verbatim without validation or rewriting.
 */
type State = string;

export type { State };
