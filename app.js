/* =========================
   app.js — ROBUSTO con Supabase v2
   - Render 16 semanas SIEMPRE (aunque falle Supabase)
   - Auth real (login/logout) con Supabase
   - Avatar desde Storage (publicUrl o signedUrl), con fallback local
   - Panel de subida (upload) inyectado en #admin, visible solo como admin
   ========================= */

/* ========= Supabase (tus datos) ========= */
const SUPABASE_URL = "https://feiygnfxolxetwfrjfsh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlaXlnbmZ4b2x4ZXR3ZnJqZnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxOTU1MjAsImV4cCI6MjA3Mjc3MTUyMH0.ge5Ciw_9MvIGR4y8JznteQV8sICcCBzivEapGxWnFbI";
const BUCKET = "portafolio";

// Crea cliente si la lib está cargada
let supabase = null;
if (window.supabase && window.supabase.createClient) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.error("Supabase JS no está cargado. Asegúrate del <script> antes de app.js");
}

/* ========= Datos (16 semanas) ========= */
const weeksData = [
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

/* ========= Utils ========= */
const qs  = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function setYear() {
  const el = qs("#year");
  if (el) el.textContent = new Date().getFullYear();
}

function smoothAnchors() {
  qsa('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const id = a.getAttribute("href");
      if (id.length > 1 && qs(id)) {
        e.preventDefault();
        qs(id).scrollIntoView({ behavior: "smooth", block: "start" });
        qsa(".navbar .nav-link").forEach(n => n.classList.remove("active"));
        a.classList.add("active");
      }
    });
  });
}

function setAdminMode(on, label = "Admin") {
  const body = document.body;
  const adminText = qs("#adminStateText");
  if (on) {
    body.classList.add("admin-on");
    if (adminText) adminText.textContent = label;
  } else {
    body.classList.remove("admin-on");
    if (adminText) adminText.textContent = "Administrador";
  }
}

function createWeekCard(week) {
  const col = document.createElement("div");
  col.className = "col-12 col-md-6 col-lg-4";
  col.innerHTML = `
    <div class="card week-card h-100">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="week-badge">Semana ${week.n}</span>
          <small class="text-muted-2">Estado: ${week.state}</small>
        </div>
        <h5 class="card-title">${week.title}</h5>
        <p class="card-text">${week.text}</p>
        <div class="d-flex gap-2">
          <a href="#" class="btn btn-sm btn-primary">
            <i class="bi bi-eye me-1"></i>Ver detalle
          </a>
          <a href="#" class="btn btn-sm btn-outline-light">
            <i class="bi bi-paperclip me-1"></i>Adjuntos
          </a>
          <a href="#" class="btn btn-sm btn-warning" data-admin-only>
            <i class="bi bi-pencil-square me-1"></i>Editar
          </a>
        </div>
      </div>
    </div>
  `;
  return col;
}

function renderWeeks() {
  const container = qs("#semanas .row");
  if (!container) {
    console.warn("No se encontró #semanas .row — revisa tu index.html");
    return;
  }
  container.innerHTML = "";
  weeksData.forEach(w => container.appendChild(createWeekCard(w)));
}

/* ========= Avatar desde Storage (public o signed) con fallback ========= */
async function loadAvatar() {
  const img = qs(".oval-frame img.perfil-img") || qs(".oval-frame img") || qs(".perfil-img");
  if (!img) return;

  // si no hay supabase, usa local
  if (!supabase) { img.src = "aldair.jpg"; return; }

  const path = "perfil/aldair.jpg";
  try {
    // 1) intento publicUrl
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = pub?.publicUrl;
    if (publicUrl) {
      img.src = publicUrl;
      return;
    }
  } catch (e) {
    // sigue al signed
  }
  try {
    // 2) intento signedUrl (1 hora)
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (!error && data?.signedUrl) {
      img.src = data.signedUrl;
      return;
    }
  } catch (e) {
    // sigue al fallback
  }

  // 3) fallback local
  img.src = "aldair.jpg";
}

