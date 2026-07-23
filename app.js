import { firebaseConfig, ADMIN_EMAIL } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const PLACEHOLDER_IMAGE = "media/hero-neu.png";

const defaultSite = {
  heroTitle: "Von Düsseldorf\nin die Welt.",
  heroSubtitle: "Jede Tour ist ein neuer Meilenstein. Hier sieht man direkt, was schon geschafft ist und was als Nächstes kommt.",
  heroImage: PLACEHOLDER_IMAGE
};

const defaultMilestones = [
  {
    id: "demo-venlo",
    title: "Venlo",
    icon: "⛪",
    order: 1,
    completed: true,
    subtitle: "Erste Auslandstour",
    sportType: "bike",
    countInStats: true,
    countAsAdventure: true,
    route: "Düsseldorf → Venlo",
    targetDistance: 65,
    actualDistance: 65,
    completedDate: "",
    duration: "",
    speed: "",
    elevation: 0,
    story: "Der erste Meilenstein der Roadmap. Hier kannst du später Strecke, GPX, Bilder und Bericht ergänzen.",
    coverUrl: "",
    gpxUrl: "",
    activityUrl: ""
  },
  {
    id: "demo-xanten",
    title: "Xanten",
    icon: "🏰",
    order: 2,
    completed: false,
    subtitle: "Langdistanz-Test",
    sportType: "bike",
    countInStats: true,
    countAsAdventure: true,
    route: "Düsseldorf → Xanten → Düsseldorf",
    targetDistance: 120,
    actualDistance: 0,
    story: "Geplantes Ziel für den nächsten längeren Radtest."
  },
  {
    id: "demo-amsterdam",
    title: "Amsterdam",
    icon: "🏘️",
    order: 3,
    completed: false,
    subtitle: "One-Way-Challenge",
    sportType: "bike",
    countInStats: true,
    countAsAdventure: true,
    route: "Düsseldorf → Amsterdam",
    targetDistance: 240,
    actualDistance: 0,
    story: "Mit dem Rad hin, mit dem Zug zurück."
  },
  {
    id: "demo-paris",
    title: "Paris",
    icon: "🗼",
    order: 4,
    completed: false,
    subtitle: "Mehrtagestour",
    sportType: "bike",
    countInStats: true,
    countAsAdventure: true,
    route: "Düsseldorf → Paris",
    targetDistance: 520,
    actualDistance: 0,
    story: "Das große Mehrtagesziel."
  },
  {
    id: "demo-gardasee",
    title: "Gardasee",
    icon: "⛰️",
    order: 5,
    completed: false,
    subtitle: "Das große Abenteuer",
    sportType: "bike",
    countInStats: true,
    countAsAdventure: true,
    route: "Düsseldorf → Gardasee",
    targetDistance: 900,
    actualDistance: 0,
    story: "Langfristiges Ziel mit richtigem Abenteuer-Charakter."
  }
];

const demoChallenges = [
  {
    id: "demo-c1",
    title: "500 km mit dem Rad",
    icon: "🚴",
    mode: "bikeKm",
    target: 500,
    current: 0,
    order: 1,
    description: "Automatisch aus allen veröffentlichten Radtouren berechnet.",
    published: true
  },
  {
    id: "demo-c2",
    title: "100 km zu Fuß",
    icon: "🏃",
    mode: "runKm",
    target: 100,
    current: 0,
    order: 2,
    description: "Automatisch aus allen veröffentlichten Läufen berechnet.",
    published: true
  },
  {
    id: "demo-c3",
    title: "Alle Meilensteine",
    icon: "🏆",
    mode: "completedMilestones",
    target: 5,
    current: 0,
    order: 3,
    description: "Zählt automatisch alle erledigten Meilensteine.",
    published: true
  }
];

let firebaseReady = false;
let auth = null;
let db = null;
let currentUser = null;
let tours = [];
let milestones = [];
let challenges = [];
let siteConfig = { ...defaultSite };
let activeTourFilter = "all";
let activeMilestoneFilter = "all";
let activeMap = null;

const isConfigured =
  firebaseConfig &&
  firebaseConfig.apiKey &&
  !String(firebaseConfig.apiKey).startsWith("DEIN_") &&
  ADMIN_EMAIL &&
  !String(ADMIN_EMAIL).startsWith("DEINE_");

if (isConfigured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  firebaseReady = true;
} else {
  console.warn("Firebase ist noch nicht konfiguriert. Die Seite läuft im Demo-Modus.");
  milestones = [...defaultMilestones];
  challenges = [...demoChallenges];
}

