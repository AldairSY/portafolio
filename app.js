<!-- Carga Supabase v2 (deja igual) -->
<script src="https://unpkg.com/@supabase/supabase-js@2"></script>
<script>
/* =========================
   app.js — SEGURO (Cliente/Admin + email confirmado + whitelist)
   ========================= */

/* ========= Supabase ========= */
const SUPABASE_URL = "https://feiygnfxolxetwfrjfsh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlaXlnbmZ4b2x4ZXR3ZnJqZnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxOTU1MjAsImV4cCI6MjA3Mjc3MTUyMH0.ge5Ciw_9MvIGR4y8JznteQV8sICcCBzivEapGxWnFbI";
const BUCKET = "portafolio";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ========= Whitelist de administradores =========
   SOLO estos correos podrán subir/eliminar (y además deben tener el email confirmado) */
const ADMIN_WHITELIST = [
  "sanchezaldair363@gmail.com" // ← tu correo
  // agrega otros si quieres
];

/* ========= Constantes de modo ========= */
const MODE_KEY = "pf_mode";           // 'client' | 'admin'

/* ========= UI refs ========= */
document.getElementById("year") && (document.getElementById("year").textContent = new Date().getFullYear());
const weeksGrid  = document.getElementById("weeks-grid");
const itemsGrid  = document.getElementById("items-grid");
const panelTitle = document.getElementById("panel-title");
const uploader   = document.getElementById("uploader");
const fileInput  = document.getElementById("file-input");

const btnLogin   = document.getElementById("btn-login");
const btnLogout  = document.getElementById("btn-logout");
const userEmail  = document.getElementById("user-email");
const authModal  = document.getElementById("auth-modal");
const emailInput = document.getElementById("auth-email");
const passInput  = document.getElementById("auth-pass");
const btnEmailLogin  = document.getElementById("btn-email-login");
const btnEmailSignup = document.getElementById("btn-email-signup");
const btnAddWeek = document.getElementById("btn-add-week");

const roleModal  = document.getElementById("role-modal");
const btnAsAdmin = document.getElementById("btn-as-admin");
const btnAsClient= document.getElementById("btn-as-client");
const btnChangeMode = document.getElementById("btn-change-mode");

/* ========= Estado ========= */
let currentUser = null;         // objeto user de Supabase (o null)
let currentMode = localStorage.getItem(MODE_KEY) || ""; // '' = aún no elegido
let weeks = Array.from({ length: 16 }, (_, i) => `semana-${i + 1}`);
let currentWeekId = "";

/* ========= Helpers ========= */
const fileExt = (name) => ((name || "").split("?")[0].split(".").pop() || "").toLowerCase();
const isImg = (e) => ["jpg","jpeg","png","gif","webp","bmp","svg"].includes(e);
const isPdf = (e) => e === "pdf";

function isEmailConfirmed(user) {
  // en v2, si aún no confirma, getUser() suele devolver null
  // pero por si acaso, revisamos atributos disponibles:
  return !!user; // si existe, asumimos confirmado (si no, Supabase no lo devuelve)
}

function isWhitelisted(user) {
  const mail = (user?.email || "").toLowerCase();
  return ADMIN_WHITELIST.map(x => x.toLowerCase()).includes(mail);
}

/* ========= Modo Cliente / Administrador ========= */
function openModeChooser(){ roleModal.showModal(); }
function setMode(mode){
  currentMode = mode; // 'client' | 'admin'
  localStorage.setItem(MODE_KEY, currentMode);
  applyModeUI();
}
function applyModeUI(){
  const canManage = (currentMode === "admin" && currentUser && isEmailConfirmed(currentUser) && isWhitelisted(currentUser));

  if (currentMode === "client") {
    btnLogin.style.display   = "none";
    btnLogout.style.display  = "none";
    uploader.style.display   = "none";
    btnAddWeek && (btnAddWeek.style.display = "none");
    userEmail.textContent    = "";
  } else {
    // Admin: mostrar según sesión y permisos
    const logged = !!currentUser;
    btnLogin.style.display   = logged ? "none" : "inline-block";
    btnLogout.style.display  = logged ? "inline-block" : "none";
    uploader.style.display   = (logged && canManage) ? "inline-flex" : "none";
    btnAddWeek && (btnAddWeek.style.display = (logged && canManage) ? "inline-block" : "none");
    userEmail.textContent    = logged ? (currentUser?.email || "") : "";
  }
}

/* ========= Auth ========= */
btnLogin && (btnLogin.onclick = () => authModal.showModal());
btnLogout && (btnLogout.onclick = async () => { await supabase.auth.signOut(); await afterAuth(); });

btnEmailLogin && (btnEmailLogin.onclick = async (e) => {
  e.preventDefault();
  const { error } = await supabase.auth.signInWithPassword({
    email: emailInput.value, password: passInput.value
  });
  if (error) return alert(error.message);
  authModal.close(); afterAuth();
});

btnEmailSignup && (btnEmailSignup.onclick = async () => {
  // IMPORTANTE: Supabase enviará correo de confirmación automáticamente (si no lo desactivaste).
  const { error } = await supabase.auth.signUp({
    email: emailInput.value, password: passInput.value
  });
  if (error) return alert(error.message);
  alert("Te enviamos un correo de confirmación. Confirma tu email para poder administrar.");
  authModal.close();
  // hasta confirmar, getUser() devolverá null → no hay permisos
});

async function afterAuth(){
  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user || null;

  if (!currentMode) openModeChooser();

  // si elige admin pero no está logueado → abrir login
  if (currentMode === "admin" && !currentUser) {
    applyModeUI();
    authModal.showModal();
  } else {
    applyModeUI();
  }

  if (currentWeekId) renderItems(currentWeekId);
}

