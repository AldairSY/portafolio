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

/* ========= 2) REFERENCIAS UI ========= */
const grid = document.getElementById('grid');
const weekSelect = document.getElementById('week-select');
const btnAddWeek = document.getElementById('btn-add-week');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const userEmail = document.getElementById('user-email');
const fileInput = document.getElementById('file-input');
const uploader = document.querySelector('.uploader');

const authModal = document.getElementById('auth-modal');
const emailInput = document.getElementById('auth-email');
const passInput = document.getElementById('auth-pass');
const btnEmailLogin = document.getElementById('btn-email-login');
const btnEmailSignup = document.getElementById('btn-email-signup');
const btnGoogle = document.getElementById('btn-google');

document.getElementById('year').textContent = new Date().getFullYear();

let currentUser = null;
let semanas = []; // Se llena desde Firestore

/* ========= 3) RENDER ========= */
function fillWeekSelect(){
  weekSelect.innerHTML = "";
  semanas.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.titulo;
    weekSelect.appendChild(opt);
  });
  if (semanas[0]) weekSelect.value = semanas[0].id;
}

async function render(){
  grid.innerHTML = "";
  const semId = weekSelect.value;
  if(!semId){ grid.innerHTML = "<p class='muted'>Crea tu primera semana para empezar.</p>"; return; }

  const itemsSnap = await db.collection('semanas').doc(semId)
    .collection('items').orderBy('createdAt','desc').get();

  if(itemsSnap.empty){
    grid.innerHTML = "<p class='muted'>Aún no hay archivos en esta semana. Sube uno con el botón de arriba.</p>";
    return;
  }

  itemsSnap.forEach(d => {
    const it = d.data();
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <span class="badge">${semanas.find(s=>s.id===semId)?.titulo||''}</span>
      <div class="thumb">${ it.thumb ? `<img src="${it.thumb}" alt="">` : "Sin vista previa" }</div>
      <h3>${it.titulo}</h3>
      <div class="row">
        <a class="btn" href="${it.url}" target="_blank" rel="noopener">Ver archivo</a>
        <a class="btn btn-outline" href="${it.url}" download>Descargar</a>
      </div>`;
    grid.appendChild(card);
  });
}
weekSelect.addEventListener('change', render);

/* ========= 4) AUTENTICACIÓN ========= */
btnLogin.addEventListener('click', () => authModal.showModal());
btnLogout.addEventListener('click', () => auth.signOut());

btnEmailLogin.addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    await auth.signInWithEmailAndPassword(emailInput.value, passInput.value);
    authModal.close();
  } catch (err) { alert("Error: " + err.message); }
});

btnEmailSignup.addEventListener('click', async () => {
  try {
    await auth.createUserWithEmailAndPassword(emailInput.value, passInput.value);
    alert("Cuenta creada. Ya estás autenticado.");
    authModal.close();
  } catch (err) { alert("No se pudo crear la cuenta: " + err.message); }
});

btnGoogle.addEventListener('click', async () => {
  try {
    await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    authModal.close();
  } catch (err) { alert("Google Auth: " + err.message); }
});

auth.onAuthStateChanged(user => {
  currentUser = user;
  if(user){
    userEmail.textContent = user.email;
    btnLogin.style.display = 'none';
    btnLogout.style.display = 'inline-block';
    btnAddWeek.style.display = 'inline-block';
    uploader.style.display = 'inline-flex';
  }else{
    userEmail.textContent = '';
    btnLogin.style.display = 'inline-block';
    btnLogout.style.display = 'none';
    btnAddWeek.style.display = 'none';
    uploader.style.display = 'none';
  }
});

/* ========= 5) SEMANAS (tiempo real) ========= */
db.collection('semanas').orderBy('createdAt','desc').onSnapshot(snap => {
  semanas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  fillWeekSelect();
  render();
});

btnAddWeek.addEventListener('click', async () => {
  const titulo = prompt("Título de la semana (p.ej. 'Semana 1'):");
  if(!titulo) return;
  const id = titulo.toLowerCase().trim().replace(/\s+/g,'-');
  await db.collection('semanas').doc(id).set({
    titulo, createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  weekSelect.value = id;
  render();
});

/* ========= 6) SUBIDA A STORAGE ========= */
fileInput.addEventListener('change', async (ev) => {
  const file = ev.target.files[0];
  if(!file){ return; }
  if(!currentUser){ alert("Inicia sesión para subir."); return; }

  const semId = weekSelect.value;
  const ref = storage.ref().child(`${semId}/${Date.now()}_${file.name}`);
  await ref.put(file);
  const url = await ref.getDownloadURL();

  await db.collection('semanas').doc(semId).collection('items').add({
    titulo: file.name,
    url,
    thumb: null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  fileInput.value = "";
  render();
});