function formatNumber(value, digits = 1) {
  const number = Number(value || 0);
  return number.toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function formatKm(value) {
  return `${formatNumber(value, 1)} km`;
}


function normalizeImageUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";

  // GitHub "blob" links are file preview pages, not direct image files.
  // Example:
  // https://github.com/YounesBouqoro/younes-on-tour/blob/main/media/hero-neu.png
  const blobMatch = value.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
  if (blobMatch) {
    const [, user, repo, ref, path] = blobMatch;

    // For files inside this GitHub Pages repository, the relative path is the safest option.
    if (repo === "younes-on-tour" && path.startsWith("media/")) {
      return path;
    }

    return `https://raw.githubusercontent.com/${user}/${repo}/${ref}/${path}`;
  }

  return value;
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function nl2br(value) {
  return safe(value).replace(/\n/g, "<br>");
}

function numeric(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function dateLabel(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}

function publishedTours() {
  return tours.filter((tour) => tour.published !== false);
}

function allMilestones() {
  const source = milestones.length ? milestones : defaultMilestones;
  return source.slice().sort((a, b) => numeric(a.order) - numeric(b.order));
}

function visibleMilestones(filter = activeMilestoneFilter) {
  const source = allMilestones();
  if (filter === "all") return source;
  return source.filter((milestone) => (milestone.sportType || "bike") === filter);
}

function visibleChallenges() {
  const source = challenges.length ? challenges : demoChallenges;
  return source.filter((challenge) => challenge.published !== false).sort((a, b) => numeric(a.order) - numeric(b.order));
}

function calculateStats() {
  const list = publishedTours();
  const bikeTours = list.filter((tour) => tour.type === "bike");
  const runTours = list.filter((tour) => tour.type === "run");

  const tourBikeKm = bikeTours.reduce((sum, tour) => sum + numeric(tour.distance), 0);
  const tourRunKm = runTours.reduce((sum, tour) => sum + numeric(tour.distance), 0);

  const countableMilestones = allMilestones().filter((m) => m.completed && m.countInStats !== false);
  const bikeMilestones = countableMilestones.filter((m) => (m.sportType || "bike") === "bike");
  const runMilestones = countableMilestones.filter((m) => (m.sportType || "bike") === "run");

  const milestoneBikeKm = bikeMilestones.reduce((sum, m) => sum + numeric(m.actualDistance || m.distance || m.targetDistance), 0);
  const milestoneRunKm = runMilestones.reduce((sum, m) => sum + numeric(m.actualDistance || m.distance || m.targetDistance), 0);

  const bikeKm = tourBikeKm + milestoneBikeKm;
  const runKm = tourRunKm + milestoneRunKm;
  const totalKm = bikeKm + runKm;

  const adventureMilestones = allMilestones().filter((m) => m.completed && m.countAsAdventure !== false);
  const count = list.length + adventureMilestones.length;

  const longest = Math.max(0, ...list.map((tour) => numeric(tour.distance)), ...countableMilestones.map((m) => numeric(m.actualDistance || m.distance || m.targetDistance)));
  const longestBike = Math.max(0, ...bikeTours.map((tour) => numeric(tour.distance)), ...bikeMilestones.map((m) => numeric(m.actualDistance || m.distance || m.targetDistance)));
  const longestRun = Math.max(0, ...runTours.map((tour) => numeric(tour.distance)), ...runMilestones.map((m) => numeric(m.actualDistance || m.distance || m.targetDistance)));
  const completedMilestones = allMilestones().filter((m) => m.completed).length;

  return {
    tours: list,
    bikeTours,
    runTours,
    bikeKm,
    runKm,
    totalKm,
    tourBikeKm,
    tourRunKm,
    milestoneBikeKm,
    milestoneRunKm,
    bikeMilestones,
    runMilestones,
    adventureMilestones,
    count,
    longest,
    longestBike,
    longestRun,
    completedMilestones
  };
}

function calculateRoadmap(filter = activeMilestoneFilter) {
  const list = visibleMilestones(filter);
  const completed = list.filter((m) => m.completed);
  const countTotal = list.length;
  const countDone = completed.length;
  const countPercent = countTotal ? Math.round((countDone / countTotal) * 100) : 0;

  const plannedDistance = list.reduce((sum, item) => {
    const target = numeric(item.targetDistance || item.distance || item.actualDistance);
    return sum + target;
  }, 0);

  const completedDistance = list.reduce((sum, item) => {
    if (!item.completed) return sum;
    const actual = numeric(item.actualDistance || item.distance || item.targetDistance);
    return sum + actual;
  }, 0);

  const distancePercent = plannedDistance ? Math.min(100, Math.round((completedDistance / plannedDistance) * 100)) : countPercent;
  const progressPercent = plannedDistance ? distancePercent : countPercent;

  return {
    list,
    completed,
    countTotal,
    countDone,
    countPercent,
    plannedDistance,
    completedDistance,
    distancePercent,
    progressPercent,
    filter
  };
}

function challengeValue(challenge) {
  const stats = calculateStats();
  switch (challenge.mode) {
    case "bikeKm": return stats.bikeKm;
    case "runKm": return stats.runKm;
    case "totalKm": return stats.totalKm;
    case "tourCount": return stats.count;
    case "completedMilestones": return stats.completedMilestones;
    default: return numeric(challenge.current);
  }
}

function renderAll() {
  renderSiteConfig();
  renderHeroStats();
  renderRoadmap();
  renderTours();
  renderChallenges();
  renderGallery();
  renderAdminSelectors();
  renderAdminLists();
}

function renderSiteConfig() {
  const title = siteConfig.heroTitle || defaultSite.heroTitle;
  const subtitle = siteConfig.heroSubtitle || defaultSite.heroSubtitle;
  const image = normalizeImageUrl(siteConfig.heroImage || defaultSite.heroImage);

  $("#heroTitle").innerHTML = nl2br(title);
  $("#heroSubtitle").textContent = subtitle;
  $("#heroBg").style.backgroundImage = `linear-gradient(90deg, rgba(7,9,9,.92), rgba(7,9,9,.56) 48%, rgba(7,9,9,.82)), url("${image}")`;
  document.documentElement.style.setProperty("--hero-image", `url("${image}")`);

  $("#siteHeroTitle").value = title;
  $("#siteHeroSubtitle").value = subtitle;
  $("#siteHeroImage").value = image;
}

function renderHeroStats() {
  const stats = calculateStats();
  $("#bikeTotal").textContent = formatKm(stats.bikeKm);
  $("#bikeMeta").textContent = `${stats.bikeTours.length} Touren + ${stats.bikeMilestones.length} Meilenst.`;
  $("#runTotal").textContent = formatKm(stats.runKm);
  $("#runMeta").textContent = `${stats.runTours.length} Läufe + ${stats.runMilestones.length} Meilenst.`;
  $("#adventureTotal").textContent = String(stats.count);
}

function milestoneIcon(milestone) {
  if (milestone.imageUrl) {
    return `<img src="${safe(milestone.imageUrl)}" alt="">`;
  }
  return `<span>${safe(milestone.icon || "•")}</span>`;
}

function renderRoadmap() {
  const data = calculateRoadmap();
  const rail = $("#milestoneRail");
  rail.style.setProperty("--items", Math.max(data.list.length, 1));

  if (!data.list.length) {
    rail.innerHTML = `<div class="empty-state">Für diesen Bereich sind noch keine Meilensteine angelegt.</div>`;
  } else {
    rail.innerHTML = data.list.map((milestone) => {
      const distance = numeric(milestone.actualDistance || milestone.targetDistance || milestone.distance);
      const typeLabel = (milestone.sportType || "bike") === "run" ? "Laufen" : "Rad";
      return `
        <button class="milestone-item ${milestone.completed ? "done" : ""}" type="button" data-milestone-id="${safe(milestone.id)}">
          <div class="milestone-emblem">${milestoneIcon(milestone)}</div>
          ${milestone.completed ? `<span class="milestone-check">✓</span>` : ""}
          <strong>${safe(milestone.title)}</strong>
          <span class="milestone-status">${milestone.completed ? "Erledigt" : "Geplant"}</span>
          <span class="milestone-type">${safe(typeLabel)}</span>
          ${distance ? `<span class="milestone-distance">${formatKm(distance)}</span>` : ""}
        </button>
      `;
    }).join("");
  }

  $$("#milestoneRail [data-milestone-id]").forEach((button) => {
    button.addEventListener("click", () => openMilestone(button.dataset.milestoneId));
  });

  $("#roadmapPercent").textContent = `${data.progressPercent}%`;
  $("#roadmapProgress").style.width = `${data.progressPercent}%`;
  $("#roadmapCountMeta").textContent = `${data.countDone} / ${data.countTotal} Meilensteine erreicht`;
  $("#roadmapDistanceMeta").textContent = data.plannedDistance
    ? `${formatKm(data.completedDistance)} von ca. ${formatKm(data.plannedDistance)}`
    : "Distanzen noch nicht gepflegt";
}

function renderTours() {
  const list = publishedTours()
    .filter((tour) => activeTourFilter === "all" || tour.type === activeTourFilter)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  const grid = $("#tourGrid");
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state">Noch keine veröffentlichten Touren vorhanden.</div>`;
    return;
  }

  grid.innerHTML = list.map((tour) => {
    const image = tour.coverUrl || PLACEHOLDER_IMAGE;
    const icon = tour.type === "run" ? "🏃" : "🚴";
    return `
      <button class="tour-card" type="button" data-tour-id="${safe(tour.id)}">
        <div class="tour-image" style="background-image:url('${safe(image)}')">
          <span class="tour-badge">${icon} ${formatKm(tour.distance)}</span>
        </div>
        <div class="tour-body">
          <h3>${safe(tour.title)}</h3>
          <p>${safe(tour.route || "")}${tour.date ? ` · ${dateLabel(tour.date)}` : ""}</p>
          <div class="tour-metrics">
            <div><span>Dauer</span><strong>${safe(tour.duration || "–")}</strong></div>
            <div><span>${tour.type === "run" ? "Pace" : "Ø Tempo"}</span><strong>${safe(tour.speed || "–")}</strong></div>
            <div><span>Höhenmeter</span><strong>${numeric(tour.elevation)} m</strong></div>
          </div>
        </div>
      </button>
    `;
  }).join("");

  $$("#tourGrid [data-tour-id]").forEach((button) => {
    button.addEventListener("click", () => openTour(button.dataset.tourId));
  });
}

function renderChallenges() {
  const list = visibleChallenges();
  const grid = $("#challengeGrid");

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state">Noch keine Challenges vorhanden.</div>`;
    return;
  }

  grid.innerHTML = list.map((challenge) => {
    const value = challengeValue(challenge);
    const target = numeric(challenge.target);
    const percent = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
    const done = percent >= 100;
    return `
      <button class="challenge-card" type="button" data-challenge-id="${safe(challenge.id)}">
        <div class="challenge-top">
          <span class="challenge-icon">${safe(challenge.icon || "🏆")}</span>
          <div>
            <h3>${safe(challenge.title)}</h3>
            <p>${safe(challenge.description || "")}</p>
          </div>
          <span class="challenge-value">${done ? "✓" : `${percent}%`}</span>
        </div>
        <div class="challenge-progress"><span style="width:${percent}%"></span></div>
      </button>
    `;
  }).join("");

  $$("#challengeGrid [data-challenge-id]").forEach((button) => {
    button.addEventListener("click", () => openChallenge(button.dataset.challengeId));
  });
}

