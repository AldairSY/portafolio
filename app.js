/* ========= 1) CONFIGURA TU FIREBASE AQUÍ ========= */
// Reemplaza todo el objeto con el que viste en Firebase (pestaña "Config").
const firebaseConfig = {
  apiKey: "AIzaSyB8uhR0mcG5JjGAJ-QiZM2DTm_Ivv1Y",
  authDomain: "webs-6c92c.firebaseapp.com",
  projectId: "webs-6c92c",
  storageBucket: "webs-6c92c.firebasestorage.app",
  messagingSenderId: "492658307589",
  appId: "1:492658307589:web:bb748e00d38bfbff9923c",
  measurementId: "G-XH3PYVB3K0"
}; 
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

/* ========== 2) REFERENCIAS UI ========== */
const yearEl = document.getElementById('year'); yearEl.textContent = new Date().getFullYear();
const weeksGrid = document.getElementById('weeks-grid');
const itemsGrid = document.getElementById('items-grid');
const panelTitle = document.getElementById('panel-title');
const uploader = document.getElementById('uploader');
const fileInput = document.getElementById('file-input');

const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const userEmail = document.getElementById('user-email');
const authModal = document.getElementById('auth-modal');
const emailInput = document.getElementById('auth-email');
const passInput  = document.getElementById('auth-pass');
const btnEmailLogin  = document.getElementById('btn-email-login');
const btnEmailSignup = document.getElementById('btn-email-signup');
const btnGoogle = document.getElementById('btn-google');

const btnAddWeek = document.getElementById('btn-add-week');
const btnSeed = document.getElementById('btn-seed');

let currentUser = null;
let semanas = [];       // {id, titulo, orden, createdAt}
let currentWeekId = ""; // seleccionada

/* ========== 3) UTILIDADES ========== */
function weekDoc(id, titulo, orden){
  return { titulo, orden, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
}
function renderWeeks(){
  weeksGrid.innerHTML = "";
  semanas.sort((a,b)=>a.orden-b.orden).forEach(s=>{
    const card = document.createElement('button');
    card.className = 'week-card' + (s.id === currentWeekId ? ' active':'' );
    card.innerHTML = `
      <div class="week-title">${s.titulo}</div>
      <div class="week-sub">ver archivos</div>
    `;
    card.onclick = ()=> selectWeek(s.id, s.titulo);
    weeksGrid.appendChild(card);
  });
  if (!currentWeekId && semanas[0]) selectWeek(semanas[0].id, semanas[0].titulo);
}
async function selectWeek(id, titulo){
  currentWeekId = id;
  panelTitle.textContent = titulo;
  renderWeeks(); // para marcar active
  await renderItems(id);
}
async function renderItems(semId){
  itemsGrid.innerHTML = "<p class='muted'>Cargando...</p>";
  const snap = await db.collection('semanas').doc(semId).collection('items')
    .orderBy('createdAt','desc').get();
  itemsGrid.innerHTML = "";
  if (snap.empty){
    itemsGrid.innerHTML = "<p class='muted'>No hay archivos. Sube el primero 👆</p>";
    return;
  }
  snap.forEach(d=>{
    const it = d.data();
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="thumb">${ it.thumb ? `<img src="${it.thumb}" alt="">` : "Sin vista previa" }</div>
      <h4>${it.titulo}</h4>
      <div class="row">
        <a class="btn" href="${it.url}" target="_blank" rel="noopener">Ver archivo</a>
        <a class="btn btn-outline" href="${it.url}" download>Descargar</a>
      </div>
    `;
    itemsGrid.appendChild(card);
  });
}

/* ========== 4) AUTH ========== */
btnLogin.onclick = ()=> authModal.showModal();
btnLogout.onclick = ()=> auth.signOut();

btnEmailLogin.onclick = async (e)=>{
  e.preventDefault();
  try{
    await auth.signInWithEmailAndPassword(emailInput.value, passInput.value);
    authModal.close();
  }catch(err){ alert(err.message); }
};
btnEmailSignup.onclick = async ()=>{
  try{
    await auth.createUserWithEmailAndPassword(emailInput.value, passInput.value);
    alert("Cuenta creada ✅"); authModal.close();
  }catch(err){ alert(err.message); }
};
btnGoogle.onclick = async ()=>{
  try{
    await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    authModal.close();
  }catch(err){ alert(err.message); }
};

auth.onAuthStateChanged(user=>{
  currentUser = user;
  if(user){
    userEmail.textContent = user.email;
    btnLogin.style.display = 'none';
    btnLogout.style.display = 'inline-block';
    uploader.style.display = 'inline-flex';
    btnAddWeek.style.display = 'inline-block';
  }else{
    userEmail.textContent = '';
    btnLogin.style.display = 'inline-block';
    btnLogout.style.display = 'none';
    uploader.style.display = 'none';
    btnAddWeek.style.display = 'none';
  }
});

/* ========== 5) LECTURA DE SEMANAS (Realtime) ========== */
db.collection('semanas').orderBy('orden','asc').onSnapshot(snap=>{
  semanas = snap.docs.map(d=>({ id:d.id, ...d.data() }));
  renderWeeks();

  // Si no existe ninguna semana y hay usuario logeado, muestra botón sembrar (1–4)
  btnSeed.style.display = (semanas.length===0 && currentUser) ? 'inline-block' : 'none';
});

/* ========== 6) CREAR SEMANAS 1–4 (una sola vez) ========== */
btnSeed.onclick = async ()=>{
  if(!currentUser) return alert("Inicia sesión");
  const batch = db.batch();
  const defs = [
    {id:'semana-1', titulo:'Semana 1', orden:1},
    {id:'semana-2', titulo:'Semana 2', orden:2},
    {id:'semana-3', titulo:'Semana 3', orden:3},
    {id:'semana-4', titulo:'Semana 4', orden:4},
  ];
  defs.forEach(w=>{
    const ref = db.collection('semanas').doc(w.id);
    batch.set(ref, weekDoc(w.id, w.titulo, w.orden));
  });
  await batch.commit();
  alert("Semanas 1–4 creadas ✅");
};

/* ========== 7) AGREGAR SEMANA MANUAL ========== */
btnAddWeek.onclick = async ()=>{
  const titulo = prompt("Título de la semana (p.ej. 'Semana 5'):");
  if(!titulo) return;
  const orden = parseInt(prompt("Orden (número entero, p.ej. 5):") || "0",10);
  const id = titulo.trim().toLowerCase().replace(/\s+/g,'-');
  await db.collection('semanas').doc(id).set(weekDoc(id, titulo, orden||0));
  selectWeek(id, titulo);
};

/* ========== 8) SUBIDA DE ARCHIVOS ========== */
fileInput.onchange = async (ev)=>{
  const file = ev.target.files[0];
  if(!file) return;
  if(!currentUser) return alert("Inicia sesión para subir.");
  if(!currentWeekId) return alert("Selecciona una semana.");

  const ref = storage.ref().child(`${currentWeekId}/${Date.now()}_${file.name}`);
  await ref.put(file);
  const url = await ref.getDownloadURL();
  await db.collection('semanas').doc(currentWeekId).collection('items').add({
    titulo:file.name, url, thumb:null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  fileInput.value = "";
  renderItems(currentWeekId);
};
