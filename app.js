/* ====== CONFIG SUPABASE ====== */
const SUPABASE_URL = "https://feiygnfxolxetwfrjfsh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlaXlnbmZ4b2x4ZXR3ZnJqZnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxOTU1MjAsImV4cCI6MjA3Mjc3MTUyMH0.ge5Ciw_9MvIGR4y8JznteQV8sICcCBzivEapGxWnFbI";
const BUCKET = "portafolio";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* Ruta fija para la foto de perfil en Storage */
const PROFILE_PATH = "perfil/aldair.jpg";

/* ====== ADMINS: solo estos correos verán herramientas admin ====== */
const ADMIN_EMAILS = [
  "ulises@gmail.com",
  "sanchezaldair362@gmail.com",
  "sanchezaldair363@gmail.com",
].map(e => e.toLowerCase());

let isAdmin = false;

/* ====== CURSOS ====== */
const COURSES = {
  "arquitectura":   { name: "Arquitectura de Software", weeks: 16, icon: "bi-diagram-3" },
  "seguridad-ti":   { name: "Seguridad de TI",          weeks: 16, icon: "bi-shield-lock" },
  "business-intel": { name: "Inteligencia de Negocios", weeks: 16, icon: "bi-graph-up" },
};

/* ====== HELPERS ====== */
const qs = (s, c = document) => c.querySelector(s);
const qa = (s, c = document) => Array.from(c.querySelectorAll(s));
const URLPARAMS = new URLSearchParams(location.search);
const COURSE = URLPARAMS.get("course"); // ej. "arquitectura"
const WEEK   = URLPARAMS.get("week");   // ej. "5"

function getParam(name, fallback = null){
  const p = new URLSearchParams(location.search).get(name);
  return p ? decodeURIComponent(p) : fallback;
}

function setAuthUI(session){
  const on = !!session;
  const email = session?.user?.email || null;
  isAdmin = !!email && ADMIN_EMAILS.includes(String(email).toLowerCase());

  document.body.classList.toggle("auth-on", on);
  document.body.classList.toggle("admin-on", isAdmin);

  // data-auth-only
  qa("[data-auth-only]").forEach(el => el.style.display = on ? "" : "none");
  // data-admin-only
  qa("[data-admin-only]").forEach(el => el.style.display = isAdmin ? "" : "none");

  const t = qs("#adminStateText");
  if (t) t.textContent = on ? (isAdmin ? `${email} (Admin)` : email) : "Invitado";
}

/* ====== AVATAR: probar URL y cargar (fallback local) ====== */
function probeImage(url){
  return new Promise(res=>{
    const im = new Image();
    im.onload = ()=>res(true);
    im.onerror = ()=>res(false);
    im.src = url;
  });
}

async function loadAvatar(bust=false){
  const img = qs(".perfil-img");
  if (!img) return;

  // 1) local (siempre segura)
  img.src = "aldair.jpg";

  try {
    // 2) Signed URL (bucket privado)
    const signed = await supabase.storage.from(BUCKET).createSignedUrl(PROFILE_PATH, 3600);
    if (signed.data?.signedUrl){
      const u = signed.data.signedUrl + (bust ? `&v=${Date.now()}` : "");
      if (await probeImage(u)) { img.src = u; return; }
    }

    // 3) Public URL (si el bucket/carpeta es pública)
    const pub = supabase.storage.from(BUCKET).getPublicUrl(PROFILE_PATH).data?.publicUrl;
    if (pub){
      const u = pub + (bust ? `?v=${Date.now()}` : "");
      if (await probeImage(u)) { img.src = u; return; }
    }
  } catch(_) {/* queda la local */}
}

/* =========================
   RENDER EN INDEX.HTML
   ========================= */
function renderCursosIndex(){
  const grid = document.querySelector('#cursos .row.g-4');
  if(!grid) return;
  const entries = Object.entries(COURSES);
  grid.innerHTML = entries.map(([id, c], i) => `
    <div class="col-12 col-md-6 col-lg-4" data-aos="fade-up" data-aos-delay="${50 + i*60}">
      <div class="card project-card h-100">
        <div class="card-body">
          <h5 class="card-title"><i class="bi ${c.icon} me-2"></i>${c.name}</h5>
          <p class="card-text">Plan de ${c.weeks} semanas</p>
          <a href="curso.html?course=${encodeURIComponent(id)}" class="btn btn-sm btn-accent">Entrar</a>
        </div>
      </div>
    </div>
  `).join('');
}

