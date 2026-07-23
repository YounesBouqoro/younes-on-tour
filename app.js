import { firebaseConfig, ADMIN_EMAIL } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseReady = !firebaseConfig.apiKey.startsWith("DEIN_");
let auth, db;
if (firebaseReady) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const state = { tours: [], filter: "all", user: null, map: null };

const demoTours = [{
  id:"demo",
  title:"Erste längere Ausfahrt",
  type:"bike",
  date:"2026-07-22",
  route:"Düsseldorf – Rheinrunde",
  distance:57.06,
  duration:"2:35:55",
  speed:"22,0 km/h",
  elevation:148,
  heartRate:132,
  coverUrl:"https://images.unsplash.com/photo-1502744688674-c619d1586c9e?auto=format&fit=crop&w=1600&q=85",
  galleryUrls:[],
  story:"Die erste längere Ausfahrt mit dem neuen Canyon. Bewusst locker gefahren, ohne auf maximale Geschwindigkeit zu gehen. Das Ziel war klar: entspannt Kilometer sammeln und herausfinden, wie sich Rad, Sitzposition und Körper nach mehr als zwei Stunden anfühlen.",
  learnings:"Das Tempo war kontrolliert, der Puls niedrig und es waren noch Reserven vorhanden. Ein solider Ausgangspunkt für Xanten, Amsterdam und später Paris.",
  published:true
}];

function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function formatDate(v){return v ? new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(v+"T12:00:00")) : ""}
function sportLabel(t){return t==="run"?"Laufen":"Radfahren"}
function metricLabel(t){return t==="run"?"Pace":"Ø Tempo"}

function render(){
  const visible=state.tours.filter(t=>t.published!==false && (state.filter==="all"||t.type===state.filter));
  $("#tourGrid").innerHTML=visible.map(t=>`
    <article class="tour-card" data-id="${esc(t.id)}">
      <div class="tour-image" style="background-image:url('${esc(t.coverUrl||"https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=80")}')">
        <span class="sport-badge">${sportLabel(t.type)}</span>
      </div>
      <div class="tour-body">
        <h3>${esc(t.title)}</h3><p class="tour-route">${esc(t.route)} · ${formatDate(t.date)}</p>
        <div class="metric-row">
          <div><strong>${esc(t.distance)} km</strong><span>DISTANZ</span></div>
          <div><strong>${esc(t.duration||"–")}</strong><span>DAUER</span></div>
          <div><strong>${esc(t.speed||"–")}</strong><span>${metricLabel(t.type).toUpperCase()}</span></div>
        </div>
      </div>
    </article>`).join("");
  $("#emptyState").classList.toggle("hidden",visible.length>0);
  $$(".tour-card").forEach(el=>el.onclick=()=>openDetail(el.dataset.id));
  updateStats();
  renderAdminList();
}

function updateStats(){
  const pub=state.tours.filter(t=>t.published!==false);
  const bike=pub.filter(t=>t.type==="bike").reduce((s,t)=>s+Number(t.distance||0),0);
  const run=pub.filter(t=>t.type==="run").reduce((s,t)=>s+Number(t.distance||0),0);
  const longest=Math.max(0,...pub.map(t=>Number(t.distance||0)));
  $("#statTours").textContent=pub.length;
  $("#statBike").textContent=`${bike.toLocaleString("de-DE",{maximumFractionDigits:1})} km`;
  $("#statRun").textContent=`${run.toLocaleString("de-DE",{maximumFractionDigits:1})} km`;
  $("#statLongest").textContent=`${longest.toLocaleString("de-DE",{maximumFractionDigits:1})} km`;
}

