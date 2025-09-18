/* =========================
   app.js — COMPLETO con Supabase + Storage
   - Supabase Auth (login/logout)
   - Admin mode según sesión
   - Render dinámico de 16 semanas
   - Avatar desde Storage (fallback local)
   ========================= */

/* ========= Supabase ========= */
const SUPABASE_URL = "https://feiygnfxolxetwfrjfsh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlaXlnbmZ4b2x4ZXR3ZnJqZnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxOTU1MjAsImV4cCI6MjA3Mjc3MTUyMH0.ge5Ciw_9MvIGR4y8JznteQV8sICcCBzivEapGxWnFbI";
const BUCKET = "portafolio";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

function setAdminMode(on, email = "") {
  const body = document.body;
  const adminText = qs("#adminStateText");
  if (on) {
    body.classList.add("admin-on");
    if (adminText) adminText.textContent = email || "Admin";
  } else {
    body.classList.remove("admin-on");
    if (adminText) adminText.textContent = "Administrador";
  }
}

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
  // Demo: acción Editar solo cuando hay admin-on
  const editBtn = col.querySelector('[data-admin-only]');
  editBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    if (!document.body.classList.contains("admin-on")) return;
    alert(`Editar Semana ${week.n} (demo). Aquí podrías abrir un modal para editar contenido y guardarlo en Supabase.`);
  });
  return col;
}

function renderWeeks() {
  const container = qs("#semanas .row");
  if (!container) return;
  container.innerHTML = "";
  weeksData.forEach(w => container.appendChild(createWeekCard(w)));
}

/* ========= Avatar desde Supabase Storage (con fallback) ========= */
async function loadAvatar() {
  try {
    // Ruta sugerida en tu bucket: portafolio/perfil/aldair.jpg
    const path = "perfil/aldair.jpg";
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const url = data?.publicUrl;

    const img = qs(".oval-frame img.perfil-img") || qs(".oval-frame img") || qs(".perfil-img");
    if (!img) return;

    if (url) {
      // Intentamos verificar que existe (opcional: confiar en publicUrl)
      // Si prefieres evitar HEAD/fetch por CORS, comenta el fetch y asigna directo.
      try {
        const res = await fetch(url, { method: "HEAD" });
        if (res.ok) {
          img.src = url;
          return;
        }
      } catch (_) { /* noop */ }
    }
    // Fallback local
    if (!img.src || img.src.endsWith("/") || img.src.includes("about:blank")) {
      img.src = "aldair.jpg";
    }
  } catch (err) {
    // Fallback local si algo falla
    const img = qs(".oval-frame img.perfil-img") || qs(".oval-frame img") || qs(".perfil-img");
    if (img) img.src = "aldair.jpg";
  }
}

/* ========= Supabase Auth ========= */
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  setAdminMode(!!session, session?.user?.email);
}

function setupAuthListeners() {
  // Cambios de sesión
  supabase.auth.onAuthStateChange((_event, session) => {
    setAdminMode(!!session, session?.user?.email);
  });

  // Login con email/clave (usa el modal existente)
  const adminForm = qs("#adminForm");
  if (adminForm) {
    adminForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = qs("#adminUser")?.value.trim();
      const password = qs("#adminPass")?.value;

      if (!email || !password) {
        alert("Completa email y contraseña.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert("Error al iniciar sesión: " + error.message);
      } else {
        const modalEl = qs("#adminModal");
        if (modalEl && window.bootstrap) {
          const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
          modal.hide();
        }
      }
    });
  }

  // Logout
  const logoutLink = qs("#adminLogout");
  if (logoutLink) {
    logoutLink.addEventListener("click", async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
    });
  }
}

/* ========= Inicialización ========= */
document.addEventListener("DOMContentLoaded", () => {
  setYear();
  smoothAnchors();
  renderWeeks();
  setupAuthListeners();
  checkSession();
  loadAvatar(); // intenta cargar foto desde Storage (fallback a aldair.jpg)
});