function renderGallery() {
  const photos = [];
  publishedTours().forEach((tour) => {
    if (tour.coverUrl) photos.push({ src: tour.coverUrl, title: tour.title, tourId: tour.id });
    const gallery = Array.isArray(tour.galleryUrls) ? tour.galleryUrls : [];
    gallery.forEach((src) => photos.push({ src, title: tour.title, tourId: tour.id }));
  });

  const grid = $("#galleryGrid");
  if (!photos.length) {
    grid.innerHTML = `<div class="empty-state">Noch keine Bilder vorhanden.</div>`;
    return;
  }

  grid.innerHTML = photos.slice(0, 9).map((photo) => `
    <button class="gallery-tile" type="button" data-tour-id="${safe(photo.tourId)}" style="background-image:url('${safe(photo.src)}')">
      <span>${safe(photo.title)}</span>
    </button>
  `).join("");

  $$("#galleryGrid [data-tour-id]").forEach((button) => {
    button.addEventListener("click", () => openTour(button.dataset.tourId));
  });
}

function showModal(id) {
  $(`#${id}`).classList.remove("hidden");
}

function hideModal(id) {
  $(`#${id}`).classList.add("hidden");
  if (activeMap) {
    activeMap.remove();
    activeMap = null;
  }
}

function openInsight(type) {
  const stats = calculateStats();
  let title = "Insights";
  let metrics = [];
  let text = "";

  if (type === "bike") {
    title = "Rad-Insights";
    metrics = [
      ["Gesamt", formatKm(stats.bikeKm)],
      ["Touren-KM", formatKm(stats.tourBikeKm)],
      ["Meilenstein-KM", formatKm(stats.milestoneBikeKm)],
      ["Aktivitäten", stats.bikeTours.length + stats.bikeMilestones.length],
      ["Längste Aktivität", formatKm(stats.longestBike)],
      ["Meilensteine", stats.bikeMilestones.length]
    ];
    text = "Hier werden alle veröffentlichten Radtouren zusammengerechnet. Sobald du im Adminbereich eine neue Radtour veröffentlichst, aktualisieren sich diese Werte automatisch.";
  }

  if (type === "run") {
    title = "Lauf-Insights";
    metrics = [
      ["Gesamt", formatKm(stats.runKm)],
      ["Lauf-KM", formatKm(stats.tourRunKm)],
      ["Meilenstein-KM", formatKm(stats.milestoneRunKm)],
      ["Aktivitäten", stats.runTours.length + stats.runMilestones.length],
      ["Längste Aktivität", formatKm(stats.longestRun)],
      ["Meilensteine", stats.runMilestones.length]
    ];
    text = "Hier werden alle veröffentlichten Läufe zusammengerechnet. Du kannst Laufen und Radfahren sauber getrennt tracken.";
  }

  if (type === "adventures") {
    const roadmap = calculateRoadmap();
    title = "Adventure-Insights";
    metrics = [
      ["Einträge", stats.count],
      ["Meilensteine", `${roadmap.countDone}/${roadmap.countTotal}`],
      ["Roadmap", `${roadmap.progressPercent}%`]
    ];
    text = "Die Roadmap zählt alle Meilensteine. Der Fortschrittsbalken passt sich automatisch an, sobald du Meilensteine im Adminbereich als erledigt markierst.";
  }

  $("#insightContent").innerHTML = `
    <div class="insight-body">
      <p class="eyebrow accent">INSIGHTS</p>
      <h2>${safe(title)}</h2>
      <div class="insight-grid">
        ${metrics.map(([label, value]) => `
          <div class="insight-metric">
            <span>${safe(label)}</span>
            <strong>${safe(value)}</strong>
          </div>
        `).join("")}
      </div>
      <p class="detail-text">${safe(text)}</p>
    </div>
  `;
  showModal("insightModal");
}

