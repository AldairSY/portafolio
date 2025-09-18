/* ====== CONFIG SUPABASE ====== */
const SUPABASE_URL = "https://feiygnfxolxetwfrjfsh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlaXlnbmZ4b2x4ZXR3ZnJqZnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxOTU1MjAsImV4cCI6MjA3Mjc3MTUyMH0.ge5Ciw_9MvIGR4y8JznteQV8sICcCBzivEapGxWnFbI";
const BUCKET = "portafolio";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ====== 16 SEMANAS ====== */
const WEEKS = [
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

/* ====== HELPERS ====== */
const qs = (s,c=document)=>c.querySelector(s);

/* ====== ADMIN ====== */
function setAdminMode(on, label = "Admin"){
  document.body.classList.toggle("admin-on", !!on);
  const t = qs("#adminStateText");
  if (t) t.textContent = on ? label : "Administrador";
}

/* ====== AVATAR con fallback seguro ======
   - Muestra primero aldair.jpg local
   - Si hay archivo en Supabase (perfil/aldair.jpg), lo prueba y lo usa
========================================= */
function probeImage(url){
  return new Promise(res=>{
    const im = new Image();
    im.onload = ()=>res(true);
    im.onerror = ()=>res(false);
    im.src = url;
  });
}
async function loadAvatar(){
  const img = qs(".perfil-img");
  if (!img) return;

  // 1) Siempre mostramos el local de entrada (ya debe existir junto al index.html)
  img.src = "aldair.jpg";

  try {
    const path = "perfil/aldair.jpg";
    // 2) Intentamos primero signed URL (sirve con bucket privado)
    const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (signed.data?.signedUrl){
      const ok = await probeImage(signed.data.signedUrl);
      if (ok){ img.src = signed.data.signedUrl; return; }
    }

    // 3) Si no hay signed (o falló), probamos publicUrl SOLO si realmente sirve
    const pub = supabase.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl;
    if (pub){
      const ok = await probeImage(pub);
      if (ok){ img.src = pub; return; }
    }
  } catch (_) {
    // ignoramos y mantenemos el local
  }
  // Si nada funcionó, queda el local sin romper nada.
}

/* ====== RENDER WEEKS ====== */
function renderWeeks(){
  const row = qs("#semanas .row");
  row.innerHTML = "";
  WEEKS.forEach(w=>{
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
            <a class="btn btn-sm btn-accent" href="week.html?week=${w.n}">
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

/* ====== AUTH ====== */
async function initAuth(){
  const { data:{ session } } = await supabase.auth.getSession();
  setAdminMode(!!session, session?.user?.email || "Admin");
  supabase.auth.onAuthStateChange((_e, s)=> setAdminMode(!!s, s?.user?.email || "Admin"));

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

/* ====== INIT ====== */
document.addEventListener("DOMContentLoaded", ()=>{
  renderWeeks();
  loadAvatar();            // ← ahora sí, seguro
  initAuth();
  const y = qs("#year"); if (y) y.textContent = new Date().getFullYear();
});
/* ========= CONTACTO (guardar en Supabase) ========= */
function cAlert(type, text){
  const box = document.getElementById("cAlert");
  if (!box) return;
  box.className = `alert ${type}`;
  box.textContent = text;
  box.classList.remove("d-none");
}
function cHide(){ const box=document.getElementById("cAlert"); if(box){ box.classList.add("d-none"); box.textContent=""; } }
function isEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

async function handleContactSubmit(e){
  e.preventDefault();
  cHide();

  const name  = document.getElementById("cName")?.value.trim();
  const email = document.getElementById("cEmail")?.value.trim();
  const msg   = document.getElementById("cMsg")?.value.trim();

  if (!name || !email || !msg){
    cAlert("alert-warning","Completa todos los campos.");
    return;
  }
  if (!isEmail(email)){
    cAlert("alert-warning","Ingresa un email válido.");
    return;
  }

  // Inserta en la tabla contact_messages
  const { error } = await supabase.from("contact_messages")
    .insert({ name, email, message: msg });

  if (error){
    console.error("[contact_messages] insert error:", error);
    cAlert("alert-danger","No se pudo enviar: " + error.message);
  } else {
    cAlert("alert-success","✅ ¡Mensaje enviado! Gracias por escribirme.");
    document.getElementById("contactForm")?.reset();
  }
}

// enganche del submit cuando cargue el DOM
document.addEventListener("DOMContentLoaded", ()=>{
  const form = document.getElementById("contactForm");
  if (form) form.addEventListener("submit", handleContactSubmit);
});


