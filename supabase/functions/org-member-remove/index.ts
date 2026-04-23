import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization")!;
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { organization_id, user_id } = await req.json();
    if (!organization_id || !user_id) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(url, service);
    const { data: callerMember } = await admin
      .from("organization_members").select("role").eq("organization_id", organization_id).eq("user_id", user.id).maybeSingle();
    if (!callerMember || !["owner", "admin"].includes(callerMember.role)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (user_id === user.id) {
      return new Response(JSON.stringify({ error: "Você não pode remover a si mesmo" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: target } = await admin
      .from("organization_members").select("role").eq("organization_id", organization_id).eq("user_id", user_id).maybeSingle();
    if (!target) {
      return new Response(JSON.stringify({ error: "Membro não encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (target.role === "owner") {
      return new Response(JSON.stringify({ error: "Não é possível remover o owner. Transfira a propriedade primeiro." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: delErr } = await admin
      .from("organization_members")
      .delete()
      .eq("organization_id", organization_id)
      .eq("user_id", user_id);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "member_removed",
      organization_id,
      target_user_id: user_id,
      details: { previous_role: target.role },
    });

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("org-member-remove error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});