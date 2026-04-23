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

    const { organization_id, user_id, role } = await req.json();
    if (!organization_id || !user_id || !role) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!["admin", "member", "viewer"].includes(role)) {
      return new Response(JSON.stringify({ error: "Cargo inválido (use admin/member/viewer; transferência de owner é separada)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(url, service);

    const { data: callerMember } = await admin
      .from("organization_members").select("role").eq("organization_id", organization_id).eq("user_id", user.id).maybeSingle();
    if (!callerMember || !["owner", "admin"].includes(callerMember.role)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (user_id === user.id) {
      return new Response(JSON.stringify({ error: "Você não pode alterar seu próprio cargo" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: targetMember } = await admin
      .from("organization_members").select("role").eq("organization_id", organization_id).eq("user_id", user_id).maybeSingle();
    if (!targetMember) {
      return new Response(JSON.stringify({ error: "Membro não encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (targetMember.role === "owner") {
      return new Response(JSON.stringify({ error: "Use a transferência de propriedade para alterar o owner" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Workaround for absence of UPDATE RLS on organization_members (only owners can remove): use service role
    // Delete + insert to mimic update, since RLS on this table doesn't allow UPDATE
    await admin.from("organization_members").delete().eq("organization_id", organization_id).eq("user_id", user_id);
    const { error: insertErr } = await admin.from("organization_members").insert({ organization_id, user_id, role });
    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Clear viewer custom permissions when role changes (always reset to a clean slate).
    // - Promoting from viewer -> member/admin: permissions are no longer used.
    // - Demoting to viewer: starts with default-deny (nothing granted) per product spec.
    await admin
      .from("member_route_permissions")
      .delete()
      .eq("organization_id", organization_id)
      .eq("user_id", user_id);

    await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "member_role_changed",
      organization_id,
      target_user_id: user_id,
      details: { from: targetMember.role, to: role },
    });

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("org-member-update-role error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});