import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", caller.id);
    if (!roles?.some((r: any) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { landlordId } = await req.json();
    if (!landlordId) throw new Error("landlordId required");
    if (landlordId === caller.id) throw new Error("Cannot delete yourself");

    // Get property ids first to clean storage
    const { data: props } = await admin.from("properties").select("id, image_url").eq("landlord_id", landlordId);

    // Run DB cascade via RPC (validates active leases)
    const { data: rpcResult, error: rpcErr } = await admin.rpc("rpc_admin_delete_landlord", { _landlord_id: landlordId });
    if (rpcErr) throw rpcErr;

    // Best-effort: delete property-images storage objects
    try {
      const { data: files } = await admin.storage.from("property-images").list(landlordId);
      if (files?.length) {
        await admin.storage.from("property-images").remove(files.map((f: any) => `${landlordId}/${f.name}`));
      }
    } catch (_) { /* ignore */ }

    // Delete auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(landlordId);
    if (delErr) console.error("auth delete err", delErr);

    return new Response(JSON.stringify({ success: true, result: rpcResult, propertiesRemoved: props?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? "Internal error" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
