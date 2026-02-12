import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function getAdminUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (token) {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (!authError && authData?.user) return authData.user.id;
  }

  const serverClient = await createServerClient();
  const {
    data: { user },
  } = await serverClient.auth.getUser();
  return user?.id || null;
}

export async function GET(req: NextRequest) {
  try {
    const adminUserId = await getAdminUserId(req);
    if (!adminUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, organization_id")
      .eq("id", adminUserId)
      .single();

    if (!adminProfile || adminProfile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = Date.now();
    const fiveMinAgoIso = new Date(now - 5 * 60 * 1000).toISOString();
    const oneHourAgoIso = new Date(now - 60 * 60 * 1000).toISOString();

    const [
      { count: access5m = 0 },
      { count: access1h = 0 },
      { data: uniqueIps = [] },
      { data: topTokens = [] },
      { data: rlsDiagnostics, error: rlsError },
    ] = await Promise.all([
      supabaseAdmin
        .from("trip_location_share_access_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", fiveMinAgoIso),
      supabaseAdmin
        .from("trip_location_share_access_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneHourAgoIso),
      supabaseAdmin
        .from("trip_location_share_access_logs")
        .select("ip_hash")
        .gte("created_at", oneHourAgoIso)
        .limit(5000),
      supabaseAdmin
        .from("trip_location_share_access_logs")
        .select("share_token_hash")
        .gte("created_at", oneHourAgoIso)
        .limit(5000),
      supabaseAdmin.rpc("get_rls_diagnostics"),
    ]);

    if (rlsError) {
      return NextResponse.json({ error: rlsError.message }, { status: 500 });
    }

    const uniqueIpCount = new Set((uniqueIps || []).map((row) => row.ip_hash)).size;

    const tokenCountMap = new Map<string, number>();
    for (const row of topTokens || []) {
      tokenCountMap.set(row.share_token_hash, (tokenCountMap.get(row.share_token_hash) || 0) + 1);
    }

    const topShareHashes = Array.from(tokenCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hash, count]) => ({ hash_prefix: hash.slice(0, 12), count }));

    return NextResponse.json({
      checked_at: new Date().toISOString(),
      cron_auth: {
        legacy_secret_configured: Boolean(process.env.NOTIFICATION_CRON_SECRET),
        signing_secret_configured: Boolean(process.env.NOTIFICATION_SIGNING_SECRET),
        service_role_bearer_supported: true,
      },
      live_share_rate_limit: {
        threshold_per_minute: 40,
        access_requests_last_5m: Number(access5m || 0),
        access_requests_last_1h: Number(access1h || 0),
        unique_ip_hashes_last_1h: uniqueIpCount,
        top_share_hash_prefixes_last_1h: topShareHashes,
      },
      rls: rlsDiagnostics,
      firebase_edge_function: {
        service_account_secret_configured: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT),
        project_id_configured: Boolean(process.env.FIREBASE_PROJECT_ID),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
