/* ========= 1) Configuración de Supabase (ya lista) ========= */
const SUPABASE_URL = "https://feiygnfxolxetwfrjfsh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlaXlnbmZ4b2x4ZXR3ZnJqZnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxOTU1MjAsImV4cCI6MjA3Mjc3MTUyMH0.ge5Ciw_9MvIGR4y8JznteQV8sICcCBzivEapGxWnFbI";
const BUCKET = "portafolio"; // nombre del bucket público en Storage

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ========= 2) UI (interfaz) ========= */
document.getElementById('year').textContent = new Date().getFullYear();

const weeksGrid  = document.getElementById('weeks-grid');
const itemsGrid  = document.getElementById('items-grid');
const panelTitle = document.getElementById('panel-title');
const uploader   = document.getElementById('uploader');
const fileInput  = document.getElementById('file-input');

const btnLogin   = document.getElementById('btn-login');
const btnLogout  = document.getElementById('btn-logout');
const userEmail  = document.getElementById('user-email');
const authModal  = document.getElementById('auth-modal');
const emailInput = document.getElementById('auth-email');
const passInput  = document.getElementById('auth-pass');
const btnEmailLogin  = document.getElementById('btn-email-login');
const btnEmailSignup = document.getElementById('btn-email-signup');
const btnAddWeek = document.getElementById('btn-add-week');

/* ========= 3) Estado y semanas generadas ========= */
let currentUser = null;
let weeks = Array.from({length:8}, (_,i)=>`semana-${i+1}`);
let currentWeekId = "";

/* ========= 4) Autenticación (Email/Password) ========= */
btnLogin.onclick = () => authModal.showModal();
btnLogout.onclick = async () => { await supabase.auth.signOut(); location.reload(); };

btnEmailLogin.onclick = async (e) => {
  e.preventDefault();
  const { error } = await supabase.auth.signInWithPassword({
    email: emailInput.value, password: passInput.value
  });
  if(error) return alert(error.message);
  authModal.close(); afterAuth();
};

btnEmailSignup.onclick = async () => {
  const { error } = await supabase.auth.signUp({
    email: emailInput.value, password: passInput.value
  });
  if(error) return alert(error.message);
  alert("Cuenta creada. Revisa tu correo si se requiere confirmación.");
  authModal.close(); afterAuth();
};

async function afterAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user;
  if(user) {
    userEmail.textContent = user.email;
    btnLogin.style.display   = 'none';
    btnLogout.style.display  = 'inline-block';
    uploader.style.display   = 'inline-flex';
    btnAddWeek.style.display = 'inline-block';
  } else {
    userEmail.textContent = '';
    btnLogin.style.display   = 'inline-block';
    btnLogout.style.display  = 'none';
    uploader.style.display   = 'none';
    btnAddWeek.style.display = 'none';
  }
}
afterAuth();

/* ========= 5) Renderizar semanas como carpetas ========= */
function renderWeeks(){
  weeksGrid.innerHTML = "";
  weeks.forEach(w => {
    const card = document.createElement('button');
    card.className = 'week-card' + (w === currentWeekId ? ' active' : '');
    card.innerHTML = `
      <div class="week-title">${w.replace('semana','Semana ').replace('-',' ')}</div>
      <div class="week-sub">ver archivos</div>`;
    card.onclick = () => selectWeek(w);
    weeksGrid.appendChild(card);
  });
  if(!currentWeekId && weeks[0]) selectWeek(weeks[0]);
}
renderWeeks();

btnAddWeek.onclick = () => {
  const n = prompt("Nombre de la nueva semana (ej. semana-9):");
  if(!n) return;
  const id = n.trim().toLowerCase();
  if(!/^semana-\d+$/.test(id)) return alert("Formato inválido. Usa 'semana-9'");
  if(!weeks.includes(id)) weeks.push(id);
  renderWeeks();
};

/* ========= 6) Listar archivos de la semana seleccionada ========= */
async function selectWeek(id) {
  currentWeekId = id;
  panelTitle.textContent = id.replace('semana','Semana ').replace('-',' ');
  renderWeeks();
  await renderItems(id);
}

async function renderItems(weekId) {
  itemsGrid.innerHTML = "<p class='muted'>Cargando…</p>";
  const { data, error } = await supabase.storage.from(BUCKET).list(weekId, {
    limit: 200, offset: 0,
    sortBy: { column: 'name', order: 'desc' }
  });

  if(error) { itemsGrid.innerHTML = "<p class='muted'>No hay archivos todavía.</p>"; return; }
  if(!data || data.length === 0) {
    itemsGrid.innerHTML = "<p class='muted'>No hay archivos. Sube uno primero.</p>";
    return;
  }

  itemsGrid.innerHTML = "";
  data.forEach(obj => {
    const path = `${weekId}/${obj.name}`;
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const url = pub.publicUrl;

    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="thumb">Sin vista previa</div>
      <h4 title="${obj.name}">${obj.name}</h4>
      <div class="row">
        <a class="btn" href="${url}" target="_blank" rel="noopener">Ver archivo</a>
        <a class="btn btn-outline" href="${url}" download>Descargar</a>
      </div>`;
    itemsGrid.appendChild(card);
  });
}

/* ========= 7) Subir archivos a la carpeta de la semana ========= */
fileInput.onchange = async (ev) => {
  const file = ev.target.files[0];
  if(!file) return;

  const { data: { user } } = await supabase.auth.getUser();
  if(!user) return alert("Inicia sesión para subir.");
  if(!currentWeekId) return alert("Selecciona una semana.");

  const safeName = `${Date.now()}_${file.name}`;
  const path = `${currentWeekId}/${safeName}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert:false });
  if(upErr) return alert(upErr.message);

  fileInput.value = "";
  renderItems(currentWeekId);
};
