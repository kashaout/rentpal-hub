/**
 * Mutation Safety Layer
 * ---------------------
 * Centralized client-side guards that block Supabase insert/update calls
 * when required foreign keys are empty, null, or undefined.
 *
 * This is a SAFETY GUARD ONLY. It does not change schema, RLS, or
 * lifecycle logic — it just fails fast with an explicit message before
 * a malformed request ever reaches Postgres.
 */

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class MutationSafetyError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "MutationSafetyError";
  }
}

/** Throws if value is not a valid UUID string. */
export function assertUuid(
  value: unknown,
  field: string,
  friendlyLabel?: string
): asserts value is string {
  if (typeof value !== "string" || !value || !UUID_RE.test(value)) {
    const label = friendlyLabel ?? field;
    console.error(
      `[mutationSafety] Invalid UUID for "${field}":`,
      value
    );
    throw new MutationSafetyError(
      `${label} is missing or invalid. Please refresh and try again.`,
      field
    );
  }
}

/** Throws if value is null/undefined/empty string. */
export function assertPresent<T>(
  value: T,
  field: string,
  friendlyLabel?: string
): asserts value is NonNullable<T> {
  if (value === null || value === undefined || value === "") {
    const label = friendlyLabel ?? field;
    console.error(`[mutationSafety] Missing required field "${field}"`);
    throw new MutationSafetyError(`${label} is required.`, field);
  }
}

/**
 * Validates a payload against a list of required UUID foreign keys.
 * Throws MutationSafetyError on the first invalid field.
 */
export function assertUuidFks(
  payload: Record<string, unknown>,
  fields: Array<{ key: string; label?: string }>
): void {
  for (const { key, label } of fields) {
    assertUuid(payload[key], key, label);
  }
}

/** Asserts there is an authenticated session user matching expectations. */
export function assertAuthUser(
  authUserId: string | null | undefined,
  expectedUserId?: string
): asserts authUserId is string {
  if (!authUserId || !UUID_RE.test(authUserId)) {
    console.error("[mutationSafety] No authenticated user in session");
    throw new MutationSafetyError(
      "You must be signed in to perform this action."
    );
  }
  if (expectedUserId && expectedUserId !== authUserId) {
    console.error(
      "[mutationSafety] Auth user mismatch. Expected:",
      expectedUserId,
      "Got:",
      authUserId
    );
    throw new MutationSafetyError(
      "Session mismatch. Please sign in again."
    );
  }
}