function openMilestone(id) {
  const milestone = allMilestones().find((item) => item.id === id);
  if (!milestone) return;

  const relatedTours = publishedTours().filter((tour) => tour.milestoneId === id);
  const image = milestone.coverUrl || relatedTours[0]?.coverUrl || PLACEHOLDER_IMAGE;
  const distance = numeric(milestone.actualDistance || milestone.targetDistance || milestone.distance);
  const status = milestone.completed ? "Erledigt" : "Geplant";

  $("#insightContent").innerHTML = `
    <div class="detail-hero" style="background-image:url('${safe(image)}')">
      <div>
        <p class="eyebrow">${safe(status)}</p>
        <h2>${safe(milestone.title)}</h2>
        <p>${safe(milestone.route || milestone.subtitle || "")}</p>
      </div>
    </div>
    <div class="detail-body">
      <div class="insight-grid">
        <div class="insight-metric"><span>Status</span><strong>${safe(status)}</strong></div>
        <div class="insight-metric"><span>Sportart</span><strong>${safe((milestone.sportType || "bike") === "run" ? "Laufen" : "Rad")}</strong></div>
        <div class="insight-metric"><span>Distanz</span><strong>${distance ? formatKm(distance) : "–"}</strong></div>
        <div class="insight-metric"><span>Datum</span><strong>${safe(dateLabel(milestone.completedDate) || "–")}</strong></div>
        <div class="insight-metric"><span>Dauer</span><strong>${safe(milestone.duration || "–")}</strong></div>
        <div class="insight-metric"><span>Ø Tempo</span><strong>${safe(milestone.speed || "–")}</strong></div>
        <div class="insight-metric"><span>Höhenmeter</span><strong>${numeric(milestone.elevation)} m</strong></div>
        <div class="insight-metric"><span>Zählt in Gesamt-KM</span><strong>${milestone.countInStats !== false ? "Ja" : "Nein"}</strong></div>
        <div class="insight-metric"><span>Zählt als Abenteuer</span><strong>${milestone.countAsAdventure !== false ? "Ja" : "Nein"}</strong></div>
      </div>
      <p class="detail-text">${safe(milestone.story || milestone.subtitle || "Noch keine Streckeninfos gepflegt.")}</p>
      ${relatedTours.length ? `
        <h3>Zugeordnete Touren</h3>
        <div class="detail-actions">
          ${relatedTours.map((tour) => `<button class="secondary-btn" type="button" data-open-related-tour="${safe(tour.id)}">${safe(tour.title)}</button>`).join("")}
        </div>
      ` : ""}
      <div class="detail-actions">
        ${milestone.activityUrl ? `<a class="primary-link" href="${safe(milestone.activityUrl)}" target="_blank" rel="noreferrer">Aktivität öffnen</a>` : ""}
        ${milestone.gpxUrl ? `<a href="${safe(milestone.gpxUrl)}" target="_blank" rel="noreferrer">GPX öffnen</a>` : ""}
      </div>
      ${milestone.gpxUrl ? `<div id="modalMap" class="map-box"></div>` : ""}
    </div>
  `;

  showModal("insightModal");
  $$("#insightContent [data-open-related-tour]").forEach((button) => {
    button.addEventListener("click", () => {
      hideModal("insightModal");
      openTour(button.dataset.openRelatedTour);
    });
  });
  if (milestone.gpxUrl) setTimeout(() => renderGpxMap(milestone.gpxUrl), 100);
}

