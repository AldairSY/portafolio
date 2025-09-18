/* =========================
   app.js — Semanas + Detalle + Adjuntos (Supabase v2)
   - Render 16 semanas
   - Modal Ver detalle (edición admin, persistencia localStorage)
   - Modal Adjuntos: listar, subir y eliminar en Storage
   - Auth Supabase (login/logout) habilita modo admin
   ========================= */

/* ---- CONFIG SUPABASE ---- */
const SUPABASE_URL = "https://feiygnfxolxetwfrjfsh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlaXlnbmZ4b2x4ZXR3ZnJqZnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxOTU1MjAsImV4cCI6MjA3Mjc3MTUyMH0.ge5Ciw_9MvIGR4y8JznteQV8sICcCBzivEapGxWnFbI";
const BUCKET = "portafolio";
let supabase = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) ?? null;

/* ---- DATOS INICIALES (16) ---- */
const DEFAULT_WEEKS = [
  { n: 1,  title: "Introducción y alcance",        state: "Planificado", text: "Objetivos del curso, metodología, herramientas y repositorios." },
  { n: 2,  title: "Levantamiento de requerimientos",state: "Planificado", text: "Entrevistas, historias de usuario, criterios de aceptación." },
  { n: 3,  title: "Modelado de procesos (BPMN)",    state: "Planificado", text: "Diagramas AS-IS / TO-BE y priorización de mejoras." },
  { n: 4,  title: "Arquitectura (C4 + vistas)",     state: "Planificado", text: "Contexto, contenedores y componentes. Decisiones ADR." },
  { n: 5,  title: "Diseño de datos (MER → SQL)",    state: "Planificado", text: "Entidades, relaciones y normalización. Script base." },
  { n: 6,  title: "Front-end base",                 state: "Planificado", text: "Componentes Bootstrap y patrones de UI accesibles." },
  { n: 7,  title: "Back-end base",                  state: "Planificado", text: "APIs REST, controladores y validaciones." },
  { n: 8,  title: "Autenticación",                  state: "Parcial",     text: "Sesiones, JWT / Supabase Auth y roles." },
  { n: 9,  title: "Integración de datos",           state: "Parcial",     text: "Persistencia, migraciones y seeds." },
  { n: 10, title: "Pruebas",                        state: "Parcial",     text: "Unitarias, integración y cobertura mínima." },
  { n: 11, title: "Seguridad",                      state: "Parcial",     text: "OWASP Top 10, roles y permisos." },
  { n: 12, title: "DevOps",                         state: "Parcial",     text: "CI/CD, contenedores y despliegue." },
  { n: 13, title: "BI & Dashboards",                state: "Parcial",     text: "Métricas, KPIs y visualizaciones." },
  { n: 14, title: "Ajustes finales",                state: "Parcial",     text: "Refactor, performance, accesibilidad." },
  { n: 15, title: "Ensayo de sustentación",         state: "Revisión",    text: "Diapositivas, demos y Q&A." },
  { n: 16, title: "Entrega final",                  state: "Final",       text: "Producto terminado, documentación y retroalimentación." },
];

/* ---- STATE ---- */
const STORAGE_KEY = "weeksData";
let weeks = loadWeeks();

/* ---- HELPERS ---- */
const qs  = (s, c = document) => c.querySelector(s);
const qsa = (s, c = document) => Array.from(c.querySelectorAll(s));

function loadWeeks(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? DEFAULT_WEEKS; }
  catch { return DEFAULT_WEEKS; }
}
function saveWeeks(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(weeks));
}

function setYear(){
  const e = qs("#year"); if (e) e.textContent = new Date().getFullYear();
}
function smoothAnchors(){
  qsa('a[href^="#"]').forEach(a=>{
    a.addEventListener("click", e=>{
      const id = a.getAttribute("href");
      if (id.length > 1 && qs(id)) {
        e.preventDefault(); qs(id).scrollIntoView({behavior:"smooth"});
        qsa(".navbar .nav-link").forEach(n=>n.classList.remove("active"));
        a.classList.add("active");
      }
    });
  });
}
function setAdminMode(on, label="Admin"){
  const body = document.body;
  const span = qs("#adminStateText");
  if (on){ body.classList.add("admin-on"); if (span) span.textContent = label; }
  else   { body.classList.remove("admin-on"); if (span) span.textContent = "Administrador"; }
}

/* ---- RENDER SEMANAS ---- */
function weekCardHTML(w){
  return `
    <div class="card week-card h-100">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="week-badge">Semana ${w.n}</span>
          <small class="text-muted-2">Estado: ${w.state}</small>
        </div>
        <h5 class="card-title">${w.title}</h5>
        <p class="card-text">${w.text}</p>
        <div class="d-flex gap-2">
          <a href="#" class="btn btn-sm btn-danger-emphasis btn-view" data-week="${w.n}">
            <i class="bi bi-eye me-1"></i>Ver detalle
          </a>
          <a href="#" class="btn btn-sm btn-outline-light btn-attach" data-week="${w.n}">
            <i class="bi bi-paperclip me-1"></i>Adjuntos
          </a>
          <a href="#" class="btn btn-sm btn-warning btn-edit" data-admin-only data-week="${w.n}">
            <i class="bi bi-pencil-square me-1"></i>Editar
          </a>
        </div>
      </div>
    </div>`;
}
function renderWeeks(){
  const row = qs("#semanas .row");
  if (!row) return;
  row.innerHTML = "";
  weeks.forEach(w=>{
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4";
    col.innerHTML = weekCardHTML(w);
    row.appendChild(col);
  });
}

