import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function validatePasswordServer(pwd: string): string | null {
  if (!pwd || pwd.length < 8) return "Senha deve ter no mínimo 8 caracteres";
  if (!/[A-Z]/.test(pwd)) return "Senha deve conter pelo menos 1 letra maiúscula";
  if (!/[0-9]/.test(pwd)) return "Senha deve conter pelo menos 1 número";
  return null;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (roleData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, full_name, role } = await req.json();

    // Input validation
    if (!email || !validateEmail(email)) {
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pwdError = validatePasswordServer(password);
    if (pwdError) {
      return new Response(JSON.stringify({ error: pwdError }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || "" },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (role && role !== "viewer" && newUser.user) {
      const { error: roleError } = await adminClient
        .from("user_roles")
        .upsert(
          { user_id: newUser.user.id, role },
          { onConflict: "user_id" }
        );
      if (roleError) {
        console.error("Role assignment error:", roleError);
      }
    }

    // Audit log
    await adminClient.from("audit_log").insert({
      actor_id: caller.id,
      action: "user_created",
      target_user_id: newUser.user?.id,
      details: { email, role: role || "viewer" },
    });

    return new Response(JSON.stringify({ user: { id: newUser.user?.id, email } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error('Internal error:', err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
