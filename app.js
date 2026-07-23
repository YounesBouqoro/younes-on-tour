import { firebaseConfig, ADMIN_EMAIL } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore,collection,onSnapshot,query,orderBy,addDoc,updateDoc,deleteDoc,doc,serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const fb=initializeApp(firebaseConfig),auth=getAuth(fb),db=getFirestore(fb);
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let tours=[],milestones=[],filter="all";
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const n=v=>Number(v||0),date=v=>v?new Date(v+"T12:00:00").toLocaleDateString("de-DE"):"";

const defaultMilestones=[
 {id:"venlo",title:"Venlo",subtitle:"Erste Auslandstour",icon:"⛪",order:1,completed:true},
 {id:"xanten",title:"Xanten",subtitle:"Langdistanz-Test",icon:"🏰",order:2,completed:false},
 {id:"amsterdam",title:"Amsterdam",subtitle:"One-Way-Challenge",icon:"🏘️",order:3,completed:false},
 {id:"paris",title:"Paris",subtitle:"Mehrtagestour",icon:"🗼",order:4,completed:false},
 {id:"gardasee",title:"Gardasee",subtitle:"Das große Abenteuer",icon:"⛰️",order:5,completed:false}
];

function pub(){return tours.filter(t=>t.published!==false)}
function renderHero(){
 const p=pub(),bike=p.filter(t=>t.type==="bike").reduce((s,t)=>s+n(t.distance),0),run=p.filter(t=>t.type==="run").reduce((s,t)=>s+n(t.distance),0);
 $("#heroBikeKm").textContent=bike.toFixed(1)+" km";$("#heroRunKm").textContent=run.toFixed(1)+" km";$("#heroTourCount").textContent=p.length;
 const list=(milestones.length?milestones:defaultMilestones).slice().sort((a,b)=>n(a.order)-n(b.order));
 const done=list.filter(m=>m.completed).length,pct=list.length?Math.round(done/list.length*100):0;
 $("#milestoneFraction").textContent=`${done} / ${list.length}`;$("#heroProgressPercent").textContent=pct+"%";$("#heroProgressBar").style.width=pct+"%";
 $("#heroMilestones").innerHTML=list.map(m=>`<div class="milestone ${m.completed?"done":""}"><div class="emblem">${esc(m.icon||"•")}</div><strong>${esc(m.title)}</strong><small>${esc(m.completed?"Erledigt":m.subtitle||"Geplant")}</small></div>`).join("");
}
function renderTours(){
 const list=pub().filter(t=>filter==="all"||t.type===filter);
 $("#tourGrid").innerHTML=list.map(t=>`<article class="tour-card" data-tour="${t.id}"><div class="tour-image" style="background-image:url('${esc(t.coverUrl||"")}')"></div><div class="tour-body"><h3>${esc(t.title)}</h3><p>${esc(t.route)} · ${date(t.date)}</p><div class="metrics"><div><strong>${n(t.distance)} km</strong><span>Distanz</span></div><div><strong>${esc(t.duration||"–")}</strong><span>Dauer</span></div><div><strong>${esc(t.speed||"–")}</strong><span>${t.type==="run"?"Pace":"Ø Tempo"}</span></div></div></div></article>`).join("");
 $$("[data-tour]").forEach(x=>x.onclick=()=>openTour(x.dataset.tour));
}
function renderChallenges(){
 const list=(milestones.length?milestones:defaultMilestones).slice().sort((a,b)=>n(a.order)-n(b.order));
 $("#challengeGrid").innerHTML=list.map(m=>`<article class="challenge-card ${m.completed?"done":""}"><span class="challenge-status">${m.completed?"ERLEDIGT":"GEPLANT"}</span><h3>${esc(m.icon)} ${esc(m.title)}</h3><p>${esc(m.subtitle||"")}</p></article>`).join("");
}
function openTour(id){const t=tours.find(x=>x.id===id);if(!t)return;$("#tourDetail").innerHTML=`<div class="detail-hero" style="background-image:url('${esc(t.coverUrl||"")}')"><div><p class="eyebrow">${t.type==="bike"?"RADFAHREN":"LAUFEN"}</p><h2>${esc(t.title)}</h2><p>${esc(t.route)} · ${date(t.date)}</p></div></div><div class="detail-body"><h3>${n(t.distance)} km · ${esc(t.duration||"")}</h3><p>${esc(t.story||"")}</p>${t.learnings?`<h3>Fazit</h3><p>${esc(t.learnings)}</p>`:""}</div>`;$("#tourModal").classList.remove("hidden")}
$$("[data-close]").forEach(b=>b.onclick=()=>$("#"+b.dataset.close).classList.add("hidden"));
$("#tourFilters").onclick=e=>{const b=e.target.closest("button");if(!b)return;filter=b.dataset.filter;$$("#tourFilters button").forEach(x=>x.classList.toggle("active",x===b));renderTours()};
$("#themeToggle").onclick=()=>{const t=document.documentElement.dataset.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=t;localStorage.setItem("theme",t)};document.documentElement.dataset.theme=localStorage.getItem("theme")||"light";