/* ---- AVATAR (Storage con fallback) ---- */
async function loadAvatar(){
  const img = qs(".perfil-img") || qs(".oval-frame img");
  if (!img) return;
  if (!supabase){ img.src = "aldair.jpg"; return; }
  const path = "perfil/aldair.jpg";
  try {
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (pub?.publicUrl){ img.src = pub.publicUrl; return; }
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (signed?.signedUrl){ img.src = signed.signedUrl; return; }
  } catch {}
  img.src = "aldair.jpg";
}

/* ---- AUTH ---- */
async function checkSession(){
  if (!supabase){ setAdminMode(false); return; }
  const { data:{ session } } = await supabase.auth.getSession();
  setAdminMode(!!session, session?.user?.email || "Admin");
}
function setupAuth(){
  if (supabase){
    supabase.auth.onAuthStateChange((_e, session)=>{
      setAdminMode(!!session, session?.user?.email || "Admin");
    });
  }
  qs("#adminForm")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email = qs("#adminUser").value.trim();
    const pass  = qs("#adminPass").value;
    if (!supabase){ return alert("Supabase no cargó."); }
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) return alert("Error: " + error.message);
    const modalEl = qs("#adminModal");
    if (modalEl && window.bootstrap){
      (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)).hide();
    }
  });
  qs("#adminLogout")?.addEventListener("click", async (e)=>{
    e.preventDefault(); await supabase?.auth.signOut(); setAdminMode(false);
  });
}

/* ---- MODAL: VER/EDITAR DETALLE ---- */
function openWeekDetail(n){
  const w = weeks.find(x=>x.n===n); if (!w) return;
  qs("#weekDetailLabel").textContent = `Semana ${w.n}`;
  qs("#wd-week").value  = String(w.n);
  qs("#wd-title").value = w.title;
  qs("#wd-state").value = w.state;
  qs("#wd-text").value  = w.text;

  const isAdmin = document.body.classList.contains("admin-on");
  const fields  = [qs("#wd-title"), qs("#wd-state"), qs("#wd-text")];
  const btnEdit = qs("#wd-edit");
  const btnSave = qs("#wd-save");

  // por defecto deshabilitado
  fields.forEach(f=>f.disabled = true);
  btnEdit.disabled = !isAdmin;
  btnSave.disabled = !isAdmin;

  btnEdit.onclick = (e)=>{
    e.preventDefault();
    if (!isAdmin) return;
    fields.forEach(f=>f.disabled = false);
    qs("#wd-title").focus();
  };

  qs("#weekDetailForm").onsubmit = (e)=>{
    e.preventDefault();
    if (!isAdmin) return;
    const nn = Number(qs("#wd-week").value);
    const idx = weeks.findIndex(x=>x.n===nn);
    if (idx>=0){
      weeks[idx].title = qs("#wd-title").value.trim() || weeks[idx].title;
      weeks[idx].state = qs("#wd-state").value.trim() || weeks[idx].state;
      weeks[idx].text  = qs("#wd-text").value.trim()  || weeks[idx].text;
      saveWeeks();
      renderWeeks();
    }
    const modalEl = qs("#weekDetailModal");
    if (modalEl && window.bootstrap){
      (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)).hide();
    }
  };

  new bootstrap.Modal(qs("#weekDetailModal")).show();
}

/* ---- MODAL: ADJUNTOS (listar/subir/eliminar) ---- */
async function listAttachments(n){
  const listEl = qs("#att-list");
  listEl.innerHTML = `<div class="list-group-item">Cargando...</div>`;
  if (!supabase){
    listEl.innerHTML = `<div class="list-group-item text-danger">Supabase no cargó.</div>`;
    return;
  }
  const folder = `semanas/${n}`;
  const { data: files, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 100, sortBy: { column: "name", order: "asc" } });
  if (error){
    listEl.innerHTML = `<div class="list-group-item text-danger">Error: ${error.message}</div>`;
    return;
  }
  if (!files || files.length===0){
    listEl.innerHTML = `<div class="list-group-item">Sin archivos.</div>`;
    return;
  }

  // construir items con links (public o signed)
  const isAdmin = document.body.classList.contains("admin-on");
  const items = await Promise.all(files.map(async f=>{
    const full = `${folder}/${f.name}`;
    let url = supabase.storage.from(BUCKET).getPublicUrl(full).data?.publicUrl;
    if (!url){
      const signed = await supabase.storage.from(BUCKET).createSignedUrl(full, 3600);
      url = signed.data?.signedUrl;
    }
    return `
      <div class="list-group-item d-flex justify-content-between align-items-center">
        <div class="me-2">
          <i class="bi bi-file-earmark me-2"></i>
          <a href="${url}" target="_blank" rel="noopener">${f.name}</a>
          <small class="text-muted ms-2">${(f.metadata?.size ?? 0)} bytes</small>
        </div>
        ${isAdmin ? `<button class="btn btn-sm btn-danger" data-del="${full}"><i class="bi bi-trash"></i></button>` : ``}
      </div>`;
  }));
  listEl.innerHTML = items.join("");

  // eliminar
  if (isAdmin){
    qsa("button[data-del]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const path = btn.getAttribute("data-del");
        if (!confirm("¿Eliminar archivo?")) return;
        const { error: errDel } = await supabase.storage.from(BUCKET).remove([path]);
        if (errDel) return alert("Error al eliminar: " + errDel.message);
        listAttachments(n);
      });
    });
  }
}