function openChallenge(id) {
  const challenge = visibleChallenges().find((item) => item.id === id);
  if (!challenge) return;

  const value = challengeValue(challenge);
  const target = numeric(challenge.target);
  const percent = target ? Math.min(100, Math.round((value / target) * 100)) : 0;

  $("#insightContent").innerHTML = `
    <div class="insight-body">
      <p class="eyebrow accent">CHALLENGE</p>
      <h2>${safe(challenge.icon || "🏆")} ${safe(challenge.title)}</h2>
      <div class="insight-grid">
        <div class="insight-metric"><span>Aktuell</span><strong>${formatNumber(value, 1)}</strong></div>
        <div class="insight-metric"><span>Ziel</span><strong>${formatNumber(target, 1)}</strong></div>
        <div class="insight-metric"><span>Fortschritt</span><strong>${percent}%</strong></div>
      </div>
      <div class="challenge-progress" style="margin-top:22px"><span style="width:${percent}%"></span></div>
      <p class="detail-text">${safe(challenge.description || "Keine Beschreibung gepflegt.")}</p>
    </div>
  `;
  showModal("insightModal");
}

function openTour(id) {
  const tour = tours.find((item) => item.id === id);
  if (!tour) return;

  const image = tour.coverUrl || PLACEHOLDER_IMAGE;
  const gallery = Array.isArray(tour.galleryUrls) ? tour.galleryUrls : [];

  $("#tourDetail").innerHTML = `
    <div class="detail-hero" style="background-image:url('${safe(image)}')">
      <div>
        <p class="eyebrow">${tour.type === "run" ? "LAUFEN" : "RADFAHREN"}</p>
        <h2>${safe(tour.title)}</h2>
        <p>${safe(tour.route || "")}${tour.date ? ` · ${dateLabel(tour.date)}` : ""}</p>
      </div>
    </div>
    <div class="detail-body">
      <div class="insight-grid">
        <div class="insight-metric"><span>Distanz</span><strong>${formatKm(tour.distance)}</strong></div>
        <div class="insight-metric"><span>Dauer</span><strong>${safe(tour.duration || "–")}</strong></div>
        <div class="insight-metric"><span>${tour.type === "run" ? "Pace" : "Ø Tempo"}</span><strong>${safe(tour.speed || "–")}</strong></div>
        <div class="insight-metric"><span>Höhenmeter</span><strong>${numeric(tour.elevation)} m</strong></div>
        <div class="insight-metric"><span>Ø Puls</span><strong>${tour.heartRate ? numeric(tour.heartRate) : "–"}</strong></div>
        <div class="insight-metric"><span>Datum</span><strong>${safe(dateLabel(tour.date) || "–")}</strong></div>
      </div>
      <p class="detail-text">${safe(tour.story || "")}</p>
      ${tour.learnings ? `<h3>Fazit & Learnings</h3><p class="detail-text">${safe(tour.learnings)}</p>` : ""}
      <div class="detail-actions">
        ${tour.activityUrl ? `<a class="primary-link" href="${safe(tour.activityUrl)}" target="_blank" rel="noreferrer">Aktivität öffnen</a>` : ""}
        ${tour.videoUrl ? `<a href="${safe(tour.videoUrl)}" target="_blank" rel="noreferrer">Video ansehen</a>` : ""}
        ${tour.gpxUrl ? `<a href="${safe(tour.gpxUrl)}" target="_blank" rel="noreferrer">GPX öffnen</a>` : ""}
      </div>
      ${tour.gpxUrl ? `<div id="modalMap" class="map-box"></div>` : ""}
      ${gallery.length ? `<div class="detail-gallery">${gallery.map((src) => `<img src="${safe(src)}" alt="">`).join("")}</div>` : ""}
    </div>
  `;

  showModal("tourModal");
  if (tour.gpxUrl) setTimeout(() => renderGpxMap(tour.gpxUrl), 100);
}

function parseGpx(text) {
  const xml = new DOMParser().parseFromString(text, "text/xml");
  return [...xml.querySelectorAll("trkpt")]
    .map((point) => [
      Number(point.getAttribute("lat")),
      Number(point.getAttribute("lon"))
    ])
    .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));
}

async function renderGpxMap(gpxUrl) {
  const container = $("#modalMap");
  if (!container || !window.L) return;

  try {
    const response = await fetch(gpxUrl);
    if (!response.ok) throw new Error("GPX konnte nicht geladen werden.");
    const points = parseGpx(await response.text());
    if (!points.length) throw new Error("Keine Trackpunkte gefunden.");

    if (activeMap) {
      activeMap.remove();
      activeMap = null;
    }

    activeMap = L.map(container, { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap"
    }).addTo(activeMap);

    const line = L.polyline(points, { weight: 5 }).addTo(activeMap);
    activeMap.fitBounds(line.getBounds(), { padding: [24, 24] });
  } catch (error) {
    container.innerHTML = `<div class="empty-state">Karte konnte nicht geladen werden. Prüfe den GPX-Link.</div>`;
  }
}

function renderAdminSelectors() {
  const select = $("#tourMilestoneId");
  const selected = select.value;
  select.innerHTML = `<option value="">Keinem Meilenstein zuordnen</option>` + allMilestones().map((m) => (
    `<option value="${safe(m.id)}">${safe(m.title)}</option>`
  )).join("");
  select.value = selected;
}

function renderAdminLists() {
  renderAdminTourList();
  renderAdminMilestoneList();
  renderAdminChallengeList();
}

