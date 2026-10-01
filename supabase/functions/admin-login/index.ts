import { corsFor, env, isAdminUser, json, logActivity, USERNAME_RE } from "../_shared/common.ts";

Deno.serve(async (request) => {
    if (request.method === "OPTIONS") return new Response("ok", { headers: corsFor(request) });
    if (request.method !== "POST") return json(request, 405, { error: "Method not allowed" });

    const invalid = () => json(request, 401, { error: "Invalid admin ID or password" });

    let username = "";
    let password = "";
    try {
        const body = await request.json();
        if (body && typeof body === "object") {
            const payload = body as Record<string, unknown>;
            username = typeof payload.username === "string" ? payload.username.trim().toLowerCase() : "";
            password = typeof payload.password === "string" ? payload.password : "";
        }
    } catch {
        return json(request, 400, { error: "Invalid request" });
    }
    if (!USERNAME_RE.test(username) || !password || password.length > 1024) return invalid();

    const ctx = env();
    if (!ctx) return json(request, 500, { error: "Login service is not configured" });
    const { adminClient, anonClient } = ctx;

    const { data: alias, error: aliasError } = await adminClient
        .from("admin_login_aliases").select("user_id").eq("username", username).maybeSingle();
    if (aliasError) return json(request, 500, { error: "Login service failed" });
    if (!alias) return invalid();

    const { data: isLimited, error: limitError } = await adminClient
        .rpc("admin_login_is_limited", { p_user_id: alias.user_id });
    if (limitError) return json(request, 500, { error: "Login service failed" });
    if (isLimited) return json(request, 429, { error: "Too many failed attempts" });

    const { data: userResult, error: userError } = await adminClient.auth.admin.getUserById(alias.user_id);
    const user = userResult?.user;
    if (userError || !user?.email || !isAdminUser(user)) return invalid();

    const { data, error } = await anonClient().auth.signInWithPassword({ email: user.email, password });
    const adminLoggedIn = isAdminUser(data?.user);
    if (error || !data?.session || !adminLoggedIn) {
        await adminClient.rpc("admin_login_record_failure", { p_user_id: alias.user_id });
        await logActivity(adminClient, "login_failed");
        return invalid();
    }

    await adminClient.rpc("admin_login_clear_failures", { p_user_id: alias.user_id });
    await logActivity(adminClient, "login");
    return json(request, 200, {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
    });
});
