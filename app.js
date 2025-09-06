// ======= CONFIGURAR FIREBASE =======
// Pega aquí tu firebaseConfig
// ======= CONFIGURAR FIREBASE =======
const firebaseConfig = {
  apiKey: "AIzaSyBhpP52h-yUZNyrp8TT8igkr8dKLq42do4",
  authDomain: "ortafolio-bd.firebaseapp.com",
  projectId: "ortafolio-bd",
  storageBucket: "ortafolio-bd.firebasestorage.app",
  messagingSenderId: "256998343657",
  appId: "1:256998343657:web:3bc3b1750cad27a5854b0e",
  measurementId: "G-S74SLSGZ1D"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();


// ======= UI =======
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

let currentUser = null;
let semanas = []; // sólo Firestore

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
  if(!semId){ grid.innerHTML = "<p>No hay semanas.</p>"; return; }
  const itemsSnap = await db.collection('semanas').doc(semId).collection('items').orderBy('createdAt','desc').get();
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
      </div>
    `;
    grid.appendChild(card);
  });
}

// ======= Auth =======
btnLogin.addEventListener('click', () => authModal.showModal());
btnLogout.addEventListener('click', () => auth.signOut());
btnEmailLogin.addEventListener('click', async (e) => {
  e.preventDefault();
  try{ await auth.signInWithEmailAndPassword(emailInput.value, passInput.value); authModal.close(); }
  catch(err){ alert(err.message); }
});
btnEmailSignup.addEventListener('click', async () => {
  try{ await auth.createUserWithEmailAndPassword(emailInput.value, passInput.value); alert("Cuenta creada"); authModal.close(); }
  catch(err){ alert(err.message); }
});
btnGoogle.addEventListener('click', async () => {
  try{ await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); authModal.close(); }
  catch(err){ alert(err.message); }
});
auth.onAuthStateChanged(async user => {
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

// ======= Semanas (realtime) =======
db.collection('semanas').orderBy('createdAt','desc').onSnapshot(snap => {
  semanas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  fillWeekSelect();
  render();
});

btnAddWeek.addEventListener('click', async () => {
  const titulo = prompt("Título de la semana (p.ej. 'Semana 3'):");
  if(!titulo) return;
  const id = titulo.toLowerCase().replace(/\s+/g,'-');
  await db.collection('semanas').doc(id).set({ titulo, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  weekSelect.value = id;
  render();
});

weekSelect.addEventListener('change', render);

// ======= Subida a Storage =======
fileInput.addEventListener('change', async (ev) => {
  const file = ev.target.files[0];
  if(!file || !currentUser) return alert("Inicia sesión para subir.");
  const semId = weekSelect.value;
  const ref = storage.ref().child(`${semId}/${Date.now()}_${file.name}`);
  await ref.put(file);
  const url = await ref.getDownloadURL();
  await db.collection('semanas').doc(semId).collection('items').add({
    titulo: file.name, url, thumb: null, createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  fileInput.value = "";
  render();
});
