import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient("https://gycjkrhdyjydxfwwrcyn.supabase.co", "sb_publishable_tzqF-UQKr-3DM3v5a1NjcA_DBvzlRO4", { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
let user = null, cloudTimer = null, timerStarted = null, timerElapsed = 0, ticker = null, syncChannel = null, refreshListenersInstalled = false;
const el = id => document.getElementById(id);
function authMsg(msg, error=false) { el("auth-message").textContent=msg; el("auth-message").className=error?"mt-3 text-sm text-red-600":"mt-3 text-sm text-emerald-700"; }
function showAuth(show) { el("auth-screen").classList.toggle("hidden",!show); document.querySelector("header").classList.toggle("hidden",show); document.querySelector("main").classList.toggle("hidden",show); el("pwa-tools").classList.toggle("hidden",show); }
let currentAuthMode = "login";
window.setAuthMode = mode => { currentAuthMode=mode; const signup=mode==="signup"; el("auth-title").textContent=signup?"Create your account":"Welcome back"; el("auth-subtitle").textContent=signup?"Start tracking your freelance work.":"Sign in to access your workspace."; el("auth-submit").textContent=signup?"Create account":"Sign in"; el("auth-mode-toggle").textContent=signup?"Already have an account? Sign in":"New to FreelanceFlow? Create account"; el("auth-mode-toggle").dataset.mode=signup?"login":"signup"; authMsg(""); };
let authSubmitting = false;

window.loadCloud = async () => {
 if (!user) throw new Error("Your session has expired. Please sign in again.");
 const [clientsResult, projectsResult, entriesResult] = await Promise.all([
  supabase.from("clients").select("id,name,contact,notes,created_at").eq("user_id", user.id).order("created_at", {ascending:true}),
  supabase.from("projects").select("id,client_id,name,hourly_rate,max_hours,currency,created_at").eq("user_id", user.id).order("created_at", {ascending:true}),
  supabase.from("time_entries").select("id,project_id,work_date,hours,description,source,created_at").eq("user_id", user.id).order("work_date", {ascending:false})
 ]);
 for (const result of [clientsResult, projectsResult, entriesResult]) {
  if (result.error) throw result.error;
 }
 appData.clients = (clientsResult.data || []).map(c => ({id:c.id,name:c.name,contact:c.contact||"",notes:c.notes||""}));
 appData.projects = (projectsResult.data || []).map(p => ({id:p.id,clientId:p.client_id,name:p.name,hourlyRate:Number(p.hourly_rate)||0,maxHours:p.max_hours==null?null:Number(p.max_hours),currency:p.currency||"EUR"}));
 appData.entries = (entriesResult.data || []).map(e => ({id:e.id,projectId:e.project_id,date:e.work_date,hours:Number(e.hours)||0,description:e.description||"",source:e.source||"manual"}));
 if (typeof populateSelects === "function") populateSelects();
 if (typeof renderDashboard === "function") renderDashboard();
 if (typeof renderProjectsGrid === "function") renderProjectsGrid();
 if (typeof renderReportTable === "function") renderReportTable();
 if (typeof window.renderAdvancedAnalytics === "function") window.renderAdvancedAnalytics();
};
window.restoreTimer = async () => {
 if (!user) return;
 const {data,error} = await supabase.from("timer_sessions").select("id,project_id,description,started_at,elapsed_seconds,status").eq("user_id",user.id).in("status",["running","paused"]).order("created_at",{ascending:false}).limit(1).maybeSingle();
 if (error) throw error;
 if (!data) { cloudTimer=null; timerStarted=null; timerElapsed=0; return; }
 cloudTimer=data;
 timerElapsed=Number(data.elapsed_seconds)||0;
 timerStarted=data.status==="running" ? new Date(data.started_at).getTime() : null;
};
window.resetTimerUI = () => {
 cloudTimer=null; timerStarted=null; timerElapsed=0;
 if (typeof stopTicker === "function") stopTicker();
 const badge=el("quick-timer-badge");
 if (badge) badge.classList.add("hidden");
 const display=el("quick-timer-display");
 if (display) display.textContent="00:00:00";
 if (typeof isTimerRunning !== "undefined") isTimerRunning=false;
};

let workspacePromise = null;
async function enterWorkspace(session) {
 if (!session?.user) throw new Error("The login response did not contain a user session.");
 if (user?.id === session.user.id && workspacePromise) return workspacePromise;
 user = session.user;
 showAuth(false);
 workspacePromise = (async () => {
  try {
   if (typeof window.initApp !== "function") throw new Error("The workspace initializer is unavailable. Please refresh the page.");
   window.initApp();
   await window.loadCloud();
   await window.restoreTimer();
   await refreshBilling();
  } catch (e) {
   user = null;
   workspacePromise = null;
   showAuth(true);
   authMsg("Login succeeded, but your workspace could not load: " + e.message, true);
   throw e;
  }
 })();
 return workspacePromise;
}
window.submitAuth = async () => {
 const email=el("auth-email").value.trim(), password=el("auth-password").value;
 if(!email||password.length<8)return authMsg("Enter a valid email and a password of at least 8 characters.",true);
 if(authSubmitting)return;
 authSubmitting=true;
 const mode=currentAuthMode, button=el("auth-submit");
 button.disabled=true;
 button.textContent=mode==="signup"?"Creating account...":"Signing in...";
 authMsg(mode==="signup"?"Creating your account...":"Signing in...");
 let timeoutId;
 try {
  const request = mode==="signup"
   ? supabase.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}})
   : supabase.auth.signInWithPassword({email,password});
  const {data,error}=await Promise.race([request,new Promise((_,reject)=>{timeoutId=setTimeout(()=>reject(new Error("The request is taking too long. Check your internet connection and try again.")),15000);})]);
  if(error)throw error;
  if(mode==="signup"&&!data.session){authMsg("Check your inbox to confirm your email, then sign in.");return;}
  if(data.session){await enterWorkspace(data.session);return;}
  const sessionResult=await supabase.auth.getSession();
  if(sessionResult.error)throw sessionResult.error;
  if(sessionResult.data.session){await enterWorkspace(sessionResult.data.session);return;}
  authMsg("Login was accepted, but no active session was returned. Please try again.",true);
 } catch(e) {
  authMsg(e.message||"Unable to sign in. Please try again.",true);
 } finally {
  if(timeoutId)clearTimeout(timeoutId);
  authSubmitting=false;
  button.disabled=false;
  button.textContent=currentAuthMode==="signup"?"Create account":"Sign in";
 }
};
window.showSaveTimerOption=async()=>{if(!cloudTimer)return;if(isTimerRunning&&timerStarted){timerElapsed+=Math.floor((Date.now()-timerStarted)/1000);timerStarted=null;isTimerRunning=false;stopTicker();}const hours=Number((timerElapsed/3600).toFixed(2));if(hours<=0)return alert("Timer duration is too short.");let {error}=await supabase.from("time_entries").insert({user_id:user.id,project_id:cloudTimer.project_id,work_date:new Date().toISOString().slice(0,10),hours,description:cloudTimer.description,source:"timer"});if(error)return alert(error.message);({error}=await supabase.from("timer_sessions").update({status:"saved",elapsed_seconds:timerElapsed,stopped_at:new Date().toISOString()}).eq("id",cloudTimer.id));if(error)return alert(error.message);resetTimerUI();await loadCloud();switchTab("dashboard");};
window.resetTimer=async()=>{if(cloudTimer){const {error}=await supabase.from("timer_sessions").update({status:"discarded",elapsed_seconds:timerElapsed,stopped_at:new Date().toISOString()}).eq("id",cloudTimer.id);if(error)return alert(error.message);}resetTimerUI();};
window.saveClient=async e=>{e.preventDefault();const name=el("client-name").value.trim(),contact=el("client-contact").value.trim();if(!name)return;const {error}=await supabase.from("clients").insert({user_id:user.id,name,contact:contact||null});if(error)return alert(error.message);closeModal("modal-client");el("form-client").reset();await loadCloud();};
window.saveProject=async e=>{e.preventDefault();const client_id=el("project-client-id").value,name=el("project-name").value.trim(),hourly_rate=Number(el("project-rate").value),max_hours=el("project-max-hours").value?Number(el("project-max-hours").value):null;if(!client_id||!name||!Number.isFinite(hourly_rate)||hourly_rate<0)return alert("Check project details.");const {error}=await supabase.from("projects").insert({user_id:user.id,client_id,name,hourly_rate,max_hours,currency:"EUR"});if(error)return alert(error.message);closeModal("modal-project");el("form-project").reset();await loadCloud();};
window.saveManualEntry=async e=>{e.preventDefault();const project_id=el("manual-project-select").value,work_date=el("manual-date").value,hours=Number(el("manual-hours").value),description=el("manual-description").value.trim();if(!project_id||!work_date||!Number.isFinite(hours)||hours<=0||hours>24)return alert("Enter a project, date and hours between 0 and 24.");const {error}=await supabase.from("time_entries").insert({user_id:user.id,project_id,work_date,hours,description:description||null,source:"manual"});if(error)return alert(error.message);el("form-manual-entry").reset();el("manual-date").value=new Date().toISOString().slice(0,10);await loadCloud();switchTab("dashboard");};
window.deleteEntry=async id=>{if(!confirm("Delete this time entry?"))return;const {error}=await supabase.from("time_entries").delete().eq("id",id);if(error)return alert(error.message);await loadCloud();};
window.deleteProject=async id=>{if(!confirm("Delete this project? Its time entries must be deleted first."))return;const {error}=await supabase.from("projects").delete().eq("id",id);if(error)return alert(error.message);await loadCloud();};
window.onload=async()=>{el("manual-date").value=new Date().toISOString().slice(0,10);el("report-gen-date").textContent=new Date().toLocaleDateString("en-GB");lucide.createIcons();try{const {data,error}=await supabase.auth.getSession();if(error)throw error;if(!data.session){showAuth(true);window.setAuthMode("login");return;}await enterWorkspace(data.session);}catch(e){console.error("FreelanceFlow startup failed",e);showAuth(true);authMsg("Your session could not be loaded: "+e.message,true);}};
supabase.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_IN"&&session&&!user){setTimeout(()=>enterWorkspace(session).catch(error=>console.error("Workspace initialization failed",error)),0);}if(event==="SIGNED_OUT"){user=null;workspacePromise=null;if(syncChannel){supabase.removeChannel(syncChannel);syncChannel=null;}resetTimerUI();showAuth(true);window.setAuthMode("login");}});

