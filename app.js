/* =========================
   app.js — COMPLETO (con Modo Cliente/Admin)
   ========================= */

/* ========= Supabase ========= */
const SUPABASE_URL = "https://feiygnfxolxetwfrjfsh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlaXlnbmZ4b2x4ZXR3ZnJqZnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxOTU1MjAsImV4cCI6MjA3Mjc3MTUyMH0.ge5Ciw_9MvIGR4y8JznteQV8sICcCBzivEapGxWnFbI";
const BUCKET = "portafolio";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
let currentUser = null;
let currentMode = localStorage.getItem(MODE_KEY) || ""; // vacío = aún no elegido
let weeks = Array.from({ length: 16 }, (_, i) => `semana-${i + 1}`);
let currentWeekId = "";

/* ========= Helpers ========= */
function ext(name) {
  const p = (name || "").split("?")[0];
  return (p.split(".").pop() || "").toLowerCase();
}
function isImg(e) { return ["jpg","jpeg","png","gif","webp","bmp","svg"].includes(e); }
function isPdf(e) { return e === "pdf"; }

/* ========= Modo Cliente / Administrador ========= */
function openModeChooser() {
  roleModal.showModal();
}
function setMode(mode) {
  currentMode = mode; // 'client' | 'admin'
  localStorage.setItem(MODE_KEY, currentMode);
  applyModeUI();
}
function applyModeUI() {
  // Mostrar/ocultar botones según modo y sesión
  if (currentMode === "client") {
    // Cliente: oculta todo lo de auth/edición
    btnLogin.style.display   = "none";
    btnLogout.style.display  = "none";
    uploader.style.display   = "none";
    btnAddWeek && (btnAddWeek.style.display = "none");
    userEmail.textContent    = "";
  } else {
    // Admin: login/logout según sesión
    const logged = !!currentUser;
    btnLogin.style.display   = logged ? "none" : "inline-block";
    btnLogout.style.display  = logged ? "inline-block" : "none";
    uploader.style.display   = logged ? "inline-flex"  : "none";
    btnAddWeek && (btnAddWeek.style.display = logged ? "inline-block" : "none");
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
  const { error } = await supabase.auth.signUp({
    email: emailInput.value, password: passInput.value
  });
  if (error) return alert(error.message);
  alert("Cuenta creada. Revisa tu correo si se requiere confirmación.");
  authModal.close(); afterAuth();
});

async function afterAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user || null;

  // Si no ha elegido modo, pedirlo
  if (!currentMode) openModeChooser();

  // Si es admin pero NO hay sesión → forzar pantalla de login
  if (currentMode === "admin" && !currentUser) {
    applyModeUI(); // oculta uploader/add week
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
  // Si selecciona admin y no está logueado → abrir login
  if (!currentUser) authModal.showModal();
});
btnAsClient && (btnAsClient.onclick = () => {
  setMode("client");
});

/* ========= Inicio ========= */
afterAuth();

/* ========= Semanas ========= */
function renderWeeks() {
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
  if (currentMode !== "admin") return alert("Solo disponible en modo Administrador.");
  if (!currentUser) return alert("Inicia sesión para crear semanas.");
  const n = prompt("Nombre de la semana (ej. semana-17):");
  if (!n) return;
  const id = n.trim().toLowerCase();
  if (!/^semana-\d+$/.test(id)) return alert("Formato: semana-17");
  if (!weeks.includes(id)) weeks.push(id);
  renderWeeks();
});

/* ========= Selección de semana ========= */
async function selectWeek(id) {
  currentWeekId = id;
  panelTitle && (panelTitle.textContent = id.replace("semana", "Semana ").replace("-", " "));
  renderWeeks();
  await renderItems(id);
}

/* ========= Listar + Preview + Descargar + Eliminar ========= */
async function renderItems(weekId) {
  // refrescar sesión (por si cambió)
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

  // ¿Puede borrar/subir? Solo si modo=admin y tiene sesión
  const canManage = (currentMode === "admin" && !!currentUser);

  for (const obj of data) {
    const path = `${weekId}/${obj.name}`;
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const url = pub.publicUrl + `#t=${Date.now()}`; // evita cache
    const e = ext(obj.name);

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

  // Descargar con blob (funciona aunque sea otro dominio)
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

  // Eliminar (solo admin con sesión)
  if (currentMode === "admin" && currentUser) {
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

  if (currentMode !== "admin") return alert("Subir archivos solo está disponible en modo Administrador.");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert("Inicia sesión para subir.");
  if (!currentWeekId) return alert("Selecciona una semana.");

  const safeName = `${Date.now()}_${file.name}`;
  const path = `${currentWeekId}/${safeName}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (upErr) { alert(upErr.message); return; }

  fileInput.value = "";
  renderItems(currentWeekId);
});

/* ========= Si no había modo elegido, pedirlo al cargar ========= */
if (!currentMode) {
  // espera un tick para que el DOM esté listo
  setTimeout(() => openModeChooser(), 0);
}
