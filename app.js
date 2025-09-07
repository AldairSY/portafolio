/* =========================
   app.js — COMPLETO (pegar y reemplazar)
   ========================= */

/* ========= Supabase ========= */
const SUPABASE_URL = "https://feiygnfxolxetwfrjfsh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlaXlnbmZ4b2x4ZXR3ZnJqZnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxOTU1MjAsImV4cCI6MjA3Mjc3MTUyMH0.ge5Ciw_9MvIGR4y8JznteQV8sICcCBzivEapGxWnFbI";
const BUCKET = "portafolio";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ========= UI refs ========= */
document.getElementById("year").textContent = new Date().getFullYear();
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

/* ========= Estado ========= */
let currentUser = null;
let weeks = Array.from({ length: 16 }, (_, i) => `semana-${i + 1}`);
let currentWeekId = "";

/* ========= Helpers ========= */
function ext(name) {
  const p = (name || "").split("?")[0];
  return (p.split(".").pop() || "").toLowerCase();
}
function isImg(e) { return ["jpg","jpeg","png","gif","webp","bmp","svg"].includes(e); }
function isPdf(e) { return e === "pdf"; }

/* ========= Auth ========= */
btnLogin.onclick = () => authModal.showModal();
btnLogout.onclick = async () => { await supabase.auth.signOut(); await afterAuth(); };

btnEmailLogin.onclick = async (e) => {
  e.preventDefault();
  const { error } = await supabase.auth.signInWithPassword({
    email: emailInput.value, password: passInput.value
  });
  if (error) return alert(error.message);
  authModal.close(); afterAuth();
};

btnEmailSignup.onclick = async () => {
  const { error } = await supabase.auth.signUp({
    email: emailInput.value, password: passInput.value
  });
  if (error) return alert(error.message);
  alert("Cuenta creada. Revisa tu correo si se requiere confirmación.");
  authModal.close(); afterAuth();
};

async function afterAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user || null;

  userEmail.textContent   = currentUser ? currentUser.email : "";
  btnLogin.style.display  = currentUser ? "none"         : "inline-block";
  btnLogout.style.display = currentUser ? "inline-block" : "none";
  uploader.style.display  = currentUser ? "inline-flex"  : "none";
  btnAddWeek.style.display= currentUser ? "inline-block" : "none";

  if (currentWeekId) renderItems(currentWeekId);
}
afterAuth();

/* ========= Semanas ========= */
function renderWeeks() {
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

btnAddWeek.onclick = () => {
  const n = prompt("Nombre de la semana (ej. semana-17):");
  if (!n) return;
  const id = n.trim().toLowerCase();
  if (!/^semana-\d+$/.test(id)) return alert("Formato: semana-17");
  if (!weeks.includes(id)) weeks.push(id);
  renderWeeks();
};

/* ========= Selección de semana ========= */
async function selectWeek(id) {
  currentWeekId = id;
  panelTitle.textContent = id.replace("semana", "Semana ").replace("-", " ");
  renderWeeks();
  await renderItems(id);
}

/* ========= Listar + Preview + Descargar + Eliminar ========= */
async function renderItems(weekId) {
  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user || null;

  itemsGrid.innerHTML = "<p class='muted'>Cargando…</p>";

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(weekId, { limit: 200, offset: 0, sortBy: { column: "name", order: "desc" } });

  if (error) { itemsGrid.innerHTML = "<p class='muted'>No hay archivos todavía.</p>"; return; }
  if (!data || data.length === 0) { itemsGrid.innerHTML = "<p class='muted'>No hay archivos. Sube el primero.</p>"; return; }

  itemsGrid.innerHTML = "";

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
        ${currentUser ? `<button class="btn btn-danger rm" data-path="${path}">Eliminar</button>` : ``}
      </div>`;
    itemsGrid.appendChild(card);
  }

  // Descargar con blob (funciona siempre aunque sea otro dominio)
  itemsGrid.querySelectorAll(".dl").forEach(btn => {
    btn.onclick = async () => {
      const path = btn.getAttribute("data-path");
      const name = btn.getAttribute("data-name");
      const { data, error } = await supabase.storage.from(BUCKET).download(path);
      if (error) { alert(error.message); return; }
      const blobUrl = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = blobUrl; a.download = name;
      document.body.appendChild(a);
      a.click(); a.remove();
      URL.revokeObjectURL(blobUrl);
    };
  });

  // Eliminar (si hay sesión)
  if (currentUser) {
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
fileInput.onchange = async (ev) => {
  const file = ev.target.files[0];
  if (!file) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert("Inicia sesión para subir.");
  if (!currentWeekId) return alert("Selecciona una semana.");

  const safeName = `${Date.now()}_${file.name}`;
  const path = `${currentWeekId}/${safeName}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (upErr) { alert(upErr.message); return; }

  fileInput.value = "";
  renderItems(currentWeekId);
};
