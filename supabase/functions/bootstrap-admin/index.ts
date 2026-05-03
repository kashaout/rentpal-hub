import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TARGET_EMAIL = "kashaout@gmail.com";
const DEFAULT_PASSWORD = "Admin@RentPal2026!";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find existing user
    let userId: string | undefined;
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users.find((u) => u.email?.toLowerCase() === TARGET_EMAIL);

    if (existing) {
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, {
        password: DEFAULT_PASSWORD,
        email_confirm: true,
      });
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: TARGET_EMAIL,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: "Admin" },
      });
      if (error) throw error;
      userId = created.user!.id;
    }

    // Ensure profile
    await admin.from("profiles").upsert(
      { user_id: userId, email: TARGET_EMAIL, full_name: "Admin" },
      { onConflict: "user_id" }
    );

    // Assign admin role
    await admin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        email: TARGET_EMAIL,
        password: DEFAULT_PASSWORD,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
