/* ========= Supabase ========= */
const SUPABASE_URL = "https://feiygnfxolxetwfrjfsh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlaXlnbmZ4b2x4ZXR3ZnJqZnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxOTU1MjAsImV4cCI6MjA3Mjc3MTUyMH0.ge5Ciw_9MvIGR4y8JznteQV8sICcCBzivEapGxWnFbI";
const BUCKET = "portafolio";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ========= UI refs ========= */
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

/* ========= Estado ========= */
let currentUser = null;
/* 16 semanas por defecto */
let weeks = Array.from({length:16}, (_,i)=>`semana-${i+1}`);
let currentWeekId = "";

/* ========= Auth ========= */
btnLogin.onclick = ()=> authModal.showModal();
btnLogout.onclick = async ()=>{ await supabase.auth.signOut(); location.reload(); };

btnEmailLogin.onclick = async (e)=>{
  e.preventDefault();
  const { error } = await supabase.auth.signInWithPassword({
    email: emailInput.value, password: passInput.value
  });
  if(error) return alert(error.message);
  authModal.close(); afterAuth();
};

btnEmailSignup.onclick = async ()=>{
  const { error } = await supabase.auth.signUp({
    email: emailInput.value, password: passInput.value
  });
  if(error) return alert(error.message);
  alert("Cuenta creada. Revisa tu correo si se requiere confirmación.");
  authModal.close(); afterAuth();
};

async function afterAuth(){
  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user;
  if(user){
    userEmail.textContent = user.email;
    btnLogin.style.display   = 'none';
    btnLogout.style.display  = 'inline-block';
    uploader.style.display   = 'inline-flex';
    btnAddWeek.style.display = 'inline-block';
  }else{
    userEmail.textContent = '';
    btnLogin.style.display   = 'inline-block';
    btnLogout.style.display  = 'none';
    uploader.style.display   = 'none';
    btnAddWeek.style.display = 'none';
  }
}
afterAuth();

/* ========= Semanas ========= */
function renderWeeks(){
  weeksGrid.innerHTML = "";
  weeks.forEach(w=>{
    const card = document.createElement('button');
    card.className = 'week-card' + (w===currentWeekId ? ' active' : '');
    card.innerHTML = `
      <div class="week-title">${w.replace('semana','Semana ').replace('-',' ')}</div>
      <div class="week-sub">ver archivos</div>`;
    card.onclick = ()=> selectWeek(w);
    weeksGrid.appendChild(card);
  });
  if(!currentWeekId && weeks[0]) selectWeek(weeks[0]);
}
renderWeeks();

btnAddWeek.onclick = ()=>{
  const n = prompt("Nombre de la semana (ej. semana-17):");
  if(!n) return;
  const id = n.trim().toLowerCase();
  if(!/^semana-\d+$/.test(id)) return alert("Formato: semana-17");
  if(!weeks.includes(id)) weeks.push(id);
  renderWeeks();
};

/* ========= Helpers ========= */
function ext(path){ return (path.split('.').pop() || '').toLowerCase(); }
function isImg(e){ return ['jpg','jpeg','png','gif','webp','bmp','svg'].includes(e); }
function isPdf(e){ return e === 'pdf'; }

/* ========= Listar items con previsualización + eliminar ========= */
async function selectWeek(id){
  currentWeekId = id;
  panelTitle.textContent = id.replace('semana','Semana ').replace('-',' ');
  renderWeeks();
  await renderItems(id);
}

async function renderItems(weekId){
  itemsGrid.innerHTML = "<p class='muted'>Cargando…</p>";
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(weekId, { limit: 200, offset: 0, sortBy: { column: 'name', order: 'desc' }});

  if(error){ itemsGrid.innerHTML = "<p class='muted'>No hay archivos todavía.</p>"; return; }
  if(!data || data.length===0){ itemsGrid.innerHTML = "<p class='muted'>No hay archivos. Sube el primero.</p>"; return; }

  itemsGrid.innerHTML = "";
  data.forEach(obj=>{
    const path = `${weekId}/${obj.name}`;
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const url = pub.publicUrl;
    const e = ext(obj.name);

    let preview = `<div class="thumb">Sin vista previa</div>`;
    if(isImg(e)) preview = `<div class="thumb"><img src="${url}" alt="${obj.name}"></div>`;
    else if(isPdf(e)) preview = `<div class="thumb"><iframe src="${url}#toolbar=0&view=fitH"></iframe></div>`;

    const meta = new Date(obj.created_at || Date.now()).toLocaleString();

    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      ${preview}
      <h4 title="${obj.name}">${obj.name}</h4>
      <div class="file-meta">${meta}</div>
      <div class="row">
        <a class="btn" href="${url}" target="_blank" rel="noopener">Ver archivo</a>
        <a class="btn btn-outline" href="${url}" download>Descargar</a>
        ${currentUser ? `<button class="btn btn-danger" data-path="${path}">Eliminar</button>` : ``}
      </div>`;
    itemsGrid.appendChild(card);
  });

  // Acciones de borrar (si está logueado)
  if(currentUser){
    itemsGrid.querySelectorAll('.btn-danger').forEach(btn=>{
      btn.onclick = async ()=>{
        const path = btn.getAttribute('data-path');
        if(!confirm(`¿Eliminar "${path.split('/').pop()}"?`)) return;
        const { error } = await supabase.storage.from(BUCKET).remove([path]);
        if(error){ alert(error.message); return; }
        await renderItems(weekId);
      };
    });
  }
}

/* ========= Subir ========= */
fileInput.onchange = async (ev)=>{
  const file = ev.target.files[0];
  if(!file) return;
  const { data: { user } } = await supabase.auth.getUser();
  if(!user) return alert("Inicia sesión para subir.");
  if(!currentWeekId) return alert("Selecciona una semana.");

  const safeName = `${Date.now()}_${file.name}`;
  const path = `${currentWeekId}/${safeName}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert:false });
  if(upErr){ alert(upErr.message); return; }

  fileInput.value = "";
  renderItems(currentWeekId);
};
