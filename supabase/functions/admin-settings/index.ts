// Changes the admin ID and/or password. Requires the CURRENT password.
import { corsFor, env, isAdminUser, json, logActivity, MIN_PASSWORD, USERNAME_RE } from "../_shared/common.ts";

Deno.serve(async (request) => {
    if (request.method === "OPTIONS") return new Response("ok", { headers: corsFor(request) });
    if (request.method !== "POST") return json(request, 405, { error: "Method not allowed" });

    const jwt = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!jwt) return json(request, 401, { error: "Not signed in" });

    let currentPassword = "";
    let newUsername = "";
    let newPassword = "";
    try {
        const body = await request.json();
        currentPassword = typeof body.current_password === "string" ? body.current_password : "";
        newUsername = typeof body.new_username === "string" ? body.new_username.trim().toLowerCase() : "";
        newPassword = typeof body.new_password === "string" ? body.new_password : "";
    } catch {
        return json(request, 400, { error: "Invalid request" });
    }

    if (!currentPassword || currentPassword.length > 1024) {
        return json(request, 400, { error: "Enter your current password." });
    }
    if (!newUsername && !newPassword) return json(request, 400, { error: "Nothing to change." });
    if (newUsername && !USERNAME_RE.test(newUsername)) {
        return json(request, 400, {
            error: "Admin ID must be 3–32 characters: lowercase letters, numbers, dot, dash or underscore.",
        });
    }
    if (newPassword && (newPassword.length < MIN_PASSWORD || newPassword.length > 128)) {
        return json(request, 400, { error: `New password must be at least ${MIN_PASSWORD} characters.` });
    }
    if (newPassword && newPassword === currentPassword) {
        return json(request, 400, { error: "New password must be different from the current one." });
    }

    const ctx = env();
    if (!ctx) return json(request, 500, { error: "Settings service is not configured" });
    const { adminClient, anonClient } = ctx;

    // Who is calling? Must be the single admin.
    const { data: userResult, error: userError } = await adminClient.auth.getUser(jwt);
    const user = userResult?.user;
    if (userError || !user?.email || !isAdminUser(user)) {
        return json(request, 403, { error: "You are not authorized to perform this action." });
    }
    const { data: alias } = await adminClient
        .from("admin_login_aliases").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!alias) return json(request, 403, { error: "You are not authorized to perform this action." });

    // Brute-force protection shared with the login function.
    const { data: limited } = await adminClient.rpc("admin_login_is_limited", { p_user_id: user.id });
    if (limited) return json(request, 429, { error: "Too many failed attempts. Try again in 15 minutes." });

    // Verify the current password.
    const { data: check, error: checkError } = await anonClient()
        .auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (checkError || !check.session) {
        await adminClient.rpc("admin_login_record_failure", { p_user_id: user.id });
        return json(request, 401, { error: "Current password is incorrect." });
    }
    await adminClient.rpc("admin_login_clear_failures", { p_user_id: user.id });

    if (newPassword) {
        const { error } = await adminClient.auth.admin.updateUserById(user.id, { password: newPassword });
        if (error) return json(request, 400, { error: error.message || "Password was rejected." });
    }
    if (newUsername) {
        const { error } = await adminClient
            .from("admin_login_aliases").update({ username: newUsername }).eq("user_id", user.id);
        if (error) {
            return json(request, 500, {
                error: newPassword
                    ? "Password changed, but the Admin ID could not be updated. Sign in with your old ID."
                    : "Admin ID could not be updated.",
            });
        }
    }

    // Kill every existing session: DB-side (is_admin) and Auth-side (refresh tokens).
    await adminClient.from("admin_security")
        .update({ sessions_valid_after: new Date().toISOString() }).eq("id", true);
    await adminClient.auth.admin.signOut(jwt, "global");
    await logActivity(adminClient, "credentials_changed",
        [newUsername && "admin ID", newPassword && "password"].filter(Boolean).join(" + "));

    return json(request, 200, { ok: true });
});