function openDetail(id){
  const t=state.tours.find(x=>x.id===id); if(!t)return;
  const gallery=(t.galleryUrls||[]).map(u=>`<img loading="lazy" src="${esc(u)}" alt="">`).join("");
  $("#detailContent").innerHTML=`
    <button class="detail-close" aria-label="Schließen">×</button>
    <div class="detail-hero" style="background-image:url('${esc(t.coverUrl||"")}')"><div>
      <p class="eyebrow">${sportLabel(t.type)} · ${formatDate(t.date)}</p><h2>${esc(t.title)}</h2><p>${esc(t.route)}</p>
    </div></div>
    <div class="detail-body">
      <div class="detail-metrics">
        <div><strong>${esc(t.distance)} km</strong><span>Distanz</span></div>
        <div><strong>${esc(t.duration||"–")}</strong><span>Dauer</span></div>
        <div><strong>${esc(t.speed||"–")}</strong><span>${metricLabel(t.type)}</span></div>
        <div><strong>${esc(t.elevation||0)} m</strong><span>Höhenmeter</span></div>
        <div><strong>${esc(t.heartRate||"–")}</strong><span>Ø Herzfrequenz</span></div>
      </div>
      <h3>Die Geschichte</h3><p class="detail-text">${esc(t.story)}</p>
      ${t.learnings?`<h3>Fazit & Learnings</h3><p class="detail-text">${esc(t.learnings)}</p>`:""}
      ${t.gpxUrl?`<h3>Strecke</h3><div id="routeMap" class="route-map"><div class="map-loading">GPX-Strecke wird geladen …</div></div>`:""}
      ${gallery?`<h3>Galerie</h3><div class="gallery">${gallery}</div>`:""}
      <div class="link-row">
        ${t.activityUrl?`<a class="button button-primary" href="${esc(t.activityUrl)}" target="_blank" rel="noopener">Aktivität öffnen</a>`:""}
        ${t.videoUrl?`<a class="button button-ghost-dark" href="${esc(t.videoUrl)}" target="_blank" rel="noopener">Video ansehen</a>`:""}
        ${t.gpxUrl?`<a class="button button-ghost-dark" href="${esc(t.gpxUrl)}" target="_blank" rel="noopener">GPX herunterladen</a>`:""}
      </div>
    </div>`;
  $(".detail-close").onclick=()=>closeDetail();
  $("#detailDialog").showModal();
  if(t.gpxUrl) renderGpxMap(t.gpxUrl);
}


function closeDetail(){
  if(state.map){state.map.remove();state.map=null}
  $("#detailDialog").close();
}

async function renderGpxMap(url){
  const el=$("#routeMap");
  if(!el||!window.L)return;
  try{
    const res=await fetch(url);
    if(!res.ok) throw new Error("GPX konnte nicht geladen werden");
    const text=await res.text();
    const xml=new DOMParser().parseFromString(text,"application/xml");
    const points=[...xml.querySelectorAll("trkpt")].map(p=>[Number(p.getAttribute("lat")),Number(p.getAttribute("lon"))]).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));
    if(points.length<2) throw new Error("Keine Trackpunkte gefunden");
    el.innerHTML="";
    state.map=L.map(el,{scrollWheelZoom:false});
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap-Mitwirkende"}).addTo(state.map);
    const line=L.polyline(points,{weight:5,opacity:.9}).addTo(state.map);
    state.map.fitBounds(line.getBounds(),{padding:[20,20]});
  }catch(err){
    console.error(err);
    el.innerHTML='<div class="map-error">Die GPX-Datei konnte nicht angezeigt werden. Prüfe, ob der Link öffentlich erreichbar ist.</div>';
  }
}

