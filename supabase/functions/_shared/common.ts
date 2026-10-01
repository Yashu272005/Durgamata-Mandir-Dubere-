import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set ALLOWED_ORIGINS (comma separated, e.g. https://your-site.com) as a
// function secret. If it is unset, any origin may call the functions — they
// still require valid credentials, but locking the origin is better.
const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean); // tolerate trailing slashes

export function corsFor(request: Request): Record<string, string> {
    const origin = request.headers.get("origin") ?? "";
    const isLocalDev = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const allow = allowed.length === 0 ? "*" : allowed.includes(origin) || isLocalDev ? origin : allowed[0];
    return {
        "Access-Control-Allow-Origin": allow,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Vary": "Origin",
    };
}

export function json(request: Request, status: number, body: Record<string, unknown>) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsFor(request), "Content-Type": "application/json" },
    });
}

export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;
export const MIN_PASSWORD = 10;

export function isAdminUser(user?: { app_metadata?: { role?: string } | null; user_metadata?: { role?: string } | null; raw_app_meta_data?: { role?: string } | null; raw_user_meta_data?: { role?: string } | null } | null) {
    const meta = user?.app_metadata ?? user?.user_metadata ?? user?.raw_app_meta_data ?? user?.raw_user_meta_data ?? {};
    return (meta as { role?: string } | null)?.role === "admin";
}

export function env() {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) return null;
    const opts = { auth: { persistSession: false, autoRefreshToken: false } };
    return {
        adminClient: createClient(url, service, opts),
        anonClient: () => createClient(url, anon, opts),
    };
}

export async function logActivity(
    adminClient: ReturnType<typeof createClient>, action: string, detail?: string,
) {
    await adminClient.from("admin_activity_log").insert({ action, detail: detail ?? null });
}
