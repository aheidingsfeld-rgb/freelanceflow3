import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const style = document.createElement("style");
style.textContent = `
  #ff-auth-gate{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:#f8fafc;padding:24px;font-family:Inter,system-ui,sans-serif}
  #ff-auth-gate[hidden]{display:none}
  .ff-auth-card{width:min(100%,420px);background:white;border:1px solid #e2e8f0;border-radius:22px;padding:30px;box-shadow:0 18px 50px #0f172a12}
  .ff-auth-card h2{font-size:24px;font-weight:750;color:#0f172a;margin:0 0 6px}
  .ff-auth-card p{color:#64748b;font-size:14px;margin:0 0 22px}
  .ff-auth-card label{display:block;font-size:12px;font-weight:650;color:#475569;margin:14px 0 6px}
  .ff-auth-card input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:10px;font-size:14px}
  .ff-auth-actions{display:flex;gap:8px;margin-top:18px}
  .ff-auth-actions button,.ff-auth-link{border:0;border-radius:10px;padding:11px 14px;font-weight:650;cursor:pointer}
  .ff-auth-primary{background:#2563eb;color:white;flex:1}
  .ff-auth-secondary{background:#eff6ff;color:#1d4ed8}
  #ff-auth-message{min-height:20px;margin-top:14px;font-size:13px;color:#b45309}
  #ff-auth-user{font-size:12px;color:#64748b;margin-left:8px}
`;
document.head.append(style);

const gate = document.createElement("section");
gate.id = "ff-auth-gate";
gate.innerHTML = `
  <div class="ff-auth-card">
    <div style="font-size:12px;font-weight:750;letter-spacing:.12em;color:#2563eb;margin-bottom:12px">FREELANCEFLOW</div>
    <h2 id="ff-auth-title">Welcome back</h2>
    <p id="ff-auth-subtitle">Sign in to securely access your workspace.</p>
    <form id="ff-auth-form">
      <label for="ff-auth-email">Email address</label>
      <input id="ff-auth-email" type="email" autocomplete="email" required maxlength="254">
      <label for="ff-auth-password">Password</label>
      <input id="ff-auth-password" type="password" autocomplete="current-password" required minlength="8">
      <div class="ff-auth-actions">
        <button class="ff-auth-primary" id="ff-auth-submit" type="submit">Sign in</button>
        <button class="ff-auth-secondary" id="ff-auth-signup" type="button">Create account</button>
      </div>
    </form>
    <button class="ff-auth-link" id="ff-auth-reset" type="button" style="padding-left:0;background:transparent;color:#2563eb;margin-top:12px">Forgot password?</button>
    <div id="ff-auth-message" role="status" aria-live="polite"></div>
  </div>`;
document.body.append(gate);

const form = gate.querySelector("#ff-auth-form");
const email = gate.querySelector("#ff-auth-email");
const password = gate.querySelector("#ff-auth-password");
const message = gate.querySelector("#ff-auth-message");
let mode = "signin";
let currentSession = null;

function setMessage(text, error = true) {
  message.textContent = text;
  message.style.color = error ? "#b45309" : "#047857";
}
function setMode(next) {
  mode = next;
  gate.querySelector("#ff-auth-title").textContent = mode === "signup" ? "Create your account" : "Welcome back";
  gate.querySelector("#ff-auth-subtitle").textContent = mode === "signup" ? "Start your personal freelance workspace." : "Sign in to securely access your workspace.";
  gate.querySelector("#ff-auth-submit").textContent = mode === "signup" ? "Create account" : "Sign in";
  gate.querySelector("#ff-auth-signup").hidden = mode === "signup";
  password.autocomplete = mode === "signup" ? "new-password" : "current-password";
  setMessage("");
}
function renderSession(session) {
  currentSession = session;
  const signedIn = Boolean(session?.user);
  gate.hidden = signedIn;
  document.body.style.overflow = signedIn ? "" : "hidden";
  let userNode = document.getElementById("ff-auth-user");
  if (!userNode) {
    userNode = document.createElement("span");
    userNode.id = "ff-auth-user";
    document.querySelector("header .flex.items-center.gap-3")?.append(userNode);
  }
  if (signedIn) {
    userNode.textContent = session.user.email || "Signed in";
    let signout = document.getElementById("ff-auth-signout");
    if (!signout) {
      signout = document.createElement("button");
      signout.id = "ff-auth-signout";
      signout.type = "button";
      signout.className = "text-xs font-semibold text-slate-600 border rounded-lg px-3 py-2";
      signout.textContent = "Sign out";
      signout.addEventListener("click", async () => {
        const { error } = await supabase.auth.signOut();
        if (error) setMessage(error.message);
      });
      document.querySelector("header .flex.justify-between.h-16")?.append(signout);
    }
    signout.hidden = false;
  } else {
    if (userNode) userNode.textContent = "";
    const signout = document.getElementById("ff-auth-signout");
    if (signout) signout.hidden = true;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = gate.querySelector("#ff-auth-submit");
  button.disabled = true;
  setMessage("Please wait…", false);
  try {
    const credentials = { email: email.value.trim(), password: password.value };
    const result = mode === "signup"
      ? await supabase.auth.signUp({ ...credentials, options: { emailRedirectTo: location.origin + location.pathname } })
      : await supabase.auth.signInWithPassword(credentials);
    if (result.error) throw result.error;
    if (mode === "signup" && !result.data.session) {
      setMessage("Check your email to confirm your account. Then return here to sign in.", false);
    } else {
      setMessage("Signed in successfully.", false);
    }
  } catch (error) {
    setMessage(error.message || "Authentication failed.");
  } finally {
    button.disabled = false;
  }
});
gate.querySelector("#ff-auth-signup").addEventListener("click", () => setMode("signup"));
gate.querySelector("#ff-auth-reset").addEventListener("click", async () => {
  if (!email.value.trim()) return setMessage("Enter your email address first.");
  const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
    redirectTo: location.origin + location.pathname
  });
  setMessage(error ? error.message : "If an account exists, a password reset email has been sent.", !error);
});
supabase.auth.onAuthStateChange((_event, session) => renderSession(session));
const { data, error } = await supabase.auth.getSession();
if (error) setMessage(error.message);
renderSession(data?.session || null);

window.freelanceFlowSupabase = supabase;
window.freelanceFlowGetSession = () => currentSession;