const BILLING_FUNCTIONS = { checkout: "create-checkout-session", portal: "create-portal-session" };
window.refreshBilling = async () => {
 const msg = el("billing-message"), current = el("billing-current-plan");
 if (!user) { if(msg)msg.textContent="Sign in to view your subscription."; return; }
 if(msg)msg.textContent="Refreshing subscription…";
 const {data,error}=await supabase.from("subscriptions").select("*").eq("user_id",user.id).maybeSingle();
 if(error){if(msg)msg.textContent="Could not load subscription: "+error.message;return;}
 const status=data?.status||"free", plan=data?.plan_key||"free";
 window.freelanceFlowPlan = ["active","trialing"].includes(status) ? status : "free";
 if (document.getElementById("tab-analytics") && !document.getElementById("tab-analytics").classList.contains("hidden")) window.renderAdvancedAnalytics?.();
 const badge=el("billing-status-badge"), portal=el("billing-portal-button"), upgrade=el("billing-upgrade-button");
 if(badge){badge.textContent=status==="trialing"?"Free trial":status==="active"?"Pro active":status==="past_due"?"Payment issue":status==="canceled"?"Canceled":"Free plan";}
 if(current){
  const labels={free:"You are currently on the Free plan.",trialing:"Your Pro free trial is active.",active:"Your FreelanceFlow Pro subscription is active.",past_due:"Your latest payment needs attention. Update your payment method in the billing portal.",canceled:"Your Pro subscription is canceled.",unpaid:"Your subscription is unpaid.",incomplete:"Checkout has not been completed yet."};
  let extra="";
  if(data?.trial_end)extra=" Trial ends: "+new Date(data.trial_end).toLocaleDateString();
  if(data?.current_period_end)extra=" Current period ends: "+new Date(data.current_period_end).toLocaleDateString();
  current.textContent=(labels[status]||"Subscription status: "+status)+extra;
 }
 if(portal)portal.classList.toggle("hidden",!data?.stripe_customer_id);
 if(upgrade)upgrade.classList.toggle("hidden",["trialing","active"].includes(status));
 if(msg)msg.textContent="Subscription details updated.";
};
window.openProCheckout = async () => {
 const msg=el("billing-message"), button=el("billing-upgrade-button");
 if(!user){if(msg)msg.textContent="Please sign in first.";return;}
 if(button){button.disabled=true;button.textContent="Opening secure checkout…";}
 if(msg)msg.textContent="Connecting to Stripe test checkout…";
 try{
  const {data,error}=await supabase.functions.invoke(BILLING_FUNCTIONS.checkout,{body:{}});
  if(error)throw error;
  if(!data?.url)throw new Error(data?.error||"Checkout URL was not returned.");
  location.href=data.url;
 }catch(e){if(msg)msg.textContent=e.message+" If setup is incomplete, add the staging Stripe secrets in Supabase first.";}
 finally{if(button){button.disabled=false;button.textContent="Start 7-day free trial";}}
};
window.openBillingPortal = async () => {
 const msg=el("billing-message"), button=el("billing-portal-button");
 if(button){button.disabled=true;button.textContent="Opening billing portal…";}
 try{
  const {data,error}=await supabase.functions.invoke(BILLING_FUNCTIONS.portal,{body:{}});
  if(error)throw error;
  if(!data?.url)throw new Error(data?.error||"Portal URL was not returned.");
  location.href=data.url;
 }catch(e){if(msg)msg.textContent=e.message;}
 finally{if(button){button.disabled=false;button.textContent="Manage subscription & payment method";}}
};

window.escapeHTML = value => String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