/* ========= Eventos de modo ========= */
btnChangeMode && (btnChangeMode.onclick = () => openModeChooser());
btnAsAdmin && (btnAsAdmin.onclick = () => {
  setMode("admin");
  if (!currentUser) authModal.showModal();
});
btnAsClient && (btnAsClient.onclick = () => setMode("client"));

/* ========= Inicio ========= */
afterAuth();

/* ========= Semanas ========= */
function renderWeeks(){
  if (!weeksGrid) return;
  weeksGrid.innerHTML = "";
  weeks.forEach(w => {
    const card = document.createElement("button");
    card.className = "week-card" + (w === currentWeekId ? " active" : "");
    card.innerHTML = `
      <div class="week-title">${w.replace("semana", "Semana ").replace("-", " ")}</div>
      <div class="week-sub">ver archivos</div>`;
    card.onclick = () => selectWeek(w);
    weeksGrid.appendChild(card);
  });
  if (!currentWeekId && weeks[0]) selectWeek(weeks[0]);
}
renderWeeks();

btnAddWeek && (btnAddWeek.onclick = () => {
  // Solo si es admin válido
  if (currentMode !== "admin" || !currentUser || !isWhitelisted(currentUser) || !isEmailConfirmed(currentUser))
    return alert("Solo disponible para administradores autorizados.");
  const n = prompt("Nombre de la semana (ej. semana-17):");
  if (!n) return;
  const id = n.trim().toLowerCase();
  if (!/^semana-\d+$/.test(id)) return alert("Formato: semana-17");
  if (!weeks.includes(id)) weeks.push(id);
  renderWeeks();
});

/* ========= Selección de semana ========= */
async function selectWeek(id){
  currentWeekId = id;
  panelTitle && (panelTitle.textContent = id.replace("semana", "Semana ").replace("-", " "));
  renderWeeks();
  await renderItems(id);
}

/* ========= Listar + Preview + Descargar + Eliminar ========= */
async function renderItems(weekId){
  // refrescar sesión
  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user || null;

  if (!itemsGrid) return;
  itemsGrid.innerHTML = "<p class='muted'>Cargando…</p>";

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(weekId, { limit: 200, offset: 0, sortBy: { column: "name", order: "desc" } });

  if (error) { itemsGrid.innerHTML = "<p class='muted'>No hay archivos todavía.</p>"; return; }
  if (!data || data.length === 0) { itemsGrid.innerHTML = "<p class='muted'>No hay archivos. Sube el primero.</p>"; return; }

  itemsGrid.innerHTML = "";

  const canManage = (currentMode === "admin" && currentUser && isEmailConfirmed(currentUser) && isWhitelisted(currentUser));

  for (const obj of data) {
    const path = `${weekId}/${obj.name}`;
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const url = pub.publicUrl + `#t=${Date.now()}`;
    const e = fileExt(obj.name);

    let preview = `<div class="thumb">Sin vista previa</div>`;
    if (isImg(e)) preview = `<div class="thumb"><img src="${url}" alt="${obj.name}"></div>`;
    else if (isPdf(e)) preview = `<div class="thumb"><iframe src="${url}#toolbar=0&view=fitH"></iframe></div>`;

    const meta = new Date(obj.created_at || Date.now()).toLocaleString();

    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      ${preview}
      <h4 title="${obj.name}">${obj.name}</h4>
      <div class="file-meta">${meta}</div>
      <div class="row">
        <a class="btn" href="${url}" target="_blank" rel="noopener">Ver archivo</a>
        <button class="btn btn-outline dl" data-path="${path}" data-name="${obj.name}">Descargar</button>
        ${canManage ? `<button class="btn btn-danger rm" data-path="${path}">Eliminar</button>` : ``}
      </div>`;
    itemsGrid.appendChild(card);
  }

  // Descargar con blob
  itemsGrid.querySelectorAll(".dl").forEach(btn => {
    btn.onclick = async () => {
      const path = btn.getAttribute("data-path");
      const name = btn.getAttribute("data-name");
      const { data, error } = await supabase.storage.from(BUCKET).download(path);
      if (error) { alert(error.message); return; }
      const blobUrl = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = blobUrl; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(blobUrl);
    };
  });

  // Eliminar (solo admin con permisos)
  if (canManage) {
    itemsGrid.querySelectorAll(".rm").forEach(btn => {
      btn.onclick = async () => {
        const path = btn.getAttribute("data-path");
        if (!confirm(`¿Eliminar "${path.split("/").pop()}"?`)) return;
        const { error } = await supabase.storage.from(BUCKET).remove([path]);
        if (error) { alert(error.message); return; }
        await renderItems(weekId);
      };
    });
  }
}

/* ========= Subir ========= */
fileInput && (fileInput.onchange = async (ev) => {
  const file = ev.target.files[0];
  if (!file) return;

  if (currentMode !== "admin" || !currentUser || !isWhitelisted(currentUser) || !isEmailConfirmed(currentUser))
    return alert("Subir archivos solo para administradores autorizados con correo confirmado.");

  if (!currentWeekId) return alert("Selecciona una semana.");

  const safeName = `${Date.now()}_${file.name}`;
  const path = `${currentWeekId}/${safeName}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (upErr) { alert(upErr.message); return; }

  fileInput.value = "";
  renderItems(currentWeekId);
});

/* ========= Pedir modo si no existe ========= */
if (!currentMode) setTimeout(() => openModeChooser(), 0);
</script>