/* ========= Inyectar panel de subida (solo admin) ========= */
function injectUploadPanel() {
  const adminSec = qs("#admin .container");
  if (!adminSec) return;
  const wrap = document.createElement("div");
  wrap.className = "mt-4";
  wrap.setAttribute("data-admin-only", ""); // respeta visibilidad
  wrap.innerHTML = `
    <div class="contact-card p-4">
      <h5 class="mb-3"><i class="bi bi-upload me-2"></i>Subir archivos al Storage</h5>
      <div class="row g-2 align-items-center">
        <div class="col-md-5">
          <input type="file" class="form-control" id="fileInput" />
        </div>
        <div class="col-md-5">
          <input type="text" class="form-control" id="filePath" placeholder="Ruta en bucket, ej: uploads/miarchivo.pdf" />
        </div>
        <div class="col-md-2 d-grid">
          <button class="btn btn-primary" id="btnUpload"><i class="bi bi-cloud-arrow-up me-1"></i>Subir</button>
        </div>
      </div>
      <div class="small text-muted mt-2">Bucket: <code>${BUCKET}</code> — si es privado, el enlace será firmado por 1 hora.</div>
      <div class="mt-3" id="uploadResult"></div>
    </div>
  `;
  adminSec.appendChild(wrap);

  const btn = qs("#btnUpload");
  btn.addEventListener("click", async () => {
    const file = qs("#fileInput").files[0];
    const path = (qs("#filePath").value || "").trim();
    const out = qs("#uploadResult");
    if (!file || !path) {
      out.innerHTML = `<div class="text-warning">Selecciona un archivo y coloca una ruta destino.</div>`;
      return;
    }
    if (!supabase) {
      out.innerHTML = `<div class="text-danger">Supabase no está disponible (revisa el script en index.html).</div>`;
      return;
    }
    out.innerHTML = `<div class="text-info">Subiendo...</div>`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: true,                 // permite sobreescribir
      contentType: file.type || undefined
    });
    if (error) {
      out.innerHTML = `<div class="text-danger">Error: ${error.message}</div>`;
      return;
    }

    // Intento public URL
    let linkHtml = "";
    try {
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (pub?.publicUrl) {
        linkHtml = `<a href="${pub.publicUrl}" target="_blank" rel="noopener">Ver archivo (público)</a>`;
      } else {
        // Si no es público, genera signed URL
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
        if (signed?.signedUrl) {
          linkHtml = `<a href="${signed.signedUrl}" target="_blank" rel="noopener">Ver archivo (enlace firmado 1h)</a>`;
        }
      }
    } catch (_) { /* noop */ }

    out.innerHTML = `<div class="text-success">Subido correctamente. ${linkHtml}</div>`;
  });
}

/* ========= Auth con Supabase ========= */
async function checkSession() {
  if (!supabase) { setAdminMode(false); return; }
  const { data: { session } } = await supabase.auth.getSession();
  setAdminMode(!!session, session?.user?.email || "Admin");
}

function setupAuthListeners() {
  const adminForm = qs("#adminForm");
  const logoutLink = qs("#adminLogout");
  const modalEl = qs("#adminModal");

  // onAuthStateChange
  if (supabase) {
    supabase.auth.onAuthStateChange((_event, session) => {
      setAdminMode(!!session, session?.user?.email || "Admin");
    });
  }

  // Login
  if (adminForm) {
    adminForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = qs("#adminUser")?.value?.trim();
      const password = qs("#adminPass")?.value;
      if (!email || !password) {
        alert("Completa email y contraseña.");
        return;
      }
      if (!supabase) {
        alert("Supabase no está disponible. Revisa el <script src='https://unpkg.com/@supabase/supabase-js@2'></script> antes de app.js");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert("Error al iniciar sesión: " + error.message);
      } else if (window.bootstrap && modalEl) {
        (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)).hide();
      }
    });
  }

  // Logout
  if (logoutLink) {
    logoutLink.addEventListener("click", async (e) => {
      e.preventDefault();
      if (supabase) await supabase.auth.signOut();
      setAdminMode(false);
    });
  }
}

/* ========= Init ========= */
document.addEventListener("DOMContentLoaded", () => {
  setYear();
  smoothAnchors();
  renderWeeks();          // ← SIEMPRE se pintan las 16 semanas
  setupAuthListeners();   // auth (si no hay supabase, no rompe)
  checkSession();         // activa/desactiva admin-on
  loadAvatar();           // intenta avatar de Storage
  injectUploadPanel();    // UI de subida (solo visible en modo admin)
});
