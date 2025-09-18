/* =========================
   app.js — portada
   - Render 16 semanas con links a week.html?week=N
   - Auth Supabase (login/logout) → modo admin
   - Avatar desde Storage (fallback local)
   ========================= */

const SUPABASE_URL = "https://feiygnfxolxetwfrjfsh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlaXlnbmZ4b2x4ZXR3ZnJqZnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxOTU1MjAsImV4cCI6MjA3Mjc3MTUyMH0.ge5Ciw_9MvIGR4y8JznteQV8sICcCBzivEapGxWnFbI";
const BUCKET = "portafolio";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Datos base (si quieres, luego los movemos a Supabase tabla weeks)
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

const qs = (s, c=document)=>c.querySelector(s);
const qsa=(s, c=document)=>Array.from(c.querySelectorAll(s));

function setAdminMode(on, label="Admin"){
  document.body.classList.toggle("admin-on", !!on);
  const t = qs("#adminStateText");
  if (t) t.textContent = on ? label : "Administrador";
}

function renderWeeks(){
  const row = qs("#semanas .row");
  row.innerHTML = "";
  DEFAULT_WEEKS.forEach(w=>{
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4";
    col.innerHTML = `
      <div class="card week-card h-100">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="week-badge">Semana ${w.n}</span>
            <small class="text-muted-2">Estado: ${w.state}</small>
          </div>
          <h5 class="card-title">${w.title}</h5>
          <p class="card-text">${w.text}</p>
          <div class="d-flex gap-2">
            <a class="btn btn-sm btn-danger-emphasis" href="week.html?week=${w.n}">
              <i class="bi bi-eye me-1"></i>Ver detalle
            </a>
            <a class="btn btn-sm btn-outline-light" href="week.html?week=${w.n}#archivos">
              <i class="bi bi-paperclip me-1"></i>Adjuntos
            </a>
          </div>
        </div>
      </div>`;
    row.appendChild(col);
  });
}

async function loadAvatar(){
  const img = qs(".perfil-img"); if (!img) return;
  const path = "perfil/aldair.jpg";
  try {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (data?.publicUrl) { img.src = data.publicUrl; return; }
    const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (signed.data?.signedUrl) { img.src = signed.data.signedUrl; return; }
  } catch {}
  // fallback local
  img.src = "aldair.jpg";
}

async function checkSession(){
  const { data:{ session } } = await supabase.auth.getSession();
  setAdminMode(!!session, session?.user?.email || "Admin");
  supabase.auth.onAuthStateChange((_e, s)=>{
    setAdminMode(!!s, s?.user?.email || "Admin");
  });
}

function setupAuth(){
  qs("#adminForm")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email = qs("#adminUser").value.trim();
    const password = qs("#adminPass").value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Error: "+error.message);
    else (bootstrap.Modal.getInstance(qs("#adminModal"))||new bootstrap.Modal(qs("#adminModal"))).hide();
  });
  qs("#adminLogout")?.addEventListener("click", async (e)=>{
    e.preventDefault(); await supabase.auth.signOut(); setAdminMode(false);
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  renderWeeks();
  loadAvatar();
  checkSession();
  setupAuth();
  const y = qs("#year"); if (y) y.textContent = new Date().getFullYear();
});