const openLogin=()=>$("#loginModal").classList.remove("hidden");$("#loginBtn").onclick=openLogin;
$("#loginForm").onsubmit=async e=>{e.preventDefault();try{await signInWithEmailAndPassword(auth,$("#loginEmail").value,$("#loginPassword").value);$("#loginModal").classList.add("hidden")}catch{$("#loginError").textContent="Login fehlgeschlagen."}};
onAuthStateChanged(auth,u=>{const ok=u?.email===ADMIN_EMAIL;$("#loginBtn").textContent=ok?"Admin":"Login";$("#loginBtn").onclick=ok?()=>$("#adminPanel").classList.remove("hidden"):openLogin});
$("#logoutBtn").onclick=()=>signOut(auth);$("#closeAdminBtn").onclick=()=>$("#adminPanel").classList.add("hidden");

const tourFields=["title","type","date","route","distance","duration","speed","elevation","heartRate","coverUrl","activityUrl","gpxUrl","story","learnings","published"];
function resetTour(){$("#tourForm").reset();$("#tourId").value="";$("#date").value=new Date().toISOString().slice(0,10);$("#published").checked=true}
$("#resetTourBtn").onclick=resetTour;
$("#tourForm").onsubmit=async e=>{e.preventDefault();const d={};tourFields.forEach(k=>d[k]=k==="published"?$("#"+k).checked:$("#"+k).value);d.distance=n(d.distance);d.elevation=n(d.elevation);d.heartRate=n(d.heartRate);d.galleryUrls=$("#galleryUrls").value.split("\n").map(x=>x.trim()).filter(Boolean);d.updatedAt=serverTimestamp();try{const id=$("#tourId").value;if(id)await updateDoc(doc(db,"tours",id),d);else await addDoc(collection(db,"tours"),{...d,createdAt:serverTimestamp()});resetTour();$("#tourStatus").textContent="Gespeichert."}catch{$("#tourStatus").textContent="Fehler beim Speichern."}};
function editTour(id){const t=tours.find(x=>x.id===id);if(!t)return;$("#tourId").value=id;tourFields.forEach(k=>k==="published"?$("#"+k).checked=t[k]!==false:$("#"+k).value=t[k]??"");$("#galleryUrls").value=(t.galleryUrls||[]).join("\n")}
async function delTour(id){if(confirm("Tour löschen?"))await deleteDoc(doc(db,"tours",id))}

function resetMilestone(){$("#milestoneForm").reset();$("#milestoneId").value=""}
$("#resetMilestoneBtn").onclick=resetMilestone;
$("#milestoneForm").onsubmit=async e=>{e.preventDefault();const d={title:$("#milestoneTitle").value,icon:$("#milestoneIcon").value,order:n($("#milestoneOrder").value),completed:$("#milestoneCompleted").value==="true",subtitle:$("#milestoneSubtitle").value,updatedAt:serverTimestamp()};try{const id=$("#milestoneId").value;if(id)await updateDoc(doc(db,"milestones",id),d);else await addDoc(collection(db,"milestones"),{...d,createdAt:serverTimestamp()});resetMilestone();$("#milestoneStatus").textContent="Gespeichert."}catch{$("#milestoneStatus").textContent="Fehler beim Speichern."}};
function editMilestone(id){const m=milestones.find(x=>x.id===id);if(!m)return;$("#milestoneId").value=id;$("#milestoneTitle").value=m.title||"";$("#milestoneIcon").value=m.icon||"";$("#milestoneOrder").value=m.order||0;$("#milestoneCompleted").value=String(!!m.completed);$("#milestoneSubtitle").value=m.subtitle||""}
async function delMilestone(id){if(confirm("Meilenstein löschen?"))await deleteDoc(doc(db,"milestones",id))}

function adminLists(){
 $("#adminTourList").innerHTML=tours.map(t=>`<div class="admin-row"><div><strong>${esc(t.title)}</strong><small>${date(t.date)} · ${n(t.distance)} km</small></div><div><button class="small-btn" data-et="${t.id}">Bearbeiten</button> <button class="small-btn" data-dt="${t.id}">Löschen</button></div></div>`).join("");
 $$("[data-et]").forEach(b=>b.onclick=()=>editTour(b.dataset.et));$$("[data-dt]").forEach(b=>b.onclick=()=>delTour(b.dataset.dt));
 $("#adminMilestoneList").innerHTML=milestones.map(m=>`<div class="admin-row"><div><strong>${esc(m.icon)} ${esc(m.title)}</strong><small>${m.completed?"Erledigt":"Geplant"} · Position ${n(m.order)}</small></div><div><button class="small-btn" data-em="${m.id}">Bearbeiten</button> <button class="small-btn" data-dm="${m.id}">Löschen</button></div></div>`).join("");
 $$("[data-em]").forEach(b=>b.onclick=()=>editMilestone(b.dataset.em));$$("[data-dm]").forEach(b=>b.onclick=()=>delMilestone(b.dataset.dm));
}
$$(".admin-tabs button").forEach(b=>b.onclick=()=>{$$(".admin-tabs button").forEach(x=>x.classList.toggle("active",x===b));$("#adminToursTab").classList.toggle("hidden",b.dataset.tab!=="tours");$("#adminMilestonesTab").classList.toggle("hidden",b.dataset.tab!=="milestones")});

function render(){renderHero();renderTours();renderChallenges();adminLists()}
onSnapshot(query(collection(db,"tours"),orderBy("date","desc")),s=>{tours=s.docs.map(d=>({id:d.id,...d.data()}));render()});
onSnapshot(collection(db,"milestones"),s=>{milestones=s.docs.map(d=>({id:d.id,...d.data()}));render()});
resetTour();
