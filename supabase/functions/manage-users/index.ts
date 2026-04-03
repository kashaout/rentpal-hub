import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin or landlord
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check roles
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const roles = callerRoles?.map((r: any) => r.role) || [];
    const isAdmin = roles.includes("admin");
    const isLandlord = roles.includes("landlord");

    if (!isAdmin && !isLandlord) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, userId, email, fullName, password, role } = body;

    // Landlords can only manage tenants
    if (isLandlord && !isAdmin) {
      if (action === "create" && role && role !== "tenant") {
        return new Response(
          JSON.stringify({ error: "Landlords can only create tenant accounts" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // For other actions, verify the target user is a tenant of landlord's property
      if (userId && action !== "create") {
        const { data: tenantCheck } = await supabaseAdmin
          .from("tenants")
          .select("id, property_id")
          .eq("user_id", userId);

        if (!tenantCheck || tenantCheck.length === 0) {
          return new Response(
            JSON.stringify({ error: "You can only manage your own tenants" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verify landlord owns at least one of these properties
        const propertyIds = tenantCheck.map((t: any) => t.property_id);
        const { data: ownedProps } = await supabaseAdmin
          .from("properties")
          .select("id")
          .eq("landlord_id", caller.id)
          .in("id", propertyIds);

        if (!ownedProps || ownedProps.length === 0) {
          return new Response(
            JSON.stringify({ error: "You can only manage tenants in your properties" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    let result: any = {};

    switch (action) {
      case "reset_password": {
        if (!userId) throw new Error("userId is required");
        const defaultPassword = "TestP@ssword12345";
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: defaultPassword,
        });
        if (error) throw error;
        result = { success: true, message: "Password reset to default" };
        break;
      }

      case "block": {
        if (!userId) throw new Error("userId is required");
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: "876000h", // ~100 years
        });
        if (error) throw error;
        result = { success: true, message: "User account blocked" };
        break;
      }

      case "unblock": {
        if (!userId) throw new Error("userId is required");
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: "none",
        });
        if (error) throw error;
        result = { success: true, message: "User account unblocked" };
        break;
      }

      case "delete": {
        if (!userId) throw new Error("userId is required");
        // Don't allow self-delete
        if (userId === caller.id) {
          throw new Error("Cannot delete your own account");
        }
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) throw error;
        result = { success: true, message: "User deleted" };
        break;
      }

      case "create": {
        if (!email || !fullName) throw new Error("email and fullName are required");
        const newPassword = password || "TestP@ssword12345";
        const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: newPassword,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });
        if (error) throw error;

        // Assign role if specified
        if (role && newUser.user) {
          await supabaseAdmin
            .from("user_roles")
            .insert({ user_id: newUser.user.id, role });
        }

        result = {
          success: true,
          message: "User created",
          userId: newUser.user?.id,
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
