"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, RefreshCcw, AlertTriangle } from "lucide-react";

type Health = "ok" | "warn";

type SecurityDiagnostics = {
  checked_at: string;
  cron_auth: {
    legacy_secret_configured: boolean;
    signing_secret_configured: boolean;
    service_role_bearer_supported: boolean;
  };
  live_share_rate_limit: {
    threshold_per_minute: number;
    access_requests_last_5m: number;
    access_requests_last_1h: number;
    unique_ip_hashes_last_1h: number;
    top_share_hash_prefixes_last_1h: Array<{ hash_prefix: string; count: number }>;
  };
  rls: {
    summary: {
      tables_expected: number;
      tables_with_rls: number;
      missing_policy_count: number;
    };
    tables: Array<{ table_name: string; rls_enabled: boolean; policy_count: number }>;
    required_policies: Array<{ table_name: string; policy_name: string; present: boolean }>;
  };
  firebase_edge_function: {
    service_account_secret_configured: boolean;
    project_id_configured: boolean;
  };
};

function badgeClass(ok: boolean) {
  return ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700";
}

export default function AdminSecurityPage() {
  const [data, setData] = useState<SecurityDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/security/diagnostics", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load diagnostics");
      }
      setData(payload as SecurityDiagnostics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load diagnostics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDiagnostics();
  }, [fetchDiagnostics]);

  const rlsOk = data ? data.rls.summary.tables_with_rls === data.rls.summary.tables_expected && data.rls.summary.missing_policy_count === 0 : false;
  const cronOk = data ? data.cron_auth.signing_secret_configured || data.cron_auth.legacy_secret_configured : false;
  const firebaseOk = data ? data.firebase_edge_function.project_id_configured && data.firebase_edge_function.service_account_secret_configured : false;

  const overall: Health = rlsOk && cronOk && firebaseOk ? "ok" : "warn";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-[0.3em] text-[#bda87f]">Security</span>
          <h1 className="text-3xl font-[var(--font-display)] text-[#1b140a] mt-2 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-[#c4a870]" />
            Security Diagnostics
          </h1>
          <p className="text-[#6f5b3e] mt-1">Cron auth, live-share rate limit telemetry, and RLS policy diagnostics.</p>
        </div>
        <button
          onClick={() => void fetchDiagnostics()}
          className="px-4 py-2 border border-[#eadfcd] bg-white rounded-lg text-[#6f5b3e] flex items-center gap-2"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="rounded-2xl border border-[#eadfcd] bg-white/90 p-5">
        <div className="flex items-center gap-2 mb-3">
          {overall === "ok" ? <ShieldCheck className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
          <span className={`text-xs px-2 py-1 rounded-full font-semibold uppercase ${overall === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {overall === "ok" ? "Secure baseline" : "Needs attention"}
          </span>
          <span className="text-xs text-[#8d7650]">{data?.checked_at ? `Checked ${new Date(data.checked_at).toLocaleString()}` : "Checking..."}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-[#eadfcd] p-4">
            <p className="text-xs uppercase tracking-wide text-[#9c7c46] mb-2">Cron Auth</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span>Legacy secret</span><span className={`px-2 py-0.5 rounded-full text-xs ${badgeClass(!!data?.cron_auth.legacy_secret_configured)}`}>{data?.cron_auth.legacy_secret_configured ? "ON" : "OFF"}</span></div>
              <div className="flex items-center justify-between"><span>Signed HMAC</span><span className={`px-2 py-0.5 rounded-full text-xs ${badgeClass(!!data?.cron_auth.signing_secret_configured)}`}>{data?.cron_auth.signing_secret_configured ? "ON" : "OFF"}</span></div>
              <div className="flex items-center justify-between"><span>Service-role bearer</span><span className={`px-2 py-0.5 rounded-full text-xs ${badgeClass(!!data?.cron_auth.service_role_bearer_supported)}`}>{data?.cron_auth.service_role_bearer_supported ? "ON" : "OFF"}</span></div>
            </div>
          </div>

          <div className="rounded-xl border border-[#eadfcd] p-4">
            <p className="text-xs uppercase tracking-wide text-[#9c7c46] mb-2">Live Share Access</p>
            <div className="space-y-1 text-sm text-[#1b140a]">
              <p>Threshold/min: <span className="font-semibold">{data?.live_share_rate_limit.threshold_per_minute ?? "-"}</span></p>
              <p>Requests (5m): <span className="font-semibold">{data?.live_share_rate_limit.access_requests_last_5m ?? "-"}</span></p>
              <p>Requests (1h): <span className="font-semibold">{data?.live_share_rate_limit.access_requests_last_1h ?? "-"}</span></p>
              <p>Unique IP hashes (1h): <span className="font-semibold">{data?.live_share_rate_limit.unique_ip_hashes_last_1h ?? "-"}</span></p>
            </div>
          </div>

          <div className="rounded-xl border border-[#eadfcd] p-4">
            <p className="text-xs uppercase tracking-wide text-[#9c7c46] mb-2">RLS Summary</p>
            <div className="space-y-1 text-sm text-[#1b140a]">
              <p>Tables expected: <span className="font-semibold">{data?.rls.summary.tables_expected ?? "-"}</span></p>
              <p>Tables with RLS: <span className="font-semibold">{data?.rls.summary.tables_with_rls ?? "-"}</span></p>
              <p>Missing required policies: <span className="font-semibold">{data?.rls.summary.missing_policy_count ?? "-"}</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#eadfcd] bg-white/90 p-5">
        <h2 className="text-lg font-[var(--font-display)] text-[#1b140a] mb-3">RLS Table Status</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#eadfcd] text-[#8d7650]">
                <th className="py-2 pr-3">Table</th>
                <th className="py-2 pr-3">RLS</th>
                <th className="py-2">Policies</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rls.tables || []).map((row) => (
                <tr key={row.table_name} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-mono text-xs">{row.table_name}</td>
                  <td className="py-2 pr-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${badgeClass(row.rls_enabled)}`}>
                      {row.rls_enabled ? "enabled" : "disabled"}
                    </span>
                  </td>
                  <td className="py-2">{row.policy_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-[#eadfcd] bg-white/90 p-5">
        <h2 className="text-lg font-[var(--font-display)] text-[#1b140a] mb-3">Most Accessed Share Hash Prefixes (1h)</h2>
        {data?.live_share_rate_limit.top_share_hash_prefixes_last_1h?.length ? (
          <div className="flex flex-wrap gap-2">
            {data.live_share_rate_limit.top_share_hash_prefixes_last_1h.map((item) => (
              <span key={item.hash_prefix} className="text-xs px-2 py-1 rounded-full bg-[#f8f1e6] text-[#7a613a]">
                {item.hash_prefix}... : {item.count}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#8d7650]">No share-access logs in the last hour.</p>
        )}
      </div>
    </div>
  );
}
