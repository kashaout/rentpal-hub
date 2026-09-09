import { supabase } from "@/integrations/supabase/client";

/**
 * Hard guard: no booking or lease agreement may be created by a user whose
 * identity is not verified. Read straight from the database (not client
 * state) so a stale cache can never bypass the requirement.
 */
export class IdentityRequiredError extends Error {
  constructor(message = "Identity verification required before booking or signing a lease.") {
    super(message);
    this.name = "IdentityRequiredError";
  }
}

export async function assertIdentityComplete(userId: string | undefined) {
  if (!userId) throw new IdentityRequiredError("You must be signed in.");

  const { data, error } = await supabase
    .from("profiles")
    .select("identity_complete")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new IdentityRequiredError("Could not verify your identity status.");
  if (!data?.identity_complete) throw new IdentityRequiredError();
}
