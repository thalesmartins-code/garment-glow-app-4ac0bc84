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

    const { organization_id, new_owner_id } = await req.json();
    if (!organization_id || !new_owner_id) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(url, service);

    const { data: org } = await admin.from("organizations").select("owner_id").eq("id", organization_id).maybeSingle();
    if (!org || org.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: "Apenas o owner atual pode transferir a propriedade" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: newOwnerMember } = await admin
      .from("organization_members").select("role").eq("organization_id", organization_id).eq("user_id", new_owner_id).maybeSingle();
    if (!newOwnerMember) {
      return new Response(JSON.stringify({ error: "Novo owner deve ser membro da organização" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update org owner
    await admin.from("organizations").update({ owner_id: new_owner_id }).eq("id", organization_id);

    // Promote new owner: delete + insert
    await admin.from("organization_members").delete().eq("organization_id", organization_id).eq("user_id", new_owner_id);
    await admin.from("organization_members").insert({ organization_id, user_id: new_owner_id, role: "owner" });

    // Demote previous owner to admin
    await admin.from("organization_members").delete().eq("organization_id", organization_id).eq("user_id", user.id);
    await admin.from("organization_members").insert({ organization_id, user_id: user.id, role: "admin" });

    await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "ownership_transferred",
      organization_id,
      target_user_id: new_owner_id,
      details: {},
    });

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("org-transfer-ownership error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});