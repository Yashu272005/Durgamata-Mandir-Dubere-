/* =====================================================================
   PRIVATE ADMIN STUDIO — श्री दुर्गा माता मंदिर समिती
   Routes (hash based, so it works on any static host):
     #/admin-login  #/admin-reset  #/admin  #/admin/photos  #/admin/videos
     #/admin/library  #/admin/gallery  #/admin/activity  #/admin/settings
   There is NO link to any of these on the public site. Hiding is only a
   convenience: every read/write is enforced by Supabase RLS + Edge Functions.
   ===================================================================== */
import "./admin.css";
import { supabase, GALLERY_BUCKET as BUCKET, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_CONFIGURED } from "./supabaseclient.ts";

/* ----------------------------- limits ------------------------------- */
// Keep MAX_VIDEO_MB in sync with file_size_limit in supabase/media_system.sql.
// Supabase free plan = 50 MB per file; paid plans can be raised.
const MAX_PHOTO_MB = 25;
const MAX_VIDEO_MB = 50;
const MAX_EDGE = 2560; // photos larger than this are scaled down
const IDLE_MS = 30 * 60 * 1000; // sign out after 30 min of inactivity
const MAX_SESSION_MS = 12 * 60 * 60 * 1000; // hard limit per login
const PAGE = 24;
const MIN_PASSWORD = 10;

const KINDS = {
  image: { label: "Photo", plural: "Photos", mimes: ["image/jpeg", "image/png", "image/webp"], max: MAX_PHOTO_MB, accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp", formats: "JPG, PNG, WEBP" },
  video: { label: "Video", plural: "Videos", mimes: ["video/mp4", "video/webm", "video/quicktime"], max: MAX_VIDEO_MB, accept: ".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime", formats: "MP4, WEBM, MOV" },
};
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };

const NAV = [
  ["dashboard", "Dashboard", "#/admin", "dashboard"],
  ["photos", "Photos", "#/admin/photos", "image"],
  ["videos", "Videos", "#/admin/videos", "video"],
  ["library", "Media Library", "#/admin/library", "library"],
  ["gallery", "Gallery Management", "#/admin/gallery", "folder"],
  ["activity", "Activity", "#/admin/activity", "activity"],
  ["settings", "Settings", "#/admin/settings", "settings"],
];
const TITLES = Object.fromEntries(NAV.map((n) => [n[0], n[1]]));

const ACTIONS = {
  login: ["Login", "login"], login_failed: ["Failed login attempt", "alert"], logout: ["Logout", "logout"],
  photo_upload: ["Photo upload", "image"], video_upload: ["Video upload", "video"],
  media_edit: ["Media edit", "edit"], media_delete: ["Media delete", "trash"],
  publish: ["Publish", "eye"], unpublish: ["Unpublish", "eyeoff"],
  credentials_changed: ["Credential change", "settings"], recovery_requested: ["Password reset requested", "key"],
};

/* ------------------------------ icons ------------------------------- */
const P = {
  dashboard: '<path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.8"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="3"/><path d="m22 8-6 4 6 4V8Z"/>',
  library: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M17.9 17.9A10.9 10.9 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.1-5.9M9.9 5.2A10 10 0 0 1 12 5c6.5 0 10 7 10 7a18.6 18.6 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2M2 2l20 20"/>',
  trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  check: '<path d="m5 12 5 5 9-10"/>', alert: '<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
  play: '<path d="M7 4v16l13-8Z"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 9.2-9.2M17 6l3 3M14 9l2 2"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
const icon = (n, s = 20) => `<svg class="ico" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ""}</svg>`;

/* ----------------------------- helpers ------------------------------ */
const root = document.getElementById("adminRoot");
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const $ = (s, el = root) => el.querySelector(s);
const $$ = (s, el = root) => [...el.querySelectorAll(s)];
const fmtBytes = (n, dash = false) => {
  if (!n && dash) return "—";
  let v = n || 0, i = 0;
  const u = ["B", "KB", "MB", "GB"];
  while (v >= 1024 && i < 3) { v /= 1024; i++; }
  return `${i === 0 || v >= 100 ? Math.round(v) : v.toFixed(1)} ${u[i]}`;
};
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const fmtTime = (d) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const publicUrl = (path) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
const baseName = (name) => name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 120);

/* ------------------------------ state ------------------------------- */
const S = {
  user: null, verifiedAt: 0, recovery: false, notice: "", view: "dashboard",
  media: [], loaded: false, loading: false, loadError: "",
  activity: null, activityError: "",
  f: { chip: "all", q: "", sort: "newest", cat: "" }, limit: PAGE, typeLimit: { image: PAGE, video: PAGE },
  sel: new Set(), stage: { image: [], video: [] }, uploading: false,
  uploadOpts: { category: "General", publish: true }, shell: false,
};
const bump = () => { lastActive = Date.now(); };
let routeSeq = 0, confirmResolve = null, lastActive = Date.now(), idleTimer = null;

/* --------------------------- friendly errors ------------------------ */
function friendly(error) {
  const msg = String(error?.message || error || "");
  if (error?.code === "42501" || /row-level security|not authorized|jwt|permission/i.test(msg) || [401, 403].includes(error?.status)) return "You are not authorized to perform this action.";
  if (/failed to fetch|network|load failed/i.test(msg)) return "Network problem. Check your connection and try again.";
  return "A database error occurred. Please try again.";
}
function uploadError(e) {
  const m = String(e?.message || e);
  if (e?.status === 413 || /too large|exceeded/i.test(m)) return `File is larger than the storage limit.`;
  if (e?.status === 415 || /mime|unsupported/i.test(m)) return "This file type is not accepted by storage.";
  if ([401, 403].includes(e?.status) || /row-level|not authorized|jwt/i.test(m)) return "You are not authorized to perform this action.";
  if (/network/i.test(m)) return "Network failure. Upload failed. Please try again.";
  if (e?.db) return "Saved to storage but the database rejected it. Upload failed. Please try again.";
  return "Upload failed. Please try again.";
}
const isAdminUser = (user) => !!user && (
  user.app_metadata?.role === "admin"
  || user.user_metadata?.role === "admin"
  || user.raw_app_meta_data?.role === "admin"
  || user.raw_user_meta_data?.role === "admin"
);

async function fnError(error) {
  if (error?.name === "FunctionsFetchError") {
    console.error("[admin] Could not reach the Edge Function:", error?.context || error);
    return { status: 0, msg: "Cannot reach the login service. If your internet is fine, the admin-login function is not deployed or this site's address is not allowed (ALLOWED_ORIGINS). See ADMIN_SETUP.md → Troubleshooting." };
  }
  let msg = null;
  try { msg = (await error.context.json())?.error; } catch { /* no body */ }
  return { status: error?.context?.status, msg };
}

/* ------------------------------ toast ------------------------------- */
function toast(message, type = "success") {
  const box = $("#admToasts") || document.body;
  const el = document.createElement("div");
  el.className = `a-toast a-toast--${type}`;
  el.innerHTML = `<span class="a-toast__ico">${icon(type === "success" ? "check" : type === "error" ? "alert" : "clock", 18)}</span><span>${esc(message)}</span>`;
  box.appendChild(el);
  setTimeout(() => { el.classList.add("is-out"); setTimeout(() => el.remove(), 350); }, type === "error" ? 6500 : 4000);
}

/* ------------------------------ modal ------------------------------- */
function openModal(html, cls = "") {
  closeModal();
  const host = $("#admModal") || root;
  host.innerHTML = `<div class="modal-wrap"><div class="modal a-glass ${cls}" role="dialog" aria-modal="true">${html}</div></div>`;
  document.body.classList.add("adm-noscroll");
  setTimeout(() => host.querySelector("input:not([type=file]),textarea,button.adm-btn")?.focus(), 30);
}
function closeModal() {
  const host = $("#admModal");
  if (host) host.innerHTML = "";
  document.body.classList.remove("adm-noscroll");
  if (confirmResolve) { const r = confirmResolve; confirmResolve = null; r(false); }
}
function confirmDialog(message, { title = "Please confirm", yes = "Delete", danger = true } = {}) {
  return new Promise((resolve) => {
    openModal(`<div class="modal__icon ${danger ? "is-danger" : ""}">${icon(danger ? "trash" : "alert", 26)}</div>
      <h2>${esc(title)}</h2><p class="modal__text">${esc(message)}</p>
      <div class="modal__actions"><button class="adm-btn adm-btn--ghost" data-action="confirm-no">Cancel</button>
      <button class="adm-btn ${danger ? "adm-btn--danger" : "adm-btn--gold"}" data-action="confirm-yes">${esc(yes)}</button></div>`, "modal--sm");
    confirmResolve = resolve;
  });
}

/* ----------------------------- routing ------------------------------ */
function parseRoute() {
  let h = location.hash;
  if (h === "#admin") h = "#/admin";
  const m = h.match(/^#\/(admin-login|admin-reset|admin)(?:\/([a-z-]+))?\/?$/);
  return m ? { page: m[1], sub: m[2] || "" } : null;
}
function go(hash) { history.replaceState(null, "", hash); void route(); }

async function route() {
  const seq = ++routeSeq;
  const r = parseRoute();
  document.body.classList.toggle("admin-open", !!r);
  root.hidden = !r;
  if (S.recovery && (!r || r.page !== "admin-reset")) return go("#/admin-reset"); // finish the reset first
  if (!r) { S.shell = false; return; }

  if (r.page === "admin-reset") {
    if (!S.recovery) return go("#/admin-login");
    return renderReset();
  }
  const user = await verifySession();
  if (seq !== routeSeq) return;
  if (r.page === "admin-login") return user ? go("#/admin") : renderLogin();
  if (!user) return go("#/admin-login");

  const view = TITLES[r.sub] ? r.sub : "dashboard";
  if (!S.shell || !$(".adm")) renderShell();
  S.view = view;
  $("#admSide")?.classList.remove("adm-open");
  $(".adm-scrim")?.classList.remove("adm-open");
  $$(".adm-nav a").forEach((a) => a.classList.toggle("adm-on", a.dataset.view === view));
  $("#admTitle").textContent = TITLES[view];
  window.scrollTo(0, 0);
  renderView();
  if (!S.loaded && !S.loading) void loadMedia();
  if (view === "activity") void loadActivity();
}

/* ------------------------- session / security ----------------------- */
async function verifySession(force = false) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { S.user = null; return null; }
  if (!force && S.user?.id === session.user.id && Date.now() - S.verifiedAt < 60000) return S.user;
  // Ask the Auth server (not just the local token) who this is.
  const { data, error } = await supabase.auth.getUser();
  if (error || !isAdminUser(data?.user)) {
    S.notice = data?.user ? "This account does not have administrator access." : "";
    await supabase.auth.signOut({ scope: "local" });
    S.user = null;
    return null;
  }
  S.user = data.user; S.verifiedAt = Date.now();
  if (!sessionStorage.getItem("dmm_admin_since")) sessionStorage.setItem("dmm_admin_since", String(Date.now()));
  startIdle();
  return S.user;
}
function startIdle() {
  if (idleTimer) return;
  ["click", "keydown", "touchstart", "pointermove", "scroll"].forEach((e) => window.addEventListener(e, bump, { passive: true }));
  lastActive = Date.now();
  idleTimer = setInterval(() => {
    const since = Number(sessionStorage.getItem("dmm_admin_since")) || Date.now();
    if (Date.now() - lastActive > IDLE_MS) expire("You were signed out after 30 minutes of inactivity.");
    else if (Date.now() - since > MAX_SESSION_MS) expire("Your session has expired. Please sign in again.");
  }, 15000);
}
function stopIdle() { clearInterval(idleTimer); idleTimer = null; }
async function expire(message) { S.notice = message; stopIdle(); await supabase.auth.signOut({ scope: "local" }); }

function onAuth(event) {
  if (event === "PASSWORD_RECOVERY") { S.recovery = true; history.replaceState(null, "", "#/admin-reset"); void route(); }
  if (event === "SIGNED_OUT") {
    S.user = null; S.media = []; S.loaded = false; S.activity = null; S.shell = false; S.sel.clear();
    sessionStorage.removeItem("dmm_admin_since"); stopIdle();
    const r = parseRoute();
    if (r && r.page !== "admin-login" && !(r.page === "admin-reset" && S.recovery)) go("#/admin-login");
  }
}

/* ----------------------------- auth views --------------------------- */
function authCard(inner, className = "") {
  const extra = className ? ` ${className}` : "";
  root.innerHTML = `<div class="auth"><div class="auth-bg" aria-hidden="true"><i></i><i></i><i></i></div>
    <section class="auth-card a-glass${extra}">
      <div class="auth-logo"><svg><use href="#logo-mark"/></svg></div>
      <p class="auth-eyebrow">श्री दुर्गा माता मंदिर समिती</p>${inner}</section></div><div id="admToasts" class="toasts"></div>`;
  S.shell = false;
}
const pwField = (name, label, auto, disabled = false) => `<label class="field"><span>${label}</span><div class="pw">
  <input type="password" name="${name}" autocomplete="${auto}" required maxlength="1024" ${disabled ? "disabled" : ""} /><button type="button" class="pw__btn" data-toggle-pw aria-label="Show password" ${disabled ? "disabled" : ""}>${icon("eye", 18)}</button></div></label>`;

function renderLogin() {
  const note = S.notice; S.notice = "";
  const configNote = SUPABASE_CONFIGURED
    ? ""
    : `<p class="auth-note">Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.</p>`;
  authCard(`<h1>Admin Login</h1><p class="auth-sub">Private area. Authorised administrator only.</p>
    ${configNote}
    ${note ? `<p class="auth-note">${esc(note)}</p>` : ""}
    <form data-form="login" class="auth-form">
      <label class="field"><span>Admin ID / Username</span><input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="32" required ${SUPABASE_CONFIGURED ? "" : "disabled"} /></label>
      ${pwField("password", "Password", "current-password", !SUPABASE_CONFIGURED)}
      <p class="form-msg" id="formMsg" role="alert"></p>
      <button class="adm-btn adm-btn--gold adm-btn--block" type="submit" ${SUPABASE_CONFIGURED ? "" : "disabled"}>Login</button>
    </form>
    <button class="auth-link" data-action="show-recover" ${SUPABASE_CONFIGURED ? "" : "disabled"}>Forgot password?</button>
    <a class="auth-link" href="#home">← Back to website</a>`, "auth-card--login");
}
function renderRecover() {
  authCard(`<h1>Reset password</h1><p class="auth-sub">Enter your Admin ID. A secure reset link will be e-mailed to the address registered for this account.</p>
    <form data-form="recover" class="auth-form">
      <label class="field"><span>Admin ID / Username</span><input name="username" autocapitalize="none" spellcheck="false" maxlength="32" required /></label>
      <p class="form-msg" id="formMsg" role="status"></p>
      <button class="adm-btn adm-btn--gold adm-btn--block" type="submit">Send reset link</button>
    </form><button class="auth-link" data-action="show-login">← Back to login</button>`, "auth-card--recover");
}
function renderReset() {
  authCard(`<h1>Choose a new password</h1><p class="auth-sub">At least ${MIN_PASSWORD} characters.</p>
    <form data-form="reset" class="auth-form">
      ${pwField("password", "New password", "new-password")}${pwField("confirm", "Confirm new password", "new-password")}
      <p class="form-msg" id="formMsg" role="alert"></p>
      <button class="adm-btn adm-btn--gold adm-btn--block" type="submit">Save password</button>
    </form><button class="auth-link" data-action="cancel-recovery">Cancel</button>`);
}
const setMsg = (text, ok = false) => { const el = $("#formMsg"); if (el) { el.textContent = text; el.className = `form-msg ${ok ? "is-ok" : ""}`; } };
const busy = (form, on) => { const b = form.querySelector("button[type=submit]"); if (b) { b.disabled = on; b.classList.toggle("is-busy", on); } };

async function doLogin(form) {
  const fd = new FormData(form);
  busy(form, true); setMsg("");
  const { data, error } = await supabase.functions.invoke("admin-login", {
    body: { username: String(fd.get("username")).trim().toLowerCase(), password: String(fd.get("password")) },
  });
  if (error) {
    const { status, msg } = await fnError(error);
    busy(form, false);
    return setMsg(status === 401 ? "Admin ID or password is incorrect." : status === 429 ? "Too many failed attempts. Try again in 15 minutes." : msg || "Sign-in service unavailable. Please try again.");
  }
  sessionStorage.setItem("dmm_admin_since", String(Date.now()));
  const { error: e2 } = await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
  if (e2) { busy(form, false); return setMsg("Could not start the session. Please try again."); }
  S.verifiedAt = 0;
  go("#/admin");
}
async function doRecover(form) {
  busy(form, true);
  const username = String(new FormData(form).get("username")).trim().toLowerCase();
  const { error } = await supabase.functions.invoke("admin-recover", { body: { username } });
  busy(form, false);
  if (error) { const { msg } = await fnError(error); return setMsg(msg || "Recovery is unavailable right now."); }
  setMsg("If that Admin ID exists, a reset link has been sent to the registered e-mail address.", true);
}
async function doReset(form) {
  const fd = new FormData(form);
  const pw = String(fd.get("password")), cf = String(fd.get("confirm"));
  if (pw.length < MIN_PASSWORD) return setMsg(`Password must be at least ${MIN_PASSWORD} characters.`);
  if (pw !== cf) return setMsg("Passwords do not match.");
  busy(form, true);
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) { busy(form, false); return setMsg(error.message || "Could not update the password."); }
  S.recovery = false;
  S.notice = "Password updated. Please sign in with your new password.";
  await supabase.auth.signOut({ scope: "global" });
}
async function doLogout() {
  S.notice = "You have been signed out.";
  await supabase.rpc("log_admin_logout");
  await supabase.auth.signOut();
}

/* ------------------------------ shell ------------------------------- */
function renderShell() {
  root.innerHTML = `<div class="adm"><div class="adm-bg" aria-hidden="true"><i></i><i></i></div>
    <aside class="adm-side a-glass" id="admSide">
      <div class="adm-brand"><span class="adm-brand__mark"><svg><use href="#logo-mark"/></svg></span><span><b>श्री दुर्गा माता मंदिर</b><small>Admin Studio</small></span></div>
      <nav class="adm-nav" aria-label="Admin">${NAV.map(([k, l, h, i]) => `<a href="${h}" data-view="${k}">${icon(i)}<span>${l}</span></a>`).join("")}</nav>
      <div class="adm-side__foot"><a href="#home" class="adm-nav__plain">${icon("globe")}<span>View website</span></a>
        <button type="button" class="adm-nav__plain" data-action="logout">${icon("logout")}<span>Logout</span></button></div>
    </aside><div class="adm-scrim" data-action="close-menu"></div>
    <div class="adm-main">
      <header class="adm-top"><button class="adm-iconbtn adm-burger" data-action="open-menu" aria-label="Open menu">${icon("menu")}</button>
        <h1 id="admTitle"></h1>
        <button class="adm-btn adm-btn--gold adm-top__up" data-action="quick-upload">${icon("upload", 18)}<span>Quick upload</span></button></header>
      <main id="admContent" class="adm-content"></main>
    </div>
    <button class="adm-fab" data-action="quick-upload" aria-label="Quick upload">${icon("upload", 24)}</button>
    <div id="admToasts" class="toasts" aria-live="polite"></div><div id="admModal"></div></div>`;
  S.shell = true;
}

/* ------------------------------- data ------------------------------- */
async function loadMedia() {
  S.loading = true; S.loadError = "";
  if (S.view !== "settings" && S.view !== "activity") renderView();
  const { data, error } = await supabase.from("gallery_media").select("*").order("created_at", { ascending: false }).limit(2000);
  S.loading = false;
  if (error) S.loadError = friendly(error); else { S.media = data || []; S.loaded = true; }
  renderView();
}
async function loadActivity() {
  S.activityError = "";
  const { data, error } = await supabase.from("admin_activity_log").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) S.activityError = friendly(error); else S.activity = data || [];
  if (S.view === "activity") renderView();
}
const byId = (id) => S.media.find((m) => m.id === id);
const categories = () => [...new Set(S.media.map((m) => m.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));

/* ------------------------------ views ------------------------------- */
function renderView() {
  const el = $("#admContent");
  if (!el) return;
  const needsMedia = !["settings", "activity"].includes(S.view);
  let html;
  if (needsMedia && S.loadError) html = errorState(S.loadError);
  else if (needsMedia && !S.loaded) html = skeleton();
  else html = ({ dashboard: viewDashboard, photos: () => viewUpload("image"), videos: () => viewUpload("video"), library: viewLibrary, gallery: viewGallery, activity: viewActivity, settings: viewSettings })[S.view]();
  el.innerHTML = `<div class="view">${html}</div>`;
  if (S.view === "dashboard" && S.loaded) animateCounts();
  if (S.view === "photos") paintStage("image");
  if (S.view === "videos") paintStage("video");
  if (S.view === "library" && S.loaded) paintLibrary();
}
const skeleton = () => `<div class="a-stats">${"<div class='skel skel--stat'></div>".repeat(4)}</div><div class="mgrid">${"<div class='skel skel--card'></div>".repeat(6)}</div>`;
const errorState = (msg) => `<div class="empty a-glass is-error">${icon("alert", 34)}<h3>Something went wrong</h3><p>${esc(msg)}</p><button class="adm-btn adm-btn--gold" data-action="reload">Try again</button></div>`;
const emptyState = (title, text, kind) => `<div class="empty a-glass">${icon(kind === "video" ? "video" : "image", 38)}<h3>${title}</h3><p>${text}</p>${kind ? `<a class="adm-btn adm-btn--gold" href="#/admin/${kind === "video" ? "videos" : "photos"}">${icon("upload", 18)} Upload ${kind === "video" ? "videos" : "photos"}</a>` : ""}</div>`;

function stat(ico, label, value, raw) {
  return `<article class="a-stat a-glass"><span class="a-stat__ico">${icon(ico, 22)}</span><div><p>${label}</p><b ${raw ? "" : `data-count="${value}"`}>${raw ? esc(value) : 0}</b></div></article>`;
}
function animateCounts() {
  $$("[data-count]").forEach((el) => {
    const end = Number(el.dataset.count), t0 = performance.now();
    const step = (t) => { const p = Math.min(1, (t - t0) / 700); el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

function viewDashboard() {
  const m = S.media;
  const photos = m.filter((x) => x.media_type === "image").length, videos = m.length - photos;
  const week = m.filter((x) => Date.now() - new Date(x.created_at) < 7 * 864e5).length;
  const live = m.filter((x) => x.status === "published").length;
  const bytes = m.reduce((s, x) => s + (x.file_size || 0), 0);
  return `<section class="welcome a-glass"><div><p class="a-eyebrow">Admin Studio</p><h2>Jai Mata Di 🙏</h2>
      <p>Everything uploaded here appears on the public gallery once it is published.</p></div>
      <button class="adm-btn adm-btn--gold" data-action="quick-upload">${icon("upload", 18)} Quick upload</button></section>
    <section class="a-stats">${stat("image", "Total Photos", photos)}${stat("video", "Total Videos", videos)}${stat("library", "Total Media", m.length)}${stat("clock", "Recently uploaded (7 days)", week)}</section>
    <section class="a-stats a-stats--2">${stat("eye", "Published / Unpublished", `${live} / ${m.length - live}`, true)}
      ${stat("database", "Storage used (tracked uploads)", fmtBytes(bytes), true)}</section>
    <div class="sec-head"><h2>Latest uploads</h2><a class="adm-link" href="#/admin/library">Open library →</a></div>
    ${m.length ? `<div class="mgrid">${m.slice(0, 8).map((x) => mediaCard(x)).join("")}</div>` : emptyState("No media yet", "Upload your first photo or video to get started.", "image")}
    <p class="hint">Limits: photos up to ${MAX_PHOTO_MB} MB (auto-optimised), videos up to ${MAX_VIDEO_MB} MB per file.</p>`;
}

function thumb(m) {
  if (m.thumbnail_path) return `<img src="${esc(publicUrl(m.thumbnail_path))}" alt="" loading="lazy" decoding="async" />`;
  if (m.media_type === "image") return `<img src="${esc(publicUrl(m.storage_path))}" alt="" loading="lazy" decoding="async" />`;
  return `<div class="mcard__ph">${icon("video", 34)}</div>`;
}
function mediaCard(m, { select = false } = {}) {
  const live = m.status === "published";
  const file = m.file_name || m.storage_path.split("/").pop();
  return `<article class="mcard ${S.sel.has(m.id) ? "is-selected" : ""}" data-id="${m.id}">
    <div class="mcard__thumb">${thumb(m)}${m.media_type === "video" ? `<span class="mcard__play">${icon("play", 20)}</span>` : ""}
      <span class="badge badge--type">${m.media_type === "video" ? "Video" : "Photo"}</span>
      <span class="badge ${live ? "badge--live" : "badge--draft"}">${live ? "Published" : "Unpublished"}</span>
      ${select ? `<label class="mcard__check"><input type="checkbox" data-select="${m.id}" ${S.sel.has(m.id) ? "checked" : ""} aria-label="Select" /></label>` : ""}</div>
    <div class="mcard__body"><h3 title="${esc(m.title)}">${esc(m.title)}</h3><p class="mcard__file" title="${esc(file)}">${esc(file)}</p>
      <p class="mcard__meta">${fmtDate(m.created_at)} · ${fmtBytes(m.file_size, true)} · ${esc(m.category)}</p>
      <div class="mcard__actions">
        <button data-action="edit" data-id="${m.id}">${icon("edit", 16)} Edit</button>
        <button data-action="toggle-status" data-id="${m.id}">${icon(live ? "eyeoff" : "eye", 16)} ${live ? "Unpublish" : "Publish"}</button>
        <button class="is-danger" data-action="delete" data-id="${m.id}">${icon("trash", 16)} Delete</button></div></div></article>`;
}

/* ---- upload views ---- */
function viewUpload(kind) {
  const k = KINDS[kind];
  const items = S.media.filter((m) => m.media_type === kind);
  const shown = items.slice(0, S.typeLimit[kind]);
  return `<section class="a-glass up">
      <label class="dz" data-dz="${kind}"><input type="file" data-file-kind="${kind}" accept="${k.accept}" multiple hidden />
        <span class="dz__ico">${icon("upload", 34)}</span><b>Drag &amp; drop ${k.plural.toLowerCase()} here</b>
        <span>or <u>browse files</u> · ${k.formats} · max ${k.max} MB each${kind === "image" ? " · large photos are optimised automatically" : ""}</span></label>
      <div class="up__opts"><label class="field"><span>Category</span><input data-opt="category" list="catlist" maxlength="60" value="${esc(S.uploadOpts.category)}" /></label>
        <datalist id="catlist">${categories().map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
        <label class="switch"><input type="checkbox" data-opt="publish" ${S.uploadOpts.publish ? "checked" : ""} /><i></i><span>Publish immediately</span></label></div>
      <div class="stage" id="stage-${kind}"></div>
      <div class="up__bar" id="upbar-${kind}" hidden><span id="upcount-${kind}"></span>
        <button class="adm-btn adm-btn--ghost" data-action="clear-stage" data-kind="${kind}">Clear</button>
        <button class="adm-btn adm-btn--gold" data-action="start-upload" data-kind="${kind}">${icon("upload", 18)} Upload</button></div>
    </section>
    <div class="sec-head"><h2>Your ${k.plural.toLowerCase()} <small>${items.length}</small></h2></div>
    ${items.length ? `<div class="mgrid">${shown.map((x) => mediaCard(x)).join("")}</div>${items.length > shown.length ? `<div class="more"><button class="adm-btn adm-btn--ghost" data-action="more-type" data-kind="${kind}">Show more</button></div>` : ""}` : emptyState(`No ${k.plural.toLowerCase()} yet`, `Drop files above to add your first ${k.label.toLowerCase()}.`)}`;
}

function paintStage(kind) {
  const box = document.getElementById(`stage-${kind}`);
  if (!box) return;
  const list = S.stage[kind];
  box.innerHTML = list.map((it) => `<div class="sitem st-${it.state}" id="si-${it.id}">
      <div class="sitem__pv">${kind === "image" ? `<img src="${it.url}" alt="" />` : `<video src="${it.url}#t=0.5" muted preload="metadata" playsinline></video>`}</div>
      <div class="sitem__main"><input class="sitem__title" data-stage-title="${it.id}" value="${esc(it.title)}" maxlength="120" aria-label="Title" ${it.state === "uploading" || it.state === "done" ? "disabled" : ""} />
        <p>${esc(it.file.name)} · ${fmtBytes(it.file.size)}</p>
        <div class="prog"><i style="width:${Math.round(it.progress * 100)}%"></i></div>
        <p class="sitem__state">${it.state === "done" ? "Uploaded successfully" : it.state === "uploading" ? `Uploading ${Math.round(it.progress * 100)}%` : it.state === "error" ? esc(it.error) : "Ready to upload"}</p></div>
      ${it.state === "uploading" ? "" : `<button class="adm-iconbtn" data-action="remove-stage" data-kind="${kind}" data-id="${it.id}" aria-label="Remove">${icon("x", 18)}</button>`}</div>`).join("");
  const pending = list.filter((i) => i.state === "ready" || i.state === "error").length;
  const bar = document.getElementById(`upbar-${kind}`);
  if (bar) { bar.hidden = list.length === 0; document.getElementById(`upcount-${kind}`).textContent = pending ? `${pending} file${pending > 1 ? "s" : ""} ready` : "All done"; bar.querySelector("[data-action=start-upload]").disabled = S.uploading || !pending; }
}
function paintProgress(it) {
  const el = document.getElementById(`si-${it.id}`);
  if (!el) return;
  el.querySelector(".prog i").style.width = `${Math.round(it.progress * 100)}%`;
  el.querySelector(".sitem__state").textContent = `Uploading ${Math.round(it.progress * 100)}%`;
}

/* ---- library ---- */
function libraryItems() {
  const { chip, q, sort, cat } = S.f;
  let l = S.media.filter((m) => (chip === "all" || (chip === "image" && m.media_type === "image") || (chip === "video" && m.media_type === "video") || chip === m.status) && (!cat || m.category === cat));
  const needle = q.trim().toLowerCase();
  if (needle) l = l.filter((m) => `${m.title} ${m.file_name || ""}`.toLowerCase().includes(needle));
  const cmp = { newest: (a, b) => new Date(b.created_at) - new Date(a.created_at), oldest: (a, b) => new Date(a.created_at) - new Date(b.created_at), az: (a, b) => a.title.localeCompare(b.title), za: (a, b) => b.title.localeCompare(a.title) }[sort];
  return l.sort(cmp);
}
function viewLibrary() {
  const chips = [["all", "All"], ["image", "Photos"], ["video", "Videos"], ["published", "Published"], ["unpublished", "Unpublished"]];
  return `<section class="toolbar a-glass"><label class="search">${icon("library", 18)}<input data-search placeholder="Search by title or filename" value="${esc(S.f.q)}" /></label>
      <div class="chips" role="tablist">${chips.map(([k, l]) => `<button class="a-chip ${S.f.chip === k ? "adm-on" : ""}" data-chip="${k}">${l}</button>`).join("")}</div>
      <div class="selects"><select data-sort aria-label="Sort">${[["newest", "Newest"], ["oldest", "Oldest"], ["az", "Name A-Z"], ["za", "Name Z-A"]].map(([k, l]) => `<option value="${k}" ${S.f.sort === k ? "selected" : ""}>${l}</option>`).join("")}</select>
      <select data-catfilter aria-label="Category"><option value="">All categories</option>${categories().map((c) => `<option ${S.f.cat === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div></section>
    <div id="bulkbar"></div><div id="libgrid"></div>`;
}
function paintLibrary() {
  const grid = $("#libgrid");
  if (!grid) return;
  const items = libraryItems(), shown = items.slice(0, S.limit);
  $$(".a-chip").forEach((c) => c.classList.toggle("adm-on", c.dataset.chip === S.f.chip));
  grid.innerHTML = items.length
    ? `<p class="hint">${items.length} item${items.length > 1 ? "s" : ""}</p><div class="mgrid">${shown.map((x) => mediaCard(x, { select: true })).join("")}</div>${items.length > shown.length ? `<div class="more"><button class="adm-btn adm-btn--ghost" data-action="more">Show more</button></div>` : ""}`
    : emptyState(S.media.length ? "No matches" : "No media yet", S.media.length ? "Try a different search or filter." : "Upload photos or videos to build your library.", S.media.length ? "" : "image");
  paintBulk();
}
function paintBulk() {
  const b = $("#bulkbar");
  if (!b) return;
  b.innerHTML = S.sel.size ? `<div class="bulk a-glass"><b>${S.sel.size} selected</b><button class="adm-btn adm-btn--ghost" data-action="select-all">Select all shown</button>
    <button class="adm-btn adm-btn--ghost" data-action="bulk-publish">${icon("eye", 16)} Publish</button><button class="adm-btn adm-btn--ghost" data-action="bulk-unpublish">${icon("eyeoff", 16)} Unpublish</button>
    <button class="adm-btn adm-btn--danger" data-action="bulk-delete">${icon("trash", 16)} Delete</button><button class="adm-iconbtn" data-action="clear-sel" aria-label="Clear selection">${icon("x", 18)}</button></div>` : "";
}

/* ---- gallery management ---- */
function viewGallery() {
  const cats = categories();
  if (!cats.length) return emptyState("No categories yet", "Categories appear here once you upload media.", "image");
  return `<p class="hint">Organise the public gallery by category. Actions apply to every item in the category.</p>
    <div class="cats">${cats.map((c) => {
    const items = S.media.filter((m) => m.category === c), live = items.filter((m) => m.status === "published").length;
    return `<article class="cat a-glass"><div><h3>${esc(c)}</h3><p>${items.filter((m) => m.media_type === "image").length} photos · ${items.filter((m) => m.media_type === "video").length} videos · ${live} published</p></div>
        <div class="cat__actions"><button class="adm-btn adm-btn--ghost" data-action="cat-rename" data-cat="${esc(c)}">${icon("edit", 16)} Rename</button>
        <button class="adm-btn adm-btn--ghost" data-action="cat-publish" data-cat="${esc(c)}">${icon("eye", 16)} Publish all</button>
        <button class="adm-btn adm-btn--ghost" data-action="cat-unpublish" data-cat="${esc(c)}">${icon("eyeoff", 16)} Unpublish all</button>
        <a class="adm-btn adm-btn--ghost" href="#/admin/library" data-cat-open="${esc(c)}">Open</a></div></article>`;
  }).join("")}</div>`;
}

/* ---- activity ---- */
function viewActivity() {
  if (S.activityError) return errorState(S.activityError);
  if (!S.activity) return `<div class="skel skel--table"></div>`;
  if (!S.activity.length) return emptyState("No activity yet", "Logins and media changes will be listed here.");
  return `<div class="table a-glass"><table><thead><tr><th>Action</th><th>Details</th><th>Date</th><th>Time</th></tr></thead><tbody>
    ${S.activity.map((a) => { const [l, i] = ACTIONS[a.action] || [a.action, "activity"]; return `<tr><td><span class="act">${icon(i, 16)} ${esc(l)}</span></td><td>${esc(a.detail || "")}</td><td>${fmtDate(a.created_at)}</td><td>${fmtTime(a.created_at)}</td></tr>`; }).join("")}
    </tbody></table></div><p class="hint">Showing the latest 200 events. Only you can see this page.</p>`;
}

/* ---- settings ---- */
function viewSettings() {
  return `<section class="a-glass settings"><h2>${icon("key", 22)} Admin credentials</h2>
    <p class="hint">Enter your current password to change your Admin ID and/or password. You will be signed out everywhere and must log in again. Leave a field blank to keep it unchanged.</p>
    <form data-form="settings" class="auth-form" autocomplete="off">
      ${pwField("current", "Current password", "current-password")}
      <label class="field"><span>New Admin ID</span><input name="username" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="32" placeholder="Leave blank to keep current" /></label>
      ${pwField("password", "New password (min " + MIN_PASSWORD + " characters)", "new-password").replace("required", "")}
      ${pwField("confirm", "Confirm new password", "new-password").replace("required", "")}
      <p class="form-msg" id="formMsg" role="alert"></p>
      <button class="adm-btn adm-btn--gold" type="submit">Save changes</button></form></section>
    <section class="a-glass settings"><h2>${icon("clock", 22)} Session &amp; security</h2>
    <ul class="plain"><li>Automatic logout after 30 minutes of inactivity, or 12 hours after login.</li><li>Closing this browser tab ends the session.</li><li>Only one admin account exists. There is no public registration.</li></ul></section>`;
}

/* ----------------------------- modals ------------------------------- */
function openEdit(id) {
  const m = byId(id);
  if (!m) return;
  const k = KINDS[m.media_type];
  openModal(`<button class="modal__x adm-iconbtn" data-action="modal-close" aria-label="Close">${icon("x", 20)}</button><h2>Edit ${k.label.toLowerCase()}</h2>
    <form data-form="edit" data-id="${m.id}" class="auth-form">
      <div class="edit-pv">${thumb(m)}</div>
      <label class="field"><span>Title</span><input name="title" required maxlength="120" value="${esc(m.title)}" /></label>
      <label class="field"><span>Description</span><textarea name="description" rows="3" maxlength="1000">${esc(m.description || "")}</textarea></label>
      <label class="field"><span>Category</span><input name="category" required maxlength="60" list="catlist" value="${esc(m.category)}" /></label>
      <datalist id="catlist">${categories().map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
      <label class="field"><span>Status</span><select name="status"><option value="published" ${m.status === "published" ? "selected" : ""}>Published</option><option value="unpublished" ${m.status === "unpublished" ? "selected" : ""}>Unpublished</option></select></label>
      <label class="field"><span>Replace ${k.label.toLowerCase()} (optional · ${k.formats} · max ${k.max} MB)</span><input type="file" name="file" accept="${k.accept}" /></label>
      <div class="prog" id="editprog" hidden><i></i></div>
      <p class="form-msg" id="formMsg" role="alert"></p>
      <div class="modal__actions"><button type="button" class="adm-btn adm-btn--ghost" data-action="modal-close">Cancel</button><button class="adm-btn adm-btn--gold" type="submit">Save changes</button></div></form>`);
}
function quickUpload() {
  openModal(`<button class="modal__x adm-iconbtn" data-action="modal-close" aria-label="Close">${icon("x", 20)}</button><h2>Quick upload</h2><p class="modal__text">What would you like to upload?</p>
    <div class="qu"><a class="qu__tile" href="#/admin/photos" data-action="modal-close">${icon("image", 34)}<b>Photos</b><span>JPG · PNG · WEBP</span></a>
    <a class="qu__tile" href="#/admin/videos" data-action="modal-close">${icon("video", 34)}<b>Videos</b><span>MP4 · WEBM · MOV</span></a></div>`, "modal--sm");
}

/* ------------------------ file validation & media ------------------- */
async function sniff(file) {
  const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const at = (...a) => a.every((v, i) => b[i] === v);
  if (at(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (at(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return String.fromCharCode(b[8], b[9]) === "qt" ? "video/quicktime" : "video/mp4";
  if (at(0x1a, 0x45, 0xdf, 0xa3)) return "video/webm";
  return null;
}
/** Validates by real file signature (not just the name) and size. */
async function checkFile(kind, file) {
  const k = KINDS[kind];
  if (!file.size) return { error: "File is empty." };
  if (file.size > k.max * 1024 * 1024) return { error: `File too large. Maximum is ${k.max} MB.` };
  const mime = await sniff(file).catch(() => null);
  if (!mime || !k.mimes.includes(mime)) return { error: `Invalid file. Allowed: ${k.formats}.` };
  return { mime };
}

const loadBitmap = async (file) => {
  if ("createImageBitmap" in window) { try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { /* fall through */ } }
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
};
const toBlob = (bmp, edge, type, q) => {
  const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight, s = Math.min(1, edge / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob(r, type, q));
};
/** Photo: scale down very large images / re-encode heavy ones to WebP, keep original if that is not smaller. */
async function processPhoto(file, mime) {
  const bmp = await loadBitmap(file);
  const big = Math.max(bmp.width || bmp.naturalWidth, bmp.height || bmp.naturalHeight) > MAX_EDGE;
  let blob = file, type = mime;
  if (big || file.size > 800 * 1024) {
    const out = await toBlob(bmp, MAX_EDGE, "image/webp", 0.86);
    if (out && out.type === "image/webp" && (big || out.size < file.size * 0.9)) { blob = out; type = "image/webp"; }
  }
  const th = await toBlob(bmp, 480, "image/webp", 0.78);
  return { blob, type, thumb: th };
}
function videoThumb(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file), v = document.createElement("video");
    let done = false;
    const end = (b) => { if (done) return; done = true; clearTimeout(timer); URL.revokeObjectURL(url); resolve(b); };
    const timer = setTimeout(() => end(null), 8000);
    v.muted = true; v.playsInline = true; v.preload = "metadata";
    v.onloadedmetadata = () => { v.currentTime = Math.min(1, (v.duration || 2) / 2); };
    v.onseeked = () => {
      try {
        const s = Math.min(1, 640 / (v.videoWidth || 640)), c = document.createElement("canvas");
        c.width = Math.round((v.videoWidth || 640) * s); c.height = Math.round((v.videoHeight || 360) * s);
        c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
        c.toBlob((b) => end(b), "image/jpeg", 0.8);
      } catch { end(null); }
    };
    v.onerror = () => end(null);
    v.src = url;
  });
}

/** Upload with real progress (supabase-js has no progress callback). Authorised by the admin's JWT + storage RLS. */
async function xhrUpload(path, blob, type, onProgress) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw Object.assign(new Error("not authorized"), { status: 401 });
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("POST", `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`);
    x.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    x.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    x.setRequestHeader("Content-Type", type);
    x.setRequestHeader("x-upsert", "false");
    x.setRequestHeader("cache-control", "max-age=31536000");
    x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    x.onload = () => {
      if (x.status >= 200 && x.status < 300) return resolve();
      let msg = ""; try { msg = JSON.parse(x.responseText).message; } catch { /* ignore */ }
      reject(Object.assign(new Error(msg || `HTTP ${x.status}`), { status: x.status }));
    };
    x.onerror = () => reject(new Error("network"));
    x.ontimeout = () => reject(new Error("network"));
    x.send(blob);
  });
}
const extOf = (type) => EXT[type] || "bin";

/** Process + upload one file (and its thumbnail). Returns the storage fields; cleans up on failure. */
async function storeFile(kind, file, mime, onProgress) {
  const uid = S.user.id, id = crypto.randomUUID(), made = [];
  try {
    let blob = file, type = mime, th;
    if (kind === "image") ({ blob, type, thumb: th } = await processPhoto(file, mime)); else th = await videoThumb(file);
    const thumbPath = th ? `${uid}/thumbs/${id}.${extOf(th.type)}` : null;
    if (thumbPath) { await xhrUpload(thumbPath, th, th.type); made.push(thumbPath); }
    const path = `${uid}/${id}.${extOf(type)}`;
    await xhrUpload(path, blob, type, onProgress); made.push(path);
    return { storage_path: path, thumbnail_path: thumbPath, file_size: blob.size, made };
  } catch (e) {
    if (made.length) await supabase.storage.from(BUCKET).remove(made).catch(() => { });
    throw e;
  }
}
const removeFiles = async (paths) => {
  const list = paths.filter(Boolean);
  if (!list.length) return true;
  const { data, error } = await supabase.storage.from(BUCKET).remove(list);
  return !error && (data?.length || 0) >= list.length;
};

/* ------------------------------ actions ----------------------------- */
async function addFiles(kind, files) {
  for (const file of files) {
    const { mime, error } = await checkFile(kind, file);
    if (error) { toast(`${file.name}: ${error}`, "error"); continue; }
    S.stage[kind].push({ id: crypto.randomUUID(), file, mime, title: baseName(file.name) || "Untitled", url: URL.createObjectURL(file), state: "ready", progress: 0, error: "" });
  }
  paintStage(kind);
}
async function startUpload(kind) {
  if (S.uploading) return;
  const queue = S.stage[kind].filter((i) => i.state === "ready" || i.state === "error");
  if (!queue.length) return;
  S.uploading = true;
  S.uploadOpts.category = ($("[data-opt=category]")?.value.trim() || "General").slice(0, 60);
  S.uploadOpts.publish = $("[data-opt=publish]")?.checked ?? true;
  paintStage(kind);
  let ok = 0, bad = 0;
  for (const it of queue) {
    it.state = "uploading"; it.progress = 0; it.error = ""; paintStage(kind);
    try {
      const st = await storeFile(kind, it.file, it.mime, (p) => { it.progress = p; paintProgress(it); });
      const row = { title: it.title.trim() || "Untitled", category: S.uploadOpts.category, media_type: kind, storage_path: st.storage_path, thumbnail_path: st.thumbnail_path, file_name: it.file.name.slice(0, 200), file_size: st.file_size, status: S.uploadOpts.publish ? "published" : "unpublished" };
      const { data, error } = await supabase.from("gallery_media").insert(row).select().single();
      if (error) { await removeFiles(st.made); throw Object.assign(error, { db: true }); }
      S.media.unshift(data); it.state = "done"; it.progress = 1; ok++;
    } catch (e) { it.state = "error"; it.error = uploadError(e); bad++; }
    paintStage(kind);
  }
  S.uploading = false;
  S.stage[kind].filter((i) => i.state === "done").forEach((i) => URL.revokeObjectURL(i.url));
  S.stage[kind] = S.stage[kind].filter((i) => i.state !== "done");
  if (ok) toast(ok > 1 ? `${ok} ${KINDS[kind].plural.toLowerCase()} uploaded successfully.` : `${KINDS[kind].label} uploaded successfully.`);
  if (bad) toast("Upload failed. Please try again.", "error");
  renderView();
}

async function setStatus(ids, status) {
  const { data, error } = await supabase.from("gallery_media").update({ status }).in("id", ids).select();
  if (error || !data?.length) return toast(error ? friendly(error) : "You are not authorized to perform this action.", "error");
  data.forEach((row) => { const i = S.media.findIndex((m) => m.id === row.id); if (i >= 0) S.media[i] = row; });
  toast(status === "published" ? (data.length > 1 ? `${data.length} items published.` : "Published. It is now visible on the website.") : (data.length > 1 ? `${data.length} items unpublished.` : "Unpublished. It is now hidden from the website."));
  refresh();
}
async function deleteItems(items) {
  const ids = items.map((m) => m.id);
  // Database first (the source of truth), then storage. .select() proves the rows were really deleted.
  const { data, error } = await supabase.from("gallery_media").delete().in("id", ids).select("id");
  if (error) return toast(friendly(error), "error");
  const gone = new Set((data || []).map((r) => r.id));
  if (!gone.size) return toast("You are not authorized to perform this action.", "error");
  const removed = items.filter((m) => gone.has(m.id));
  S.media = S.media.filter((m) => !gone.has(m.id)); removed.forEach((m) => S.sel.delete(m.id));
  const cleaned = await removeFiles(removed.flatMap((m) => [m.storage_path, m.thumbnail_path]));
  if (cleaned) toast(removed.length > 1 ? `${removed.length} items deleted.` : "Media deleted.");
  else toast("Deleted from the library, but some files could not be removed from storage. Check Storage in Supabase.", "error");
  refresh();
}
function refresh() { if (S.view === "library") { paintLibrary(); } else renderView(); }

async function saveEdit(form) {
  const m = byId(form.dataset.id);
  if (!m) return;
  const fd = new FormData(form), file = fd.get("file");
  const patch = { title: String(fd.get("title")).trim(), description: String(fd.get("description")).trim() || null, category: String(fd.get("category")).trim() || "General", status: String(fd.get("status")) };
  if (!patch.title) return setMsg("Title is required.");
  busy(form, true); setMsg("");
  let stored = null;
  try {
    if (file instanceof File && file.size) {
      const { mime, error } = await checkFile(m.media_type, file);
      if (error) { busy(form, false); return setMsg(error); }
      const bar = $("#editprog"); bar.hidden = false;
      stored = await storeFile(m.media_type, file, mime, (p) => { bar.firstElementChild.style.width = `${Math.round(p * 100)}%`; });
      Object.assign(patch, { storage_path: stored.storage_path, thumbnail_path: stored.thumbnail_path, file_size: stored.file_size, file_name: file.name.slice(0, 200) });
    }
    const { data, error } = await supabase.from("gallery_media").update(patch).eq("id", m.id).select().single();
    if (error) { if (stored) await removeFiles(stored.made); throw Object.assign(error, { db: true }); }
    if (stored) await removeFiles([m.storage_path, m.thumbnail_path]); // old file only after the new one is safely saved
    S.media[S.media.findIndex((x) => x.id === m.id)] = data;
    closeModal(); toast("Changes saved."); refresh();
  } catch (e) { busy(form, false); setMsg(e?.db ? friendly(e) : uploadError(e)); }
}

async function saveCategoryRename(form) {
  const from = form.dataset.cat, to = String(new FormData(form).get("name")).trim().slice(0, 60);
  if (!to) return setMsg("Enter a category name.");
  busy(form, true);
  const { data, error } = await supabase.from("gallery_media").update({ category: to }).eq("category", from).select();
  if (error || !data?.length) { busy(form, false); return setMsg(error ? friendly(error) : "You are not authorized to perform this action."); }
  data.forEach((row) => { const i = S.media.findIndex((m) => m.id === row.id); if (i >= 0) S.media[i] = row; });
  closeModal(); toast("Category renamed."); renderView();
}

async function saveSettings(form) {
  const fd = new FormData(form);
  const cur = String(fd.get("current")), name = String(fd.get("username")).trim().toLowerCase(), pw = String(fd.get("password")), cf = String(fd.get("confirm"));
  if (!cur) return setMsg("Enter your current password.");
  if (!name && !pw) return setMsg("Enter a new Admin ID and/or a new password.");
  if (pw && pw.length < MIN_PASSWORD) return setMsg(`New password must be at least ${MIN_PASSWORD} characters.`);
  if (pw !== cf) return setMsg("New password and confirmation do not match.");
  busy(form, true); setMsg("");
  const { error } = await supabase.functions.invoke("admin-settings", { body: { current_password: cur, new_username: name || undefined, new_password: pw || undefined } });
  if (error) { const { status, msg } = await fnError(error); busy(form, false); return setMsg(msg || (status === 429 ? "Too many failed attempts. Try again in 15 minutes." : "Could not save changes. Please try again.")); }
  S.notice = "Credentials updated. Please sign in again.";
  await supabase.auth.signOut({ scope: "local" });
  if (parseRoute()?.page !== "admin-login") go("#/admin-login"); // SIGNED_OUT may already have done this
}

/* ------------------------------ events ------------------------------ */
async function onClick(e) {
  const pw = e.target.closest("[data-toggle-pw]");
  if (pw) { const i = pw.parentElement.querySelector("input"); const show = i.type === "password"; i.type = show ? "text" : "password"; pw.innerHTML = icon(show ? "eyeoff" : "eye", 18); return; }
  const open = e.target.closest("[data-cat-open]");
  if (open) { S.f = { chip: "all", q: "", sort: "newest", cat: open.dataset.catOpen }; S.limit = PAGE; return; }
  const chip = e.target.closest("[data-chip]");
  if (chip) { S.f.chip = chip.dataset.chip; S.limit = PAGE; return paintLibrary(); }
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const { action, id, kind, cat } = el.dataset;
  switch (action) {
    case "logout": return doLogout();
    case "open-menu": $("#admSide").classList.add("adm-open"); $(".adm-scrim").classList.add("adm-open"); return;
    case "close-menu": $("#admSide").classList.remove("adm-open"); $(".adm-scrim").classList.remove("adm-open"); return;
    case "quick-upload": return quickUpload();
    case "modal-close": return closeModal();
    case "confirm-yes": { const r = confirmResolve; confirmResolve = null; closeModal(); return r?.(true); }
    case "confirm-no": return closeModal();
    case "reload": S.loadError = ""; return loadMedia();
    case "cancel-recovery": S.recovery = false; await supabase.auth.signOut({ scope: "local" }); return go("#home");
    case "show-recover": return renderRecover();
    case "show-login": return renderLogin();
    case "edit": return openEdit(id);
    case "toggle-status": { const m = byId(id); return m && setStatus([id], m.status === "published" ? "unpublished" : "published"); }
    case "delete": { const m = byId(id); if (m && await confirmDialog("Are you sure you want to delete this media?", { title: "Delete media" })) await deleteItems([m]); return; }
    case "remove-stage": { const it = S.stage[kind].find((i) => i.id === id); if (it) URL.revokeObjectURL(it.url); S.stage[kind] = S.stage[kind].filter((i) => i.id !== id); return paintStage(kind); }
    case "clear-stage": if (!S.uploading) { S.stage[kind].forEach((i) => URL.revokeObjectURL(i.url)); S.stage[kind] = []; paintStage(kind); } return;
    case "start-upload": return startUpload(kind);
    case "more": S.limit += PAGE; return paintLibrary();
    case "more-type": S.typeLimit[kind] += PAGE; return renderView();
    case "select-all": libraryItems().slice(0, S.limit).forEach((m) => S.sel.add(m.id)); return paintLibrary();
    case "clear-sel": S.sel.clear(); return paintLibrary();
    case "bulk-publish": return setStatus([...S.sel], "published");
    case "bulk-unpublish": return setStatus([...S.sel], "unpublished");
    case "bulk-delete": { const items = [...S.sel].map(byId).filter(Boolean); if (items.length && await confirmDialog(`Are you sure you want to delete ${items.length} selected item${items.length > 1 ? "s" : ""}? This cannot be undone.`, { title: "Delete media" })) await deleteItems(items); return; }
    case "cat-rename": return openModal(`<button class="modal__x adm-iconbtn" data-action="modal-close" aria-label="Close">${icon("x", 20)}</button><h2>Rename category</h2><form data-form="cat" data-cat="${esc(cat)}" class="auth-form"><label class="field"><span>New name</span><input name="name" maxlength="60" value="${esc(cat)}" required /></label><p class="form-msg" id="formMsg"></p><div class="modal__actions"><button type="button" class="adm-btn adm-btn--ghost" data-action="modal-close">Cancel</button><button class="adm-btn adm-btn--gold" type="submit">Rename</button></div></form>`, "modal--sm");
    case "cat-publish": case "cat-unpublish": {
      const ids = S.media.filter((m) => m.category === cat).map((m) => m.id), pub = action === "cat-publish";
      if (pub || await confirmDialog(`Hide all ${ids.length} items in "${cat}" from the public website?`, { title: "Unpublish category", yes: "Unpublish", danger: false })) await setStatus(ids, pub ? "published" : "unpublished");
    }
  }
}
function onSubmit(e) {
  const form = e.target.closest("[data-form]");
  if (!form) return;
  e.preventDefault();
  ({ login: doLogin, recover: doRecover, reset: doReset, settings: saveSettings, edit: saveEdit, cat: saveCategoryRename })[form.dataset.form]?.(form);
}
function onChange(e) {
  const t = e.target;
  if (t.matches("[data-file-kind]")) { void addFiles(t.dataset.fileKind, [...t.files]); t.value = ""; }
  else if (t.matches("[data-select]")) { t.checked ? S.sel.add(t.dataset.select) : S.sel.delete(t.dataset.select); t.closest(".mcard")?.classList.toggle("is-selected", t.checked); paintBulk(); }
  else if (t.matches("[data-sort]")) { S.f.sort = t.value; paintLibrary(); }
  else if (t.matches("[data-catfilter]")) { S.f.cat = t.value; paintLibrary(); }
  else if (t.matches("[data-opt=publish]")) S.uploadOpts.publish = t.checked;
}
let searchTimer;
function onInput(e) {
  const t = e.target;
  if (t.matches("[data-search]")) { clearTimeout(searchTimer); searchTimer = setTimeout(() => { S.f.q = t.value; S.limit = PAGE; paintLibrary(); }, 150); }
  else if (t.matches("[data-stage-title]")) { for (const k of ["image", "video"]) { const it = S.stage[k].find((i) => i.id === t.dataset.stageTitle); if (it) it.title = t.value; } }
  else if (t.matches("[data-opt=category]")) S.uploadOpts.category = t.value;
}
function onDrag(e) {
  const dz = e.target.closest?.("[data-dz]");
  if (!parseRoute()) return;
  e.preventDefault(); // never let the browser navigate to a dropped file
  if (!dz) return;
  if (e.type === "dragover") dz.classList.add("is-over");
  else if (e.type === "dragleave") dz.classList.remove("is-over");
  else if (e.type === "drop") { dz.classList.remove("is-over"); void addFiles(dz.dataset.dz, [...(e.dataTransfer?.files || [])]); }
}

/* ------------------------------- boot ------------------------------- */
export function initAdmin() {
  // If the host serves index.html for /admin or /admin-login, map the path to the hash route.
  const p = location.pathname.replace(/\/+$/, "");
  const m = p.match(/\/(admin-login|admin)(?:\/([a-z-]+))?$/);
  if (m && !location.hash.startsWith("#/admin")) history.replaceState(null, "", `${p.slice(0, m.index) || "/"}#/${m[1]}${m[2] ? "/" + m[2] : ""}`);

  window.addEventListener("hashchange", () => { closeModal(); void route(); });
  supabase.auth.onAuthStateChange((event) => setTimeout(() => onAuth(event), 0));
  root.addEventListener("click", onClick); root.addEventListener("submit", onSubmit);
  root.addEventListener("change", onChange); root.addEventListener("input", onInput);
  ["dragover", "dragleave", "drop"].forEach((t) => window.addEventListener(t, onDrag));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#admModal")?.firstChild) closeModal(); });
  void route();
}