function renderAdminTourList() {
  const container = $("#adminTourList");
  if (!container) return;
  if (!tours.length) {
    container.innerHTML = `<div class="empty-state">Noch keine Touren gespeichert.</div>`;
    return;
  }

  container.innerHTML = tours.map((tour) => `
    <div class="admin-row">
      <div>
        <strong>${safe(tour.title)}</strong>
        <small>${safe(tour.type === "run" ? "Laufen" : "Radfahren")} · ${formatKm(tour.distance)} · ${dateLabel(tour.date)} ${tour.published === false ? "· Entwurf" : ""}</small>
      </div>
      <div class="admin-row-actions">
        <button class="small-btn" type="button" data-edit-tour="${safe(tour.id)}">Bearbeiten</button>
        <button class="small-btn" type="button" data-delete-tour="${safe(tour.id)}">Löschen</button>
      </div>
    </div>
  `).join("");

  $$("[data-edit-tour]").forEach((button) => button.addEventListener("click", () => editTour(button.dataset.editTour)));
  $$("[data-delete-tour]").forEach((button) => button.addEventListener("click", () => deleteTour(button.dataset.deleteTour)));
}

function renderAdminMilestoneList() {
  const container = $("#adminMilestoneList");
  if (!container) return;

  if (!milestones.length && firebaseReady) {
    container.innerHTML = `<div class="empty-state">Noch keine eigenen Meilensteine gespeichert. Nutze den Button „Standard-Meilensteine anlegen“.</div>`;
    return;
  }

  const list = allMilestones();
  container.innerHTML = list.map((m) => `
    <div class="admin-row">
      <div>
        <strong>${safe(m.icon || "•")} ${safe(m.title)}</strong>
        <small>${safe((m.sportType || "bike") === "run" ? "Laufen" : "Radfahren")} · ${m.completed ? "Erledigt" : "Geplant"} · Position ${numeric(m.order)} · ${formatKm(numeric(m.actualDistance || m.targetDistance))}</small>
      </div>
      <div class="admin-row-actions">
        <button class="small-btn" type="button" data-edit-milestone="${safe(m.id)}">Bearbeiten</button>
        ${!String(m.id).startsWith("demo-") ? `<button class="small-btn" type="button" data-delete-milestone="${safe(m.id)}">Löschen</button>` : ""}
      </div>
    </div>
  `).join("");

  $$("[data-edit-milestone]").forEach((button) => button.addEventListener("click", () => editMilestone(button.dataset.editMilestone)));
  $$("[data-delete-milestone]").forEach((button) => button.addEventListener("click", () => deleteMilestone(button.dataset.deleteMilestone)));
}

function renderAdminChallengeList() {
  const container = $("#adminChallengeList");
  if (!container) return;

  const list = challenges.length ? challenges : demoChallenges;
  container.innerHTML = list.map((c) => {
    const value = challengeValue(c);
    const percent = numeric(c.target) ? Math.min(100, Math.round(value / numeric(c.target) * 100)) : 0;
    return `
      <div class="admin-row">
        <div>
          <strong>${safe(c.icon || "🏆")} ${safe(c.title)}</strong>
          <small>${safe(c.mode || "manual")} · ${percent}% · Ziel ${formatNumber(c.target, 1)}</small>
        </div>
        <div class="admin-row-actions">
          <button class="small-btn" type="button" data-edit-challenge="${safe(c.id)}">Bearbeiten</button>
          ${!String(c.id).startsWith("demo-") ? `<button class="small-btn" type="button" data-delete-challenge="${safe(c.id)}">Löschen</button>` : ""}
        </div>
      </div>
    `;
  }).join("");

  $$("[data-edit-challenge]").forEach((button) => button.addEventListener("click", () => editChallenge(button.dataset.editChallenge)));
  $$("[data-delete-challenge]").forEach((button) => button.addEventListener("click", () => deleteChallenge(button.dataset.deleteChallenge)));
}

/* Admin Form Helpers */
function resetTourForm() {
  $("#tourForm").reset();
  $("#tourId").value = "";
  $("#tourDate").value = new Date().toISOString().slice(0, 10);
  $("#tourPublished").checked = true;
  $("#tourStatus").textContent = "";
}