$$(".filter").forEach(b=>b.onclick=()=>{$$(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.filter=b.dataset.filter;render()});
$("#loginButton").onclick=()=>$("#loginDialog").showModal();
$("#logoutButton").onclick=()=>signOut(auth);
$("#closeAdmin").onclick=()=>$("#adminPanel").classList.add("hidden");
$("#resetForm").onclick=resetForm;

$("#loginForm").addEventListener("submit",async(e)=>{
  e.preventDefault();
  if(!firebaseReady){$("#loginError").textContent="Firebase ist noch nicht eingerichtet. Siehe README.";return}
  try{
    await signInWithEmailAndPassword(auth,$("#loginEmail").value,$("#loginPassword").value);
    $("#loginDialog").close();
  }catch(err){$("#loginError").textContent="Login fehlgeschlagen. E-Mail oder Passwort prüfen."}
});

function resetForm(){
  $("#tourForm").reset();$("#editId").value="";$("#published").checked=true;$("#date").value=new Date().toISOString().slice(0,10);$("#saveStatus").textContent="";
}

function formData(){
  return {
    title:$("#title").value.trim(),type:$("#type").value,date:$("#date").value,route:$("#route").value.trim(),
    distance:Number($("#distance").value),duration:$("#duration").value.trim(),speed:$("#speed").value.trim(),
    elevation:Number($("#elevation").value||0),heartRate:Number($("#heartRate").value||0),
    coverUrl:$("#coverUrl").value.trim(),
    galleryUrls:$("#galleryUrls").value.split("\n").map(x=>x.trim()).filter(Boolean),
    videoUrl:$("#videoUrl").value.trim(),activityUrl:$("#activityUrl").value.trim(),gpxUrl:$("#gpxUrl").value.trim(),
    story:$("#story").value.trim(),learnings:$("#learnings").value.trim(),published:$("#published").checked,
    updatedAt:serverTimestamp()
  }
}

$("#tourForm").addEventListener("submit",async(e)=>{
  e.preventDefault();
  if(!state.user||state.user.email!==ADMIN_EMAIL){$("#saveStatus").textContent="Keine Admin-Berechtigung.";return}
  try{
    const id=$("#editId").value,data=formData();
    if(id) await updateDoc(doc(db,"tours",id),data);
    else await addDoc(collection(db,"tours"),{...data,createdAt:serverTimestamp()});
    $("#saveStatus").textContent="Tour erfolgreich gespeichert.";
    resetForm();
  }catch(err){console.error(err);$("#saveStatus").textContent="Speichern fehlgeschlagen. Firestore-Regeln prüfen."}
});

function renderAdminList(){
  if(!state.user)return;
  $("#adminTourList").innerHTML=state.tours.map(t=>`<div class="admin-item">
    <div><strong>${esc(t.title)}</strong><br><small>${formatDate(t.date)} · ${esc(t.distance)} km</small></div>
    <div class="admin-actions"><button class="small-btn edit" data-id="${esc(t.id)}">Bearbeiten</button><button class="small-btn delete" data-id="${esc(t.id)}">Löschen</button></div>
  </div>`).join("");
  $$(".admin-item .edit").forEach(b=>b.onclick=()=>editTour(b.dataset.id));
  $$(".admin-item .delete").forEach(b=>b.onclick=()=>removeTour(b.dataset.id));
}
function editTour(id){
  const t=state.tours.find(x=>x.id===id);if(!t)return;
  ["title","type","date","route","distance","duration","speed","elevation","heartRate","coverUrl","videoUrl","activityUrl","gpxUrl","story","learnings"].forEach(k=>$("#"+k).value=t[k]??"");
  $("#galleryUrls").value=(t.galleryUrls||[]).join("\n");$("#published").checked=t.published!==false;$("#editId").value=id;window.scrollTo({top:0,behavior:"smooth"});
}
async function removeTour(id){
  if(!confirm("Tour wirklich löschen?"))return;
  await deleteDoc(doc(db,"tours",id));
}

if(firebaseReady){
  onAuthStateChanged(auth,user=>{
    state.user=user;
    const isAdmin=user?.email===ADMIN_EMAIL;
    $("#loginButton").classList.toggle("hidden",!!user);
    $("#logoutButton").classList.toggle("hidden",!user);
    $("#adminPanel").classList.toggle("hidden",!isAdmin);
    renderAdminList();
  });
  const q=query(collection(db,"tours"),orderBy("date","desc"));
  onSnapshot(q,snap=>{state.tours=snap.docs.map(d=>({id:d.id,...d.data()}));render()},err=>{
    console.warn(err);state.tours=demoTours;render();
  });
}else{
  state.tours=demoTours;render();
}
resetForm();