function openAttachments(n){
  qs("#attachmentsLabel").textContent = `Adjuntos — Semana ${n}`;
  qs("#att-week").value = String(n);
  qs("#att-file").value = "";
  qs("#att-name").value = "";
  listAttachments(n);
  new bootstrap.Modal(qs("#attachmentsModal")).show();
}

async function uploadAttachment(){
  const n = Number(qs("#att-week").value);
  const file = qs("#att-file").files[0];
  const customName = (qs("#att-name").value || "").trim();
  if (!file) return alert("Selecciona un archivo.");
  if (!supabase) return alert("Supabase no cargó.");
  const safeName = customName || file.name;
  const path = `semanas/${n}/${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600", upsert: true, contentType: file.type || undefined
  });
  if (error) return alert("Error al subir: " + error.message);
  qs("#att-file").value = ""; qs("#att-name").value = "";
  listAttachments(n);
}

/* ---- Uploader general en panel admin (opcional) ---- */
function injectUploadPanel(){
  const adminSec = qs("#admin .container");
  if (!adminSec) return;
  const html = `
    <div class="contact-card p-4 mt-4" data-admin-only>
      <h5 class="mb-3"><i class="bi bi-upload me-2"></i>Subir archivos al Storage</h5>
      <div class="row g-2 align-items-center">
        <div class="col-md-5">
          <input type="file" class="form-control" id="fileInput" />
        </div>
        <div class="col-md-5">
          <input type="text" class="form-control" id="filePath" placeholder="Ruta ej: uploads/miarchivo.pdf" />
        </div>
        <div class="col-md-2 d-grid">
          <button class="btn btn-primary" id="btnUpload"><i class="bi bi-cloud-arrow-up me-1"></i>Subir</button>
        </div>
      </div>
      <div class="small text-muted mt-2">Bucket: <code>${BUCKET}</code></div>
      <div class="mt-3" id="uploadResult"></div>
    </div>`;
  const div = document.createElement("div"); div.innerHTML = html; adminSec.appendChild(div);

  qs("#btnUpload").addEventListener("click", async ()=>{
    const file = qs("#fileInput").files[0];
    const path = (qs("#filePath").value || "").trim();
    const out  = qs("#uploadResult");
    if (!file || !path) return out.innerHTML = `<div class="text-warning">Selecciona archivo y ruta.</div>`;
    if (!supabase) return out.innerHTML = `<div class="text-danger">Supabase no cargó.</div>`;
    out.innerHTML = `<div class="text-info">Subiendo...</div>`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert:true, cacheControl:"3600", contentType:file.type||undefined });
    if (error) return out.innerHTML = `<div class="text-danger">Error: ${error.message}</div>`;
    const pub = supabase.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl;
    let link = pub;
    if (!link){
      const s = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
      link = s.data?.signedUrl;
    }
    out.innerHTML = `<div class="text-success">OK. <a href="${link}" target="_blank">Ver archivo</a></div>`;
  });
}

/* ---- EVENTOS GLOBALes (delegación) ---- */
function setupWeekButtons(){
  // Ver detalle
  document.addEventListener("click", (e)=>{
    const a = e.target.closest(".btn-view");
    if (a){ e.preventDefault(); openWeekDetail(Number(a.dataset.week)); }
  });
  // Adjuntos
  document.addEventListener("click", (e)=>{
    const a = e.target.closest(".btn-attach");
    if (a){ e.preventDefault(); openAttachments(Number(a.dataset.week)); }
  });
  // Edit desde la card (abre mismo modal de detalle y activa edición)
  document.addEventListener("click", (e)=>{
    const a = e.target.closest(".btn-edit");
    if (a){
      e.preventDefault(); openWeekDetail(Number(a.dataset.week));
      // activar edición tras abrir
      setTimeout(()=>qs("#wd-edit")?.click(), 200);
    }
  });

  // Subida en modal Adjuntos
  qs("#att-upload")?.addEventListener("click", (e)=>{ e.preventDefault(); uploadAttachment(); });
}

/* ---- INIT ---- */
document.addEventListener("DOMContentLoaded", ()=>{
  setYear();
  smoothAnchors();
  renderWeeks();
  setupWeekButtons();
  injectUploadPanel();
  setupAuth();
  checkSession();
  loadAvatar();
});
