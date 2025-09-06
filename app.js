// === Configuración ===
const SUPABASE_URL = "https://feiygnfxolxetwfrjfsh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlaXlnbmZ4b2x4ZXR3ZnJqZnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxOTU1MjAsImV4cCI6MjA3Mjc3MTUyMH0.ge5Ciw_9MvIGR4y8JznteQV8sICcCBzivEapGxWnFbI";
const BUCKET = "portafolio";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const userEmail = document.getElementById("userEmail");
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const btnUpload = document.getElementById("btnUpload");
const fileInput = document.getElementById("fileInput");
const itemsGrid = document.getElementById("itemsGrid");
const weekBtns = document.querySelectorAll(".week-btn");
const uploader = document.getElementById("uploader");

let currentUser = null;
let currentWeekId = "semana1";

// === Helpers ===
function ext(name){ return (name.split('.').pop() || '').toLowerCase(); }
function isImg(e){ return ['jpg','jpeg','png','gif','webp','bmp','svg'].includes(e); }
function isPdf(e){ return e === 'pdf'; }

// === Autenticación ===
btnLogin.onclick = async ()=>{
  const email = prompt("Correo:");
  const pass = prompt("Contraseña:");
  if (!email || !pass) return;
  const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error) alert(error.message);
  afterAuth();
};
btnLogout.onclick = async ()=>{ await supabase.auth.signOut(); afterAuth(); };

// === Estado de sesión ===
async function afterAuth(){
  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user;
  userEmail.textContent = currentUser ? currentUser.email : "";
  btnLogin.style.display = currentUser ? "none" : "inline-block";
  btnLogout.style.display = currentUser ? "inline-block" : "none";
  uploader.style.display = currentUser ? "flex" : "none";
  renderItems(currentWeekId);
}
afterAuth();

// === Semanas ===
weekBtns.forEach(b=>{
  b.onclick = ()=>{
    currentWeekId = b.dataset.id;
    renderItems(currentWeekId);
  };
});

// === Subir archivos ===
btnUpload.onclick = async ()=>{
  if (!currentUser) return alert("Debes iniciar sesión");
  const file = fileInput.files[0];
  if (!file) return alert("Selecciona un archivo");

  const path = `${currentWeekId}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) { alert(error.message); return; }
  renderItems(currentWeekId);
};

// === Renderizar archivos ===
async function renderItems(weekId){
  itemsGrid.innerHTML = "<p>Cargando…</p>";
  const { data, error } = await supabase.storage.from(BUCKET).list(weekId);
  if (error || !data.length){ itemsGrid.innerHTML = "<p>No hay archivos</p>"; return; }
  itemsGrid.innerHTML = "";

  for (const obj of data){
    const path = `${weekId}/${obj.name}`;
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const url = pub.publicUrl;
    const e = ext(obj.name);

    let preview = `<div class="thumb">Sin vista previa</div>`;
    if (isImg(e)) preview = `<div class="thumb"><img src="${url}"></div>`;
    if (isPdf(e)) preview = `<div class="thumb"><iframe src="${url}#toolbar=0"></iframe></div>`;

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      ${preview}
      <h4>${obj.name}</h4>
      <div class="row">
        <a class="btn" href="${url}" target="_blank">Ver</a>
        <a class="btn btn-outline" href="${url}" download>Descargar</a>
        ${currentUser ? `<button class="btn btn-danger" data-path="${path}">Eliminar</button>` : ""}
      </div>
    `;
    itemsGrid.appendChild(card);
  }

  // Activar eliminar
  itemsGrid.querySelectorAll(".btn-danger").forEach(btn=>{
    btn.onclick = async ()=>{
      const path = btn.getAttribute("data-path");
      if (!confirm(`Eliminar ${path}?`)) return;
      const { error } = await supabase.storage.from(BUCKET).remove([path]);
      if (error) alert(error.message);
      renderItems(weekId);
    };
  });
}
