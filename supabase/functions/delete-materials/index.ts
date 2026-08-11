import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header is missing.");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase server configuration is missing.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: userError } =
      await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error("Unable to identify the authenticated user.");
    }

    const { materialIds } = await req.json();
    if (!Array.isArray(materialIds) || materialIds.length === 0) {
      throw new Error("At least one material ID is required.");
    }

    const uniqueIds = [...new Set(materialIds)].slice(0, 100);
    const { data: materials, error: selectError } = await supabase
      .from("study_materials")
      .select("id, file_path")
      .eq("user_id", user.id)
      .in("id", uniqueIds);
    if (selectError) throw selectError;

    const filePaths = (materials || [])
      .map((material) => material.file_path)
      .filter((path): path is string => Boolean(path));

    if (filePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("study-materials")
        .remove(filePaths);
      if (storageError) throw storageError;
    }

    const idsToDelete = (materials || []).map((material) => material.id);
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("study_materials")
        .delete()
        .eq("user_id", user.id)
        .in("id", idsToDelete);
      if (deleteError) throw deleteError;
    }

    return respond({ success: true, deletedIds: idsToDelete });
  } catch (error) {
    console.error("Delete materials error:", error);
    return respond({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});
