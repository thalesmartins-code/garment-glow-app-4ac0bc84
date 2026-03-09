import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MAGALU_CLIENT_ID = Deno.env.get("MAGALU_CLIENT_ID");
    const MAGALU_CLIENT_SECRET = Deno.env.get("MAGALU_CLIENT_SECRET");

    if (!MAGALU_CLIENT_ID || !MAGALU_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: "Magalu credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, code, redirect_uri, refresh_token, scope } = await req.json();

    // 1. Generate authorization URL
    if (action === "get_auth_url") {
      const scopes = scope || "open:portfolio:read open:order-order:read";
      const stateParam = "magalu";
      const authUrl = `https://id.magalu.com/login?client_id=${MAGALU_CLIENT_ID}&redirect_uri=${redirect_uri}&scope=${scopes}&response_type=code&choose_tenants=true&state=${stateParam}`;
      return new Response(
        JSON.stringify({ success: true, auth_url: authUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Exchange authorization code for tokens
    if (action === "exchange_code") {
      if (!code || !redirect_uri) {
        return new Response(
          JSON.stringify({ error: "Missing code or redirect_uri" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokenResponse = await fetch("https://id.magalu.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          client_id: MAGALU_CLIENT_ID,
          client_secret: MAGALU_CLIENT_SECRET,
          code,
          redirect_uri,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error("Magalu token exchange failed:", tokenData);
        return new Response(
          JSON.stringify({ success: false, error: tokenData.error_description || tokenData.message || "Token exchange failed" }),
          { status: tokenResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          token_type: tokenData.token_type,
          scope: tokenData.scope,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Refresh access token
    if (action === "refresh_token") {
      if (!refresh_token) {
        return new Response(
          JSON.stringify({ error: "Missing refresh_token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokenResponse = await fetch("https://id.magalu.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          client_id: MAGALU_CLIENT_ID,
          client_secret: MAGALU_CLIENT_SECRET,
          refresh_token,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error("Magalu token refresh failed:", tokenData);
        return new Response(
          JSON.stringify({ success: false, error: tokenData.error_description || tokenData.message || "Token refresh failed" }),
          { status: tokenResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          token_type: tokenData.token_type,
          scope: tokenData.scope,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: get_auth_url, exchange_code, refresh_token" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Magalu OAuth error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
