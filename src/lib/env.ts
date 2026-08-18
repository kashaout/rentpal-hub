/**
 * Centralized client-side environment validation.
 *
 * Only public (VITE_-prefixed) values are read here — never server secrets.
 * Values are validated once at startup so a misconfigured deployment fails
 * with a clear message instead of an opaque runtime crash.
 */

type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  supabaseProjectId: string | undefined;
};

function readRequired(name: string, value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    throw new Error(
      `[config] Missing required environment variable "${name}". ` +
        `Add it to your .env file (see .env.example) and restart the dev server.`,
    );
  }
  return value;
}

export const env: PublicEnv = {
  supabaseUrl: readRequired("VITE_SUPABASE_URL", import.meta.env.VITE_SUPABASE_URL),
  supabasePublishableKey: readRequired(
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  ),
  supabaseProjectId: import.meta.env.VITE_SUPABASE_PROJECT_ID,
};