/* =========================
   RENDER EN CURSO.HTML (solo ENTRAR)
   ========================= */
function renderCoursePage(){
  const weeksRow = document.getElementById('weeksRow');
  if(!weeksRow) return;

  const courseId = getParam('course','arquitectura');
  const meta = COURSES[courseId] || { name:'Curso', weeks:16 };

  const h1  = document.getElementById('courseTitle');
  const bc  = document.getElementById('bcCourse');
  const des = document.getElementById('wkDesc');
  if(h1)  h1.textContent  = meta.name;
  if(bc)  bc.textContent  = meta.name;
  if(des) des.textContent = `Plan de ${meta.weeks} semanas`;

  let html = '';
  for(let n=1; n<=meta.weeks; n++){
    html += `
      <div class="col-12 col-md-6 col-lg-4" data-aos="zoom-in" data-aos-delay="${(n%6)*60}">
        <div class="card week-card h-100">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title mb-1"><i class="bi bi-calendar-week me-2"></i>Semana ${n}</h5>
            <p class="card-text text-muted-2 mb-3">Materiales, evidencias y recursos.</p>
            <div class="mt-auto">
              <a class="btn btn-sm btn-primary"
                 href="week.html?course=${encodeURIComponent(courseId)}&week=${n}">
                 <i class="bi bi-box-arrow-up-right me-1"></i>Entrar
              </a>
            </div>
          </div>
        </div>
      </div>`;
  }
  weeksRow.innerHTML = html;

  if (window.AOS && typeof AOS.refreshHard === 'function') AOS.refreshHard();
}

/* =========================
   RENDER EN WEEK.HTML (título)
   ========================= */
function renderWeekPage(){
  const elTitle = document.querySelector('[data-week-title]');
  if(!elTitle) return;
  const courseId = getParam('course','arquitectura');
  const weekNum  = getParam('week','1');
  const name = (COURSES[courseId]?.name) || 'Curso';
  elTitle.textContent = `${name} — Semana ${weekNum}`;
}

/* ====== AUTH ====== */
function currentRedirectUrl(){
  return location.href.split('#')[0];
}

async function googleLogin(){
  try{
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: currentRedirectUrl(),
        queryParams: { access_type: "offline", prompt: "consent" }
      }
    });
    if (error) throw error;
  }catch(err){
    console.error(err);
    alert("No se pudo iniciar sesión con Google.");
  }
}

async function finishOAuthIfNeeded(){
  const u = new URL(location.href);
  if (u.searchParams.get('code')) {
    try { await supabase.auth.exchangeCodeForSession(location.href); }
    catch (e) { console.error('[exchangeCodeForSession] error', e); alert('No se pudo finalizar el login.'); }
    u.searchParams.delete('code'); u.searchParams.delete('state'); history.replaceState({}, '', u.toString());
  }
}

async function initAuth(){
  await finishOAuthIfNeeded();

  // sesión actual
  const { data:{ session } } = await supabase.auth.getSession();
  setAuthUI(session);

  // cambios de estado
  supabase.auth.onAuthStateChange((_e, s)=> setAuthUI(s));

  // login email/pass (opcional)
  qs("#adminForm")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email = qs("#adminUser").value.trim();
    const password = qs("#adminPass").value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Error: "+error.message);
    else (bootstrap.Modal.getInstance(qs("#adminModal"))||new bootstrap.Modal(qs("#adminModal"))).hide();
  });

  // logout para cualquier sesión
  qs("#adminLogout")?.addEventListener("click", async (e)=>{
    e.preventDefault();
    await supabase.auth.signOut();
    setAuthUI(null);
  });

  // botón Google
  qs("#googleLogin")?.addEventListener("click", googleLogin);
}

