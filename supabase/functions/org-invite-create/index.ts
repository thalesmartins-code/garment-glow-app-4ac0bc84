import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function genToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization")!;
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ ok: false, error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { organization_id, email, role } = await req.json();
    if (!organization_id || !email || !role) {
      return new Response(JSON.stringify({ ok: false, error: "Parâmetros inválidos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!["admin", "member", "viewer"].includes(role)) {
      return new Response(JSON.stringify({ ok: false, error: "Cargo inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(url, service);
    // Verify caller is owner or admin of the org
    const { data: callerMember } = await admin
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!callerMember || !["owner", "admin"].includes(callerMember.role)) {
      return new Response(JSON.stringify({ ok: false, error: "Acesso negado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = genToken();
    const token_hash = await sha256(token);
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: inserted, error: insertErr } = await admin
      .from("organization_invites")
      .insert({
        organization_id,
        email: email.toLowerCase(),
        role,
        token_hash,
        invited_by: user.id,
        expires_at,
      })
      .select("id")
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ ok: false, error: insertErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "invite_created",
      organization_id,
      details: { email, role, invite_id: inserted.id },
    });

    const origin = req.headers.get("origin") ?? "";
    const invite_url = `${origin}/aceitar-convite?token=${token}`;

    return new Response(JSON.stringify({ ok: true, invite_url, invite_id: inserted.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("org-invite-create error:", err);
    return new Response(JSON.stringify({ ok: false, error: "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});