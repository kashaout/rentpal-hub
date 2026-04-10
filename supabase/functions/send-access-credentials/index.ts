import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generatePassword(length = 12): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*";
  const all = upper + lower + digits + special;

  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];

  const required = [pick(upper), pick(lower), pick(digits), pick(special)];
  const rest = Array.from({ length: length - required.length }, () => pick(all));
  const combined = [...required, ...rest];

  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined.join("");
}

function generateKeyboxCode(): string {
  return Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();

    const { data: agreements, error } = await supabase
      .from("lease_agreements")
      .select("*")
      .eq("status", "active")
      .is("credentials_sent_at", null)
      .eq("tenant_signed", true)
      .eq("landlord_signed", true);

    if (error) throw error;

    const toProcess = (agreements || []).filter((a: any) => {
      const checkIn = a.check_in_time ? new Date(a.check_in_time) : new Date(a.lease_start);
      const hoursUntilCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntilCheckIn <= 12 && hoursUntilCheckIn >= -1;
    });

    const results = [];

    for (const agreement of toProcess) {
      const wifiPassword = generatePassword(12);
      const keyboxPassword = generateKeyboxCode();

      // Store credentials in the new lease_credentials table
      const { error: credError } = await supabase
        .from("lease_credentials")
        .upsert({
          lease_id: agreement.id,
          wifi_password: wifiPassword,
          keybox_password: keyboxPassword,
        }, { onConflict: "lease_id" });

      if (credError) {
        console.error(`Failed to store credentials for agreement ${agreement.id}:`, credError);
        continue;
      }

      // Mark credentials as sent on the lease agreement
      const { error: updateError } = await supabase
        .from("lease_agreements")
        .update({
          credentials_sent_at: now.toISOString(),
        })
        .eq("id", agreement.id);

      if (updateError) {
        console.error(`Failed to update agreement ${agreement.id}:`, updateError);
        continue;
      }

      // Create notification for tenant
      await supabase.from("landlord_notifications").insert({
        landlord_user_id: agreement.tenant_user_id,
        tenant_user_id: agreement.landlord_user_id,
        property_id: agreement.property_id,
        lease_agreement_id: agreement.id,
        notification_type: "access_credentials",
        title: "🔑 Access Credentials Ready",
        message: `Your WiFi password and key box code for Unit ${agreement.unit_number} are now available. Check your lease agreement for details.`,
      });

      // Create notification for landlord
      await supabase.from("landlord_notifications").insert({
        landlord_user_id: agreement.landlord_user_id,
        tenant_user_id: agreement.tenant_user_id,
        property_id: agreement.property_id,
        lease_agreement_id: agreement.id,
        notification_type: "access_credentials",
        title: "🔑 Access Credentials Sent",
        message: `WiFi and key box credentials have been generated and sent to tenant ${agreement.tenant_name} for Unit ${agreement.unit_number}.`,
      });

      results.push({ id: agreement.id, unit: agreement.unit_number });
    }

    return new Response(
      JSON.stringify({ processed: results.length, agreements: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