function editTour(id) {
  const tour = tours.find((item) => item.id === id);
  if (!tour) return;

  $("#tourId").value = tour.id;
  $("#tourTitle").value = tour.title || "";
  $("#tourType").value = tour.type || "bike";
  $("#tourDate").value = tour.date || "";
  $("#tourRoute").value = tour.route || "";
  $("#tourDistance").value = tour.distance || "";
  $("#tourDuration").value = tour.duration || "";
  $("#tourSpeed").value = tour.speed || "";
  $("#tourElevation").value = tour.elevation || "";
  $("#tourHeartRate").value = tour.heartRate || "";
  $("#tourMilestoneId").value = tour.milestoneId || "";
  $("#tourCoverUrl").value = tour.coverUrl || "";
  $("#tourGalleryUrls").value = Array.isArray(tour.galleryUrls) ? tour.galleryUrls.join("\n") : "";
  $("#tourActivityUrl").value = tour.activityUrl || "";
  $("#tourVideoUrl").value = tour.videoUrl || "";
  $("#tourGpxUrl").value = tour.gpxUrl || "";
  $("#tourStory").value = tour.story || "";
  $("#tourLearnings").value = tour.learnings || "";
  $("#tourPublished").checked = tour.published !== false;

  openAdminTab("tours");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteTour(id) {
  if (!firebaseReady) return alert("Firebase ist noch nicht konfiguriert.");
  if (!confirm("Tour wirklich löschen?")) return;
  await deleteDoc(doc(db, "tours", id));
}

function resetMilestoneForm() {
  $("#milestoneForm").reset();
  $("#milestoneId").value = "";
  $("#milestoneSportType").value = "bike";
  $("#milestoneCountInStats").checked = true;
  $("#milestoneCountAsAdventure").checked = true;
  $("#milestoneStatus").textContent = "";
}

function editMilestone(id) {
  const milestone = allMilestones().find((item) => item.id === id);
  if (!milestone) return;

  $("#milestoneId").value = String(milestone.id).startsWith("demo-") ? "" : milestone.id;
  $("#milestoneTitle").value = milestone.title || "";
  $("#milestoneIcon").value = milestone.icon || "";
  $("#milestoneSportType").value = milestone.sportType || "bike";
  $("#milestoneImageUrl").value = milestone.imageUrl || "";
  $("#milestoneOrder").value = milestone.order || "";
  $("#milestoneCompleted").value = String(Boolean(milestone.completed));
  $("#milestoneTargetDistance").value = milestone.targetDistance || "";
  $("#milestoneActualDistance").value = milestone.actualDistance || "";
  $("#milestoneCompletedDate").value = milestone.completedDate || "";
  $("#milestoneDuration").value = milestone.duration || "";
  $("#milestoneSpeed").value = milestone.speed || "";
  $("#milestoneElevation").value = milestone.elevation || "";
  $("#milestoneRoute").value = milestone.route || "";
  $("#milestoneSubtitle").value = milestone.subtitle || "";
  $("#milestoneStory").value = milestone.story || "";
  $("#milestoneCoverUrl").value = milestone.coverUrl || "";
  $("#milestoneGpxUrl").value = milestone.gpxUrl || "";
  $("#milestoneActivityUrl").value = milestone.activityUrl || "";
  $("#milestoneCountInStats").checked = milestone.countInStats !== false;
  $("#milestoneCountAsAdventure").checked = milestone.countAsAdventure !== false;

  openAdminTab("milestones");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteMilestone(id) {
  if (!firebaseReady) return alert("Firebase ist noch nicht konfiguriert.");
  if (!confirm("Meilenstein wirklich löschen?")) return;
  await deleteDoc(doc(db, "milestones", id));
}

function resetChallengeForm() {
  $("#challengeForm").reset();
  $("#challengeId").value = "";
  $("#challengePublished").checked = true;
  $("#challengeMode").value = "manual";
  $("#challengeStatus").textContent = "";
}

function editChallenge(id) {
  const challenge = (challenges.length ? challenges : demoChallenges).find((item) => item.id === id);
  if (!challenge) return;

  $("#challengeId").value = String(challenge.id).startsWith("demo-") ? "" : challenge.id;
  $("#challengeTitle").value = challenge.title || "";
  $("#challengeIcon").value = challenge.icon || "";
  $("#challengeOrder").value = challenge.order || "";
  $("#challengeMode").value = challenge.mode || "manual";
  $("#challengeTarget").value = challenge.target || "";
  $("#challengeCurrent").value = challenge.current || "";
  $("#challengeDescription").value = challenge.description || "";
  $("#challengePublished").checked = challenge.published !== false;

  openAdminTab("challenges");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteChallenge(id) {
  if (!firebaseReady) return alert("Firebase ist noch nicht konfiguriert.");
  if (!confirm("Challenge wirklich löschen?")) return;
  await deleteDoc(doc(db, "challenges", id));
}

function openAdminTab(tab) {
  $$("#adminTabs button").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  $$(".admin-tab-content").forEach((content) => content.classList.add("hidden"));
  $(`#${tab}Tab`).classList.remove("hidden");
}

/* Event Bindings */
function bindEvents() {
  $("#themeToggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("yot-theme", next);
  });

  $("#menuButton").addEventListener("click", () => $("#mobileMenu").classList.remove("hidden"));
  $$("#mobileMenu a").forEach((link) => link.addEventListener("click", () => $("#mobileMenu").classList.add("hidden")));

  $("[data-close='mobileMenu']").addEventListener("click", () => hideModal("mobileMenu"));

  $$(".modal-backdrop").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) hideModal(modal.id);
    });
  });

  $$("[data-close]").forEach((button) => {
    button.addEventListener("click", () => hideModal(button.dataset.close));
  });

  $$(".stat-card").forEach((card) => {
    card.addEventListener("click", () => openInsight(card.dataset.insight));
  });

  $("#roadmapInsightButton").addEventListener("click", () => openInsight("adventures"));

  $("#tourFilter").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    activeTourFilter = button.dataset.filter;
    $$("#tourFilter button").forEach((b) => b.classList.toggle("active", b === button));
    renderTours();
  });

  $("#milestoneFilter").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    activeMilestoneFilter = button.dataset.filter;
    $$("#milestoneFilter button").forEach((b) => b.classList.toggle("active", b === button));
    renderRoadmap();
  });

  const openLogin = () => {
    if (currentUser?.email === ADMIN_EMAIL) {
      $("#adminPanel").classList.remove("hidden");
    } else {
      showModal("loginModal");
    }
  };

  $("#loginButton").addEventListener("click", openLogin);
  $("#mobileLoginButton").addEventListener("click", openLogin);

  $("#closeAdminButton").addEventListener("click", () => $("#adminPanel").classList.add("hidden"));
  $("#logoutButton").addEventListener("click", async () => {
    if (auth) await signOut(auth);
    $("#adminPanel").classList.add("hidden");
  });

  $("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    $("#loginError").textContent = "";
    if (!firebaseReady) {
      $("#loginError").textContent = "Firebase ist noch nicht konfiguriert.";
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, $("#loginEmail").value, $("#loginPassword").value);
      hideModal("loginModal");
      $("#loginPassword").value = "";
    } catch (error) {
      $("#loginError").textContent = "Login fehlgeschlagen. E-Mail oder Passwort prüfen.";
    }
  });

  $("#adminTabs").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    openAdminTab(button.dataset.tab);
  });

  $("#siteForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!firebaseReady) return alert("Firebase ist noch nicht konfiguriert.");

    const payload = {
      heroTitle: $("#siteHeroTitle").value || defaultSite.heroTitle,
      heroSubtitle: $("#siteHeroSubtitle").value || defaultSite.heroSubtitle,
      heroImage: normalizeImageUrl($("#siteHeroImage").value || defaultSite.heroImage),
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, "site", "settings"), payload, { merge: true });
    $("#siteStatus").textContent = "Startseite gespeichert.";
  });

  $("#tourForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!firebaseReady) return alert("Firebase ist noch nicht konfiguriert.");

    const payload = {
      title: $("#tourTitle").value,
      type: $("#tourType").value,
      date: $("#tourDate").value,
      route: $("#tourRoute").value,
      distance: numeric($("#tourDistance").value),
      duration: $("#tourDuration").value,
      speed: $("#tourSpeed").value,
      elevation: numeric($("#tourElevation").value),
      heartRate: numeric($("#tourHeartRate").value),
      milestoneId: $("#tourMilestoneId").value,
      coverUrl: $("#tourCoverUrl").value,
      galleryUrls: $("#tourGalleryUrls").value.split("\n").map((x) => x.trim()).filter(Boolean),
      activityUrl: $("#tourActivityUrl").value,
      videoUrl: $("#tourVideoUrl").value,
      gpxUrl: $("#tourGpxUrl").value,
      story: $("#tourStory").value,
      learnings: $("#tourLearnings").value,
      published: $("#tourPublished").checked,
      updatedAt: serverTimestamp()
    };

    const id = $("#tourId").value;
    if (id) {
      await updateDoc(doc(db, "tours", id), payload);
    } else {
      await addDoc(collection(db, "tours"), { ...payload, createdAt: serverTimestamp() });
    }

    $("#tourStatus").textContent = "Tour gespeichert.";
    resetTourForm();
  });

  $("#resetTourButton").addEventListener("click", resetTourForm);

  $("#milestoneForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!firebaseReady) return alert("Firebase ist noch nicht konfiguriert.");

    const payload = {
      title: $("#milestoneTitle").value,
      icon: $("#milestoneIcon").value,
      sportType: $("#milestoneSportType").value,
      imageUrl: $("#milestoneImageUrl").value,
      order: numeric($("#milestoneOrder").value),
      completed: $("#milestoneCompleted").value === "true",
      targetDistance: numeric($("#milestoneTargetDistance").value),
      actualDistance: numeric($("#milestoneActualDistance").value),
      completedDate: $("#milestoneCompletedDate").value,
      duration: $("#milestoneDuration").value,
      speed: $("#milestoneSpeed").value,
      elevation: numeric($("#milestoneElevation").value),
      route: $("#milestoneRoute").value,
      subtitle: $("#milestoneSubtitle").value,
      story: $("#milestoneStory").value,
      coverUrl: $("#milestoneCoverUrl").value,
      gpxUrl: $("#milestoneGpxUrl").value,
      activityUrl: $("#milestoneActivityUrl").value,
      countInStats: $("#milestoneCountInStats").checked,
      countAsAdventure: $("#milestoneCountAsAdventure").checked,
      updatedAt: serverTimestamp()
    };

    const id = $("#milestoneId").value;
    if (id) {
      await updateDoc(doc(db, "milestones", id), payload);
    } else {
      await addDoc(collection(db, "milestones"), { ...payload, createdAt: serverTimestamp() });
    }

    $("#milestoneStatus").textContent = "Meilenstein gespeichert.";
    resetMilestoneForm();
  });

  $("#resetMilestoneButton").addEventListener("click", resetMilestoneForm);

  $("#seedMilestonesButton").addEventListener("click", async () => {
    if (!firebaseReady) return alert("Firebase ist noch nicht konfiguriert.");
    if (!confirm("Standard-Meilensteine in Firebase anlegen? Bestehende Meilensteine bleiben erhalten.")) return;

    for (const item of defaultMilestones) {
      const { id, ...payload } = item;
      await addDoc(collection(db, "milestones"), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  });

  $("#challengeForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!firebaseReady) return alert("Firebase ist noch nicht konfiguriert.");

    const payload = {
      title: $("#challengeTitle").value,
      icon: $("#challengeIcon").value,
      order: numeric($("#challengeOrder").value),
      mode: $("#challengeMode").value,
      target: numeric($("#challengeTarget").value),
      current: numeric($("#challengeCurrent").value),
      description: $("#challengeDescription").value,
      published: $("#challengePublished").checked,
      updatedAt: serverTimestamp()
    };

    const id = $("#challengeId").value;
    if (id) {
      await updateDoc(doc(db, "challenges", id), payload);
    } else {
      await addDoc(collection(db, "challenges"), { ...payload, createdAt: serverTimestamp() });
    }

    $("#challengeStatus").textContent = "Challenge gespeichert.";
    resetChallengeForm();
  });

  $("#resetChallengeButton").addEventListener("click", resetChallengeForm);
}