/* ====== Controles de foto de perfil (solo admin) ====== */
async function uploadProfile(file){
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(PROFILE_PATH, file, { upsert: true, cacheControl: "0", contentType: file.type || undefined });
  if (error) throw error;
}
async function deleteProfile(){
  const { error } = await supabase.storage.from(BUCKET).remove([PROFILE_PATH]);
  if (error) throw error;
}
function initProfileControls(){
  const inp = document.getElementById("pfInput");
  const btnSave = document.getElementById("pfSaveBtn");
  const btnDel  = document.getElementById("pfDeleteBtn");
  const btnPrev = document.getElementById("pfPreviewBtn");
  const img = document.querySelector(".perfil-img");
  if (!inp || !btnSave || !btnDel || !btnPrev || !img) return;

  btnPrev.addEventListener("click", ()=>{
    const f = inp.files?.[0];
    if (!f) return alert("Selecciona una imagen primero.");
    img.src = URL.createObjectURL(f);
  });

  btnSave.addEventListener("click", async ()=>{
    if (!isAdmin) return alert("Solo admin puede cambiar la foto.");
    const f = inp.files?.[0];
    if (!f) return alert("Selecciona una imagen.");
    try{
      btnSave.disabled = true; btnSave.textContent = "Subiendo...";
      await uploadProfile(f);
      await loadAvatar(true);
      inp.value = "";
      alert("✅ Foto actualizada.");
    }catch(err){
      console.error(err);
      alert("No se pudo subir: " + err.message);
    }finally{
      btnSave.disabled = false; btnSave.textContent = "Guardar";
    }
  });

  btnDel.addEventListener("click", async ()=>{
    if (!isAdmin) return alert("Solo admin puede borrar.");
    if (!confirm("¿Borrar la foto del perfil en Storage?")) return;
    try{
      btnDel.disabled = true; btnDel.textContent = "Borrando...";
      await deleteProfile();
      await loadAvatar(true);
      alert("🗑️ Foto borrada. Se mostrará la del repositorio (aldair.jpg).");
    }catch(err){
      console.error(err);
      alert("No se pudo borrar: " + err.message);
    }finally{
      btnDel.disabled = false; btnDel.textContent = "Borrar";
    }
  });
}

/* ====== CONTACTO: guardar en Supabase ====== */
function cAlert(cls, text){
  const box = document.getElementById("cAlert");
  if (!box) return;
  box.className = `alert ${cls}`;
  box.textContent = text;
  box.classList.remove("d-none");
}
function cHide(){
  const box = document.getElementById("cAlert");
  if(box){ box.classList.add("d-none"); box.textContent=""; }
}
const isEmail = (v)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

async function handleContactSubmit(e){
  e.preventDefault();
  cHide();

  const name  = document.getElementById("cName")?.value.trim();
  const email = document.getElementById("cEmail")?.value.trim();
  const msg   = document.getElementById("cMsg")?.value.trim();

  if (!name || !email || !msg) return cAlert("alert-warning","Completa todos los campos.");
  if (!isEmail(email))        return cAlert("alert-warning","Ingresa un email válido.");

  const { error } = await supabase.from("contact_messages").insert({ name, email, message: msg });
  if (error){
    console.error("[contact_messages] insert error:", error);
    cAlert("alert-danger","No se pudo enviar: " + error.message);
  } else {
    cAlert("alert-success","✅ ¡Mensaje enviado! Gracias por escribirme.");
    document.getElementById("contactForm")?.reset();
  }
}

/* ====== INIT ====== */
document.addEventListener("DOMContentLoaded", ()=>{
  // año footer
  const y = qs("#year"); if (y) y.textContent = new Date().getFullYear();

  // renders por página
  renderCursosIndex();   // index.html
  renderCoursePage();    // curso.html
  renderWeekPage();      // week.html

  // otros
  loadAvatar();          // foto (local o Storage)
  initAuth();            // login/logout + Google + UI
  initProfileControls(); // controles de foto (solo admin)

  // contacto
  const cf = document.getElementById("contactForm");
  if (cf) cf.addEventListener("submit", handleContactSubmit);
});

/* ====== EFECTO glow en .week-card ====== */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.week-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top)  / r.height) * 100;
      card.style.setProperty('--mx', x + '%');
      card.style.setProperty('--my', y + '%');
    });
    card.addEventListener('mouseleave', () => {
      card.style.removeProperty('--mx');
      card.style.removeProperty('--my');
    });
  });
});
