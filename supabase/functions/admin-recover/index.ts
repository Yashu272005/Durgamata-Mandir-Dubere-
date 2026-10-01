// Sends a password-reset link to the admin's own e-mail address.
// Always answers the same way, so nobody can learn whether an ID exists.
import { corsFor, env, isAdminUser, json, logActivity, USERNAME_RE } from "../_shared/common.ts";

Deno.serve(async (request) => {
    if (request.method === "OPTIONS") return new Response("ok", { headers: corsFor(request) });
    if (request.method !== "POST") return json(request, 405, { error: "Method not allowed" });

    let username = "";
    try {
        const body = await request.json();
        username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    } catch {
        return json(request, 400, { error: "Invalid request" });
    }

    const ctx = env();
    const siteUrl = Deno.env.get("SITE_URL"); // e.g. https://your-site.com/
    if (!ctx || !siteUrl) return json(request, 500, { error: "Recovery is not configured" });

    if (USERNAME_RE.test(username)) {
        const { adminClient, anonClient } = ctx;
        const { data: alias } = await adminClient
            .from("admin_login_aliases").select("user_id").eq("username", username).maybeSingle();
        if (alias) {
            const { data } = await adminClient.auth.admin.getUserById(alias.user_id);
            const email = data?.user?.email;
            if (email && isAdminUser(data?.user)) {
                await anonClient().auth.resetPasswordForEmail(email, { redirectTo: siteUrl });
                await logActivity(adminClient, "recovery_requested");
            }
        }
    }
    return json(request, 200, { ok: true });
});