function setupFirebaseListeners() {
  if (!firebaseReady) {
    renderAll();
    return;
  }

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const isAdmin = user?.email === ADMIN_EMAIL;
    $("#loginButton").textContent = isAdmin ? "Admin" : "Login";
    $("#mobileLoginButton span").textContent = isAdmin ? "Admin" : "Profil";
  });

  onSnapshot(query(collection(db, "tours"), orderBy("date", "desc")), (snapshot) => {
    tours = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    renderAll();
  });

  onSnapshot(query(collection(db, "milestones"), orderBy("order", "asc")), (snapshot) => {
    milestones = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    renderAll();
  });

  onSnapshot(query(collection(db, "challenges"), orderBy("order", "asc")), (snapshot) => {
    challenges = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    renderAll();
  });

  onSnapshot(doc(db, "site", "settings"), (snapshot) => {
    siteConfig = snapshot.exists() ? { ...defaultSite, ...snapshot.data() } : { ...defaultSite };
    renderAll();
  }, () => {
    siteConfig = { ...defaultSite };
    renderAll();
  });
}

function init() {
  document.documentElement.dataset.theme = localStorage.getItem("yot-theme") || "light";
  bindEvents();
  resetTourForm();
  resetMilestoneForm();
  resetChallengeForm();
  setupFirebaseListeners();
}

init();
