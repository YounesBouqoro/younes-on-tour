import { firebaseConfig, ADMIN_EMAIL } from "./firebase-config.js";
import { formatNumber, formatKm, safe, nl2br, numeric, dateLabel } from "./modules/utils.js";
import { parseStravaEmbed, stravaEmbedCode, stravaEmbedMarkup, refreshStravaEmbeds, youtubeVideoId, youtubeEmbedMarkup } from "./modules/embeds.js";
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
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

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
    activityUrl: "",
    latitude: 51.3704,
    longitude: 6.1724,
    preparationPercent: 100
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
    story: "Geplantes Ziel für den nächsten längeren Radtest.",
    latitude: 51.6626,
    longitude: 6.4537,
    preparationPercent: 0
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
    story: "Mit dem Rad hin, mit dem Zug zurück.",
    latitude: 52.3676,
    longitude: 4.9041,
    preparationPercent: 0
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
    story: "Das große Mehrtagesziel.",
    latitude: 48.8566,
    longitude: 2.3522,
    preparationPercent: 0
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
    story: "Langfristiges Ziel mit richtigem Abenteuer-Charakter.",
    latitude: 45.6049,
    longitude: 10.6357,
    preparationPercent: 0
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
let storage = null;
let currentUser = null;
let tours = [];
let milestones = [];
let challenges = [];
let galleryItems = [];
let siteConfig = { ...defaultSite };
let activeTourFilter = "all";
let activeMilestoneFilter = "all";
let activeMap = null;
let overviewMap = null;
let overviewLayer = null;
let overviewRenderVersion = 0;
let lastFocusedElement = null;
const loadState = { tours: false, milestones: false, challenges: false, gallery: false };

const knownDestinations = {
  venlo: [51.3704, 6.1724], xanten: [51.6626, 6.4537], amsterdam: [52.3676, 4.9041],
  paris: [48.8566, 2.3522], gardasee: [45.6049, 10.6357]
};

const isConfigured =
  firebaseConfig &&
  firebaseConfig.apiKey &&
  !String(firebaseConfig.apiKey).startsWith("DEIN_") &&
  ADMIN_EMAIL &&
  !String(ADMIN_EMAIL).startsWith("DEINE_");

if (isConfigured) {
  const firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  storage = getStorage(firebaseApp);
  firebaseReady = true;
} else {
  console.warn("Firebase ist noch nicht konfiguriert. Die Seite läuft im Demo-Modus.");
  milestones = [...defaultMilestones];
  challenges = [...demoChallenges];
}

function currentViewportTarget() {
  return window.matchMedia("(max-width: 760px)").matches ? "mobile" : "desktop";
}

function shouldShowOnCurrentDevice(item) {
  const target = item.displayTarget || "both";
  return target === "both" || target === currentViewportTarget();
}

function fileSafeName(name) {
  return String(name || "upload")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(-90) || "upload";
}

function isVideoType(value) {
  return String(value || "").startsWith("video");
}

function mediaTypeFromFile(file) {
  return isVideoType(file?.type) ? "video" : "image";
}

const pendingUploads = {
  tourCover: null,
  tourMedia: [],
  milestoneImage: null,
  milestoneCover: null,
  milestoneMedia: [],
  gallery: null
};

function mediaTypeFromUrl(url) {
  return /\.(mp4|mov|m4v|webm|ogg)(?:[?#]|$)/i.test(String(url || "")) ? "video" : "image";
}

function normalizeMedia(item = {}) {
  return {
    url: String(item.url || "").trim(),
    storagePath: String(item.storagePath || "").trim(),
    mediaType: item.mediaType === "video" ? "video" : "image",
    name: String(item.name || "").trim()
  };
}

function entityMedia(item = {}) {
  const out = [];
  const seen = new Set();
  const add = (entry) => {
    const media = normalizeMedia(entry);
    if (!media.url || seen.has(media.url)) return;
    seen.add(media.url);
    out.push(media);
  };
  if (Array.isArray(item.media)) item.media.forEach(add);
  if (Array.isArray(item.galleryUrls)) item.galleryUrls.forEach((url) => add({ url, mediaType: mediaTypeFromUrl(url) }));
  return out;
}

function validateUpload(file) {
  if (!file) throw new Error("Keine Datei ausgewählt.");
  if (!/^image\//.test(file.type) && !/^video\//.test(file.type)) throw new Error("Erlaubt sind nur Bilder und Videos.");
  if (file.size > 250 * 1024 * 1024) throw new Error(`${file.name} ist größer als 250 MB.`);
}

function renderFilePreview(file, selector) {
  const container = $(selector);
  if (!container || !file) return;
  const url = URL.createObjectURL(file);
  container.classList.remove("empty-media-preview");
  container.innerHTML = file.type.startsWith("video/")
    ? `<video src="${url}" controls playsinline></video>`
    : `<img src="${url}" alt="">`;
}

function renderExistingPreview(url, mediaType, selector, emptyText) {
  const container = $(selector);
  if (!container) return;
  if (!url) {
    container.classList.add("empty-media-preview");
    container.innerHTML = emptyText;
    return;
  }
  container.classList.remove("empty-media-preview");
  container.innerHTML = mediaType === "video"
    ? `<video src="${safe(url)}" controls playsinline></video>`
    : `<img src="${safe(url)}" alt="">`;
}

function renderFilesPreview(files, selector) {
  const container = $(selector);
  if (!container) return;
  if (!files?.length) {
    container.innerHTML = `<div class="empty-media-preview">Noch keine neuen Medien ausgewählt.</div>`;
    return;
  }
  container.innerHTML = [...files].map((file) => {
    const url = URL.createObjectURL(file);
    return file.type.startsWith("video/")
      ? `<video src="${url}" controls playsinline></video>`
      : `<img src="${url}" alt="">`;
  }).join("");
}

function renderStoredMediaPreview(media, selector) {
  const container = $(selector);
  if (!container) return;
  if (!media?.length) {
    container.innerHTML = `<div class="empty-media-preview">Noch keine Medien gespeichert.</div>`;
    return;
  }
  container.innerHTML = media.map((item) => item.mediaType === "video"
    ? `<video src="${safe(item.url)}" controls playsinline preload="metadata"></video>`
    : `<img src="${safe(item.url)}" alt="">`).join("");
}

function uploadMediaFile(file, folder, statusElement, label = "Datei") {
  if (!storage) return Promise.reject(new Error("Firebase Storage ist nicht verfügbar."));
  validateUpload(file);
  const path = `gallery/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${fileSafeName(file.name)}`;
  const task = uploadBytesResumable(storageRef(storage, path), file, {
    contentType: file.type,
    cacheControl: "public,max-age=31536000"
  });
  return new Promise((resolve, reject) => {
    task.on("state_changed", (snapshot) => {
      const pct = snapshot.totalBytes ? Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100) : 0;
      if (statusElement) statusElement.textContent = `${label} wird hochgeladen … ${pct}%`;
    }, (error) => {
      console.error(error);
      reject(new Error(error?.code === "storage/unauthorized"
        ? "Upload nicht erlaubt. Bitte Storage-Regeln und Admin-Login prüfen."
        : "Upload fehlgeschlagen. Prüfe, ob Firebase Storage im Blaze-Tarif aktiviert ist."));
    }, async () => {
      const url = await getDownloadURL(task.snapshot.ref);
      resolve({ url, storagePath: path, mediaType: mediaTypeFromFile(file), name: file.name });
    });
  });
}

async function uploadMediaList(files, folder, statusElement) {
  const uploaded = [];
  for (let i = 0; i < files.length; i += 1) {
    uploaded.push(await uploadMediaFile(files[i], folder, statusElement, `Medium ${i + 1}/${files.length}`));
  }
  return uploaded;
}

function detailMediaMarkup(media, title) {
  if (!media.length) return "";
  return `<div class="detail-gallery">${media.map((item, index) => (
    item.mediaType === "video"
      ? `<video src="${safe(item.url)}" controls playsinline preload="metadata" aria-label="${safe(title)} – Video ${index + 1}"></video>`
      : `<img src="${safe(item.url)}" alt="${safe(title)} – Bild ${index + 1}" loading="lazy">`
  )).join("")}</div>`;
}

function targetLabel(value) {
  if (value === "desktop") return "Desktop";
  if (value === "mobile") return "Mobil";
  return "Desktop & Mobil";
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

function visibleGalleryItems() {
  return galleryItems
    .filter((item) => item.published !== false)
    .filter(shouldShowOnCurrentDevice)
    .sort((a, b) => numeric(a.order) - numeric(b.order));
}

function calculateStats() {
  const list = publishedTours();
  const bikeTours = list.filter((tour) => tour.type === "bike");
  const runTours = list.filter((tour) => tour.type === "run");

  const tourBikeKm = bikeTours.reduce((sum, tour) => sum + numeric(tour.distance), 0);
  const tourRunKm = runTours.reduce((sum, tour) => sum + numeric(tour.distance), 0);

  // Wichtig: Wenn eine Tour mit einem Meilenstein verknüpft ist, werden die Kilometer nur über die Tour gezählt.
  // Der Meilenstein bleibt für Roadmap/Fortschritt sichtbar, wird aber nicht zusätzlich in Gesamt-KM und Abenteuer gezählt.
  const linkedMilestoneIds = new Set(
    list
      .map((tour) => String(tour.milestoneId || "").trim())
      .filter(Boolean)
  );

  const standaloneCompletedMilestones = allMilestones().filter((m) => (
    m.completed && !linkedMilestoneIds.has(String(m.id))
  ));

  const countableMilestones = standaloneCompletedMilestones.filter((m) => m.countInStats !== false);
  const bikeMilestones = countableMilestones.filter((m) => (m.sportType || "bike") === "bike");
  const runMilestones = countableMilestones.filter((m) => (m.sportType || "bike") === "run");

  const milestoneBikeKm = bikeMilestones.reduce((sum, m) => sum + numeric(m.actualDistance || m.distance || m.targetDistance), 0);
  const milestoneRunKm = runMilestones.reduce((sum, m) => sum + numeric(m.actualDistance || m.distance || m.targetDistance), 0);

  const bikeKm = tourBikeKm + milestoneBikeKm;
  const runKm = tourRunKm + milestoneRunKm;
  const totalKm = bikeKm + runKm;

  const adventureMilestones = standaloneCompletedMilestones.filter((m) => m.countAsAdventure !== false);
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
    linkedMilestoneIds,
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
  renderNextAdventure();
  renderRoadmap();
  renderTours();
  renderChallenges();
  renderGallery();
  renderAdminSelectors();
  renderAdminLists();
  renderOverviewMap();
  openTourFromHash();
}

function renderSiteConfig() {
  const title = siteConfig.heroTitle || defaultSite.heroTitle;
  const subtitle = siteConfig.heroSubtitle || defaultSite.heroSubtitle;
  const image = siteConfig.heroImage || defaultSite.heroImage;

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
    return `<img src="${safe(milestone.imageUrl)}" alt="${safe(milestone.title || "Meilenstein")}" loading="lazy">`;
  }
  return `<span>${safe(milestone.icon || "•")}</span>`;
}

function renderNextAdventure() {
  const container = $("#nextAdventureCard");
  if (!container) return;
  const next = allMilestones().find((milestone) => !milestone.completed);
  if (!next) {
    container.classList.remove("loading-card");
    container.innerHTML = `<div><p class="eyebrow accent">ROADMAP GESCHAFFT</p><h3>Alle Ziele erreicht!</h3><p>Zeit, das nächste große Abenteuer anzulegen.</p></div>`;
    return;
  }
  const preparation = Math.max(0, Math.min(100, numeric(next.preparationPercent)));
  const planned = next.plannedDate ? new Date(`${next.plannedDate}T12:00:00`) : null;
  const days = planned && !Number.isNaN(planned.getTime()) ? Math.ceil((planned - new Date()) / 86400000) : null;
  const countdown = days === null ? "Termin offen" : days > 0 ? `Noch ${days} Tage` : days === 0 ? "Heute geht’s los" : "Termin prüfen";
  const image = next.coverUrl || next.imageUrl || PLACEHOLDER_IMAGE;
  container.classList.remove("loading-card");
  container.innerHTML = `
    <div class="next-adventure-image" style="background-image:url('${safe(image)}')"></div>
    <div class="next-adventure-copy">
      <div class="next-adventure-meta"><span>${safe(next.icon || "🗺️")} ${safe(countdown)}</span><span>${safe(dateLabel(next.plannedDate) || "Datum folgt")}</span></div>
      <h3>${safe(next.title)}</h3>
      <p>${safe(next.route || next.subtitle || "Das nächste Ziel auf der Roadmap.")}</p>
      <div class="preparation-row"><span>Vorbereitung</span><strong>${preparation}%</strong></div>
      <div class="preparation-track"><span style="width:${preparation}%"></span></div>
      <div class="next-adventure-actions">
        <button class="primary-btn" type="button" data-open-next="${safe(next.id)}">Details ansehen</button>
        ${numeric(next.targetDistance) ? `<strong>${formatKm(next.targetDistance)}</strong>` : ""}
      </div>
    </div>`;
  container.querySelector("[data-open-next]")?.addEventListener("click", () => openMilestone(next.id));
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
  if (firebaseReady && !loadState.tours) {
    $("#tourGrid").innerHTML = Array.from({ length: 4 }, () => `<div class="tour-card skeleton-card"><span class="skeleton skeleton-image"></span><span class="skeleton skeleton-title"></span><span class="skeleton skeleton-line"></span></div>`).join("");
    return;
  }
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
      <button class="tour-card" type="button" data-tour-id="${safe(tour.id)}" aria-label="Tour ${safe(tour.title)} öffnen">
        <div class="tour-image" role="img" aria-label="${safe(tour.title)}" style="background-image:url('${safe(image)}')">
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
  const manualItems = visibleGalleryItems();
  const linkedMedia = [];

  publishedTours().forEach((tour) => {
    if (tour.coverUrl) linkedMedia.push({ src: tour.coverUrl, title: tour.title, tourId: tour.id, mediaType: "image" });
    entityMedia(tour).forEach((item) => linkedMedia.push({ src: item.url, title: tour.title, tourId: tour.id, mediaType: item.mediaType }));
  });

  allMilestones().forEach((milestone) => {
    if (milestone.coverUrl) linkedMedia.push({ src: milestone.coverUrl, title: milestone.title, milestoneId: milestone.id, mediaType: "image" });
    entityMedia(milestone).forEach((item) => linkedMedia.push({ src: item.url, title: milestone.title, milestoneId: milestone.id, mediaType: item.mediaType }));
  });

  const combined = [
    ...manualItems.map((item) => ({
      src: item.url,
      title: item.title,
      id: item.id,
      mediaType: item.mediaType || "image",
      tourId: item.tourId || "",
      milestoneId: item.milestoneId || "",
      isManualGalleryItem: true
    })),
    ...linkedMedia
  ].filter((item) => item.src);

  const grid = $("#galleryGrid");
  if (!combined.length) {
    grid.innerHTML = `<div class="empty-state">Noch keine Bilder oder Videos vorhanden.</div>`;
    return;
  }

  grid.innerHTML = combined.slice(0, 16).map((item) => {
    const attr = item.isManualGalleryItem
      ? `data-gallery-id="${safe(item.id)}"`
      : item.tourId
        ? `data-tour-id="${safe(item.tourId)}"`
        : `data-milestone-id="${safe(item.milestoneId)}"`;
    if (item.mediaType === "video") {
      return `<button class="gallery-tile video-tile" type="button" ${attr}><video src="${safe(item.src)}" muted playsinline preload="metadata"></video><span>${safe(item.title || "Video")}</span></button>`;
    }
    return `<button class="gallery-tile" type="button" ${attr} style="background-image:url('${safe(item.src)}')"><span>${safe(item.title || "Bild")}</span></button>`;
  }).join("");

  $$("#galleryGrid [data-tour-id]").forEach((button) => button.addEventListener("click", () => openTour(button.dataset.tourId)));
  $$("#galleryGrid [data-milestone-id]").forEach((button) => button.addEventListener("click", () => openMilestone(button.dataset.milestoneId)));
  $$("#galleryGrid [data-gallery-id]").forEach((button) => button.addEventListener("click", () => openGalleryItem(button.dataset.galleryId)));
}

function showModal(id) {
  lastFocusedElement = document.activeElement;
  const modal = $(`#${id}`);
  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  window.setTimeout(() => modal.querySelector(".modal-card,.login-card")?.focus(), 0);
}

function hideModal(id) {
  $(`#${id}`).classList.add("hidden");
  if (!document.querySelector(".modal-backdrop:not(.hidden)")) document.body.classList.remove("modal-open");
  if (activeMap) {
    activeMap.remove();
    activeMap = null;
  }
  if (id === "tourModal" && location.hash.startsWith("#tour=")) history.replaceState(null, "", `${location.pathname}${location.search}#tours`);
  lastFocusedElement?.focus?.();
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
  const isLinkedToPublishedTour = relatedTours.length > 0;
  const image = milestone.coverUrl || relatedTours[0]?.coverUrl || PLACEHOLDER_IMAGE;
  const media = entityMedia(milestone);
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
        <div class="insight-metric"><span>Zählt in Gesamt-KM</span><strong>${isLinkedToPublishedTour ? "Über Tour gezählt" : (milestone.countInStats !== false ? "Ja" : "Nein")}</strong></div>
        <div class="insight-metric"><span>Zählt als Abenteuer</span><strong>${isLinkedToPublishedTour ? "Über Tour gezählt" : (milestone.countAsAdventure !== false ? "Ja" : "Nein")}</strong></div>
      </div>
      <p class="detail-text">${safe(milestone.story || milestone.subtitle || "Noch keine Streckeninfos gepflegt.")}</p>
      ${stravaEmbedMarkup(milestone.stravaEmbed)}
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
      ${detailMediaMarkup(media, milestone.title)}
    </div>
  `;

  showModal("insightModal");
  refreshStravaEmbeds();
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
      ${stravaEmbedMarkup(challenge.stravaEmbed)}
    </div>
  `;
  showModal("insightModal");
  refreshStravaEmbeds();
}


function openGalleryItem(id) {
  const item = galleryItems.find((entry) => entry.id === id);
  if (!item) return;

  const media = item.mediaType === "video"
    ? `<video class="gallery-detail-media" src="${safe(item.url)}" controls playsinline></video>`
    : `<img class="gallery-detail-media" src="${safe(item.url)}" alt="">`;

  $("#insightContent").innerHTML = `
    ${media}
    <div class="insight-body">
      <p class="eyebrow accent">GALERIE · ${safe(targetLabel(item.displayTarget))}</p>
      <h2>${safe(item.title || "Galerie")}</h2>
      <p class="detail-text">${safe(item.description || "")}</p>
      ${item.tourId ? `<div class="detail-actions"><button class="primary-btn" type="button" data-open-gallery-tour="${safe(item.tourId)}">Verknüpfte Tour öffnen</button></div>` : ""}
    </div>
  `;

  showModal("insightModal");

  const tourButton = $("#insightContent [data-open-gallery-tour]");
  if (tourButton) {
    tourButton.addEventListener("click", () => {
      hideModal("insightModal");
      openTour(tourButton.dataset.openGalleryTour);
    });
  }
}


function tourShareUrl(id) {
  return `${location.origin}${location.pathname}${location.search}#tour=${encodeURIComponent(id)}`;
}

async function shareTour(tour) {
  const url = tourShareUrl(tour.id);
  if (navigator.share) {
    try { await navigator.share({ title: tour.title, text: tour.route || "Younes on Tour", url }); return; } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }
  await navigator.clipboard.writeText(url);
  const button = $("[data-share-tour]");
  if (button) { button.textContent = "Link kopiert ✓"; window.setTimeout(() => { button.textContent = "Tour teilen"; }, 1800); }
}

function openTour(id, updateHash = true) {
  const tour = tours.find((item) => item.id === id);
  if (!tour) return;

  const image = tour.coverUrl || PLACEHOLDER_IMAGE;
  const media = entityMedia(tour);

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
      ${stravaEmbedMarkup(tour.stravaEmbed)}
      ${youtubeEmbedMarkup(tour.videoUrl, `${tour.title} – Tourvideo`)}
      <div class="detail-actions">
        <button class="secondary-btn" type="button" data-share-tour>Tour teilen</button>
        ${tour.activityUrl ? `<a class="primary-link" href="${safe(tour.activityUrl)}" target="_blank" rel="noreferrer">Aktivität öffnen</a>` : ""}
        ${tour.videoUrl && !youtubeVideoId(tour.videoUrl) ? `<a href="${safe(tour.videoUrl)}" target="_blank" rel="noreferrer">Video ansehen</a>` : ""}
        ${tour.gpxUrl ? `<a href="${safe(tour.gpxUrl)}" target="_blank" rel="noreferrer">GPX öffnen</a>` : ""}
      </div>
      ${tour.gpxUrl ? `<div id="modalMap" class="map-box"></div>` : ""}
      ${detailMediaMarkup(media, tour.title)}
    </div>
  `;

  showModal("tourModal");
  if (updateHash && location.hash !== `#tour=${encodeURIComponent(id)}`) history.pushState({ tourId: id }, "", `#tour=${encodeURIComponent(id)}`);
  $("[data-share-tour]")?.addEventListener("click", () => shareTour(tour));
  refreshStravaEmbeds();
  if (tour.gpxUrl) setTimeout(() => renderGpxMap(tour.gpxUrl), 100);
}

function openTourFromHash() {
  const match = location.hash.match(/^#tour=(.+)$/);
  if (!match) return;
  const id = decodeURIComponent(match[1]);
  if (tours.some((tour) => tour.id === id) && $("#tourModal")?.classList.contains("hidden")) openTour(id, false);
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

function milestoneCoordinates(milestone) {
  const lat = Number(milestone.latitude);
  const lng = Number(milestone.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return [lat, lng];
  const haystack = `${milestone.title || ""} ${milestone.route || ""}`.toLowerCase();
  const key = Object.keys(knownDestinations).find((name) => haystack.includes(name));
  return key ? knownDestinations[key] : null;
}

function setOverviewMapInteraction(enabled = false) {
  if (!overviewMap) return;
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  const interactive = mobile ? enabled : true;
  const shell = $("#overviewMapShell");
  const button = $("#mapInteractionToggle");

  ["dragging", "touchZoom", "doubleClickZoom", "boxZoom", "keyboard"].forEach((handlerName) => {
    const handler = overviewMap?.[handlerName];
    if (!handler) return;
    interactive ? handler.enable() : handler.disable();
  });

  shell?.classList.toggle("map-interaction-active", mobile && interactive);

  if (button) {
    button.hidden = !mobile;
    button.setAttribute("aria-pressed", mobile && interactive ? "true" : "false");
    button.textContent = mobile && interactive ? "Scrollen freigeben" : "Karte bewegen";
  }
}

function bindOverviewMapInteraction() {
  const button = $("#mapInteractionToggle");
  if (!button || button.dataset.bound === "true") return;

  button.dataset.bound = "true";
  button.addEventListener("click", () => {
    const active = $("#overviewMapShell")?.classList.contains("map-interaction-active");
    setOverviewMapInteraction(!active);
  });

  const media = window.matchMedia("(max-width: 760px)");
  media.addEventListener?.("change", () => setOverviewMapInteraction(false));
}

async function renderOverviewMap() {
  const container = $("#overviewMap");
  const status = $("#overviewMapStatus");
  if (!container || !window.L) return;
  const version = ++overviewRenderVersion;
  if (!overviewMap) {
    const mobileMap = window.matchMedia("(max-width: 760px)").matches;
    overviewMap = L.map(container, {
      scrollWheelZoom: false,
      dragging: !mobileMap,
      touchZoom: !mobileMap,
      doubleClickZoom: !mobileMap,
      boxZoom: !mobileMap,
      keyboard: !mobileMap
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap" }).addTo(overviewMap);
    overviewMap.setView([51.2277, 6.7735], 6);
    bindOverviewMapInteraction();
    setOverviewMapInteraction(false);
  }
  overviewLayer?.remove();
  overviewLayer = L.layerGroup().addTo(overviewMap);
  const bounds = [];
  let routes = 0;

  const routeResults = await Promise.all(publishedTours().filter((tour) => tour.gpxUrl).map(async (tour) => {
    try {
      const response = await fetch(tour.gpxUrl);
      if (!response.ok) return null;
      const points = parseGpx(await response.text());
      return points.length ? { tour, points } : null;
    } catch { return null; }
  }));
  if (version !== overviewRenderVersion) return;
  routeResults.filter(Boolean).forEach(({ tour, points }) => {
    const line = L.polyline(points, { color: "#f2552c", weight: 5, opacity: .9 }).addTo(overviewLayer);
    line.bindPopup(`<strong>${safe(tour.title)}</strong><br>${safe(formatKm(tour.distance))}<br><button class="map-popup-button" data-map-tour="${safe(tour.id)}">Tour öffnen</button>`);
    line.on("popupopen", (event) => event.popup.getElement()?.querySelector("[data-map-tour]")?.addEventListener("click", () => openTour(tour.id)));
    bounds.push(...points.filter((_, index) => index % 20 === 0));
    routes += 1;
  });

  let targets = 0;
  allMilestones().forEach((milestone) => {
    const coordinates = milestoneCoordinates(milestone);
    if (!coordinates) return;
    const icon = L.divIcon({ className: "journey-marker-wrap", html: `<span class="journey-marker ${milestone.completed ? "done" : "planned"}">${safe(milestone.icon || "•")}</span>`, iconSize: [38, 38], iconAnchor: [19, 19] });
    L.marker(coordinates, { icon }).addTo(overviewLayer).bindPopup(`<strong>${safe(milestone.title)}</strong><br>${milestone.completed ? "Erreicht" : "Geplant"}`);
    bounds.push(coordinates);
    targets += 1;
  });
  if (bounds.length) overviewMap.fitBounds(bounds, { padding: [38, 38], maxZoom: 8 });
  window.setTimeout(() => overviewMap?.invalidateSize(), 30);
  status.textContent = routes || targets ? `${routes} GPX-${routes === 1 ? "Strecke" : "Strecken"} und ${targets} Ziele auf der Karte.` : "Sobald GPX-Strecken oder Zielkoordinaten gepflegt sind, erscheinen sie hier.";
}

function renderAdminSelectors() {
  const select = $("#tourMilestoneId");
  const selected = select.value;
  select.innerHTML = `<option value="">Keinem Meilenstein zuordnen</option>` + allMilestones().map((m) => (
    `<option value="${safe(m.id)}">${safe(m.title)}</option>`
  )).join("");
  select.value = selected;

  const galleryTourSelect = $("#galleryTourId");
  if (galleryTourSelect) {
    const gallerySelected = galleryTourSelect.value;
    galleryTourSelect.innerHTML = `<option value="">Keine Tour</option>` + tours.map((tour) => (
      `<option value="${safe(tour.id)}">${safe(tour.title)}</option>`
    )).join("");
    galleryTourSelect.value = gallerySelected;
  }

  const galleryMilestoneSelect = $("#galleryMilestoneId");
  if (galleryMilestoneSelect) {
    const selected = galleryMilestoneSelect.value;
    galleryMilestoneSelect.innerHTML = `<option value="">Kein Meilenstein</option>` + allMilestones()
      .filter((milestone) => !String(milestone.id).startsWith("demo-"))
      .map((milestone) => `<option value="${safe(milestone.id)}">${safe(milestone.title)}</option>`).join("");
    galleryMilestoneSelect.value = selected;
  }
}

function renderAdminLists() {
  renderAdminTourList();
  renderAdminMilestoneList();
  renderAdminChallengeList();
  renderAdminGalleryList();
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
        ${tour.published !== false ? `<button class="small-btn" type="button" data-copy-tour="${safe(tour.id)}">Link kopieren</button>` : ""}
        <button class="small-btn" type="button" data-edit-tour="${safe(tour.id)}">Bearbeiten</button>
        <button class="small-btn" type="button" data-delete-tour="${safe(tour.id)}">Löschen</button>
      </div>
    </div>
  `).join("");

  $$("[data-edit-tour]").forEach((button) => button.addEventListener("click", () => editTour(button.dataset.editTour)));
  $$("[data-delete-tour]").forEach((button) => button.addEventListener("click", () => deleteTour(button.dataset.deleteTour)));
  $$("[data-copy-tour]").forEach((button) => button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(tourShareUrl(button.dataset.copyTour));
    button.textContent = "Kopiert ✓";
  }));
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


function renderAdminGalleryList() {
  const container = $("#adminGalleryList");
  if (!container) return;

  if (!galleryItems.length) {
    container.innerHTML = `<div class="empty-state">Noch keine Galerie-Dateien gespeichert.</div>`;
    return;
  }

  container.innerHTML = galleryItems
    .slice()
    .sort((a, b) => numeric(a.order) - numeric(b.order))
    .map((item) => `
      <div class="admin-row">
        <div>
          <strong>${item.mediaType === "video" ? "🎬" : "🖼️"} ${safe(item.title || "Ohne Titel")}</strong>
          <small>${safe(targetLabel(item.displayTarget))} · ${item.published === false ? "Entwurf" : "Öffentlich"}${item.url ? ` · ${safe(item.url)}` : ""}</small>
        </div>
        <div class="admin-row-actions">
          <button class="small-btn" type="button" data-edit-gallery="${safe(item.id)}">Bearbeiten</button>
          <button class="small-btn" type="button" data-delete-gallery="${safe(item.id)}">Löschen</button>
        </div>
      </div>
    `).join("");

  $$("[data-edit-gallery]").forEach((button) => button.addEventListener("click", () => editGalleryItem(button.dataset.editGallery)));
  $$("[data-delete-gallery]").forEach((button) => button.addEventListener("click", () => deleteGalleryItem(button.dataset.deleteGallery)));
}


/* Admin Form Helpers */
function resetTourForm() {
  $("#tourForm").reset();
  $("#tourId").value = "";
  $("#tourDate").value = new Date().toISOString().slice(0, 10);
  $("#tourPublished").checked = true;
  $("#tourCoverUrl").value = "";
  $("#tourGalleryUrls").value = "";
  renderExistingPreview("", "image", "#tourCoverPreview", "Noch kein Titelbild ausgewählt.");
  renderStoredMediaPreview([], "#tourMediaPreview");
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
  renderExistingPreview(tour.coverUrl || "", "image", "#tourCoverPreview", "Noch kein Titelbild ausgewählt.");
  renderStoredMediaPreview(entityMedia(tour), "#tourMediaPreview");
  $("#tourActivityUrl").value = tour.activityUrl || "";
  $("#tourStravaEmbed").value = stravaEmbedCode(tour.stravaEmbed);
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
  $("#milestoneImageUrl").value = "";
  $("#milestoneCoverUrl").value = "";
  renderExistingPreview("", "image", "#milestoneImagePreview", "Noch kein Roadmap-Bild ausgewählt.");
  renderExistingPreview("", "image", "#milestoneCoverPreview", "Noch kein Titelbild ausgewählt.");
  renderStoredMediaPreview([], "#milestoneMediaPreview");
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
  renderExistingPreview(milestone.imageUrl || "", "image", "#milestoneImagePreview", "Noch kein Roadmap-Bild ausgewählt.");
  $("#milestoneOrder").value = milestone.order || "";
  $("#milestoneCompleted").value = String(Boolean(milestone.completed));
  $("#milestoneTargetDistance").value = milestone.targetDistance || "";
  $("#milestoneActualDistance").value = milestone.actualDistance || "";
  $("#milestoneCompletedDate").value = milestone.completedDate || "";
  $("#milestonePlannedDate").value = milestone.plannedDate || "";
  $("#milestonePreparationPercent").value = milestone.preparationPercent || "";
  $("#milestoneLatitude").value = milestone.latitude ?? "";
  $("#milestoneLongitude").value = milestone.longitude ?? "";
  $("#milestoneDuration").value = milestone.duration || "";
  $("#milestoneSpeed").value = milestone.speed || "";
  $("#milestoneElevation").value = milestone.elevation || "";
  $("#milestoneRoute").value = milestone.route || "";
  $("#milestoneSubtitle").value = milestone.subtitle || "";
  $("#milestoneStory").value = milestone.story || "";
  $("#milestoneCoverUrl").value = milestone.coverUrl || "";
  renderExistingPreview(milestone.coverUrl || "", "image", "#milestoneCoverPreview", "Noch kein Titelbild ausgewählt.");
  renderStoredMediaPreview(entityMedia(milestone), "#milestoneMediaPreview");
  $("#milestoneGpxUrl").value = milestone.gpxUrl || "";
  $("#milestoneActivityUrl").value = milestone.activityUrl || "";
  $("#milestoneStravaEmbed").value = stravaEmbedCode(milestone.stravaEmbed);
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
  $("#challengeStravaEmbed").value = stravaEmbedCode(challenge.stravaEmbed);
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


function resetGalleryForm() {
  $("#galleryForm").reset();
  $("#galleryItemId").value = "";
  $("#galleryPublished").checked = true;
  $("#galleryDisplayTarget").value = "both";
  $("#galleryMediaType").value = "image";
  $("#galleryMediaUrl").value = "";
  renderExistingPreview("", "image", "#galleryUploadPreview", "Noch keine Datei ausgewählt.");
  $("#galleryStatus").textContent = "";
}

function editGalleryItem(id) {
  const item = galleryItems.find((entry) => entry.id === id);
  if (!item) return;
  $("#galleryItemId").value = item.id;
  $("#galleryTitle").value = item.title || "";
  $("#galleryDisplayTarget").value = item.displayTarget || "both";
  $("#galleryMediaType").value = item.mediaType || "image";
  $("#galleryOrder").value = item.order || "";
  $("#galleryTourId").value = item.tourId || "";
  $("#galleryMilestoneId").value = item.milestoneId || "";
  $("#galleryMediaUrl").value = item.url || "";
  $("#galleryDescription").value = item.description || "";
  $("#galleryPublished").checked = item.published !== false;
  renderExistingPreview(item.url || "", item.mediaType || "image", "#galleryUploadPreview", "Noch keine Datei ausgewählt.");
  openAdminTab("gallery");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteGalleryItem(id) {
  if (!firebaseReady) return alert("Firebase ist noch nicht konfiguriert.");
  if (!confirm("Galerie-Eintrag wirklich löschen? Die Datei in GitHub bleibt erhalten.")) return;
  await deleteDoc(doc(db, "galleryItems", id));
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

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const visible = document.querySelector(".modal-backdrop:not(.hidden)");
    if (visible) hideModal(visible.id);
    else if (!$("#mobileMenu").classList.contains("hidden")) hideModal("mobileMenu");
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
      heroImage: $("#siteHeroImage").value || defaultSite.heroImage,
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, "site", "settings"), payload, { merge: true });
    $("#siteStatus").textContent = "Startseite gespeichert.";
  });

  $("#tourForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!firebaseReady) return alert("Firebase ist noch nicht konfiguriert.");

    const stravaEmbedInput = $("#tourStravaEmbed").value.trim();
    const stravaEmbed = parseStravaEmbed(stravaEmbedInput);
    if (stravaEmbedInput && !stravaEmbed) {
      $("#tourStatus").textContent = "Der Strava-Einbettungscode ist ungültig. Bitte den vollständigen Code aus Strava einfügen.";
      return;
    }

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
      stravaEmbed,
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

    const stravaEmbedInput = $("#milestoneStravaEmbed").value.trim();
    const stravaEmbed = parseStravaEmbed(stravaEmbedInput);
    if (stravaEmbedInput && !stravaEmbed) {
      $("#milestoneStatus").textContent = "Der Strava-Einbettungscode ist ungültig. Bitte den vollständigen Code aus Strava einfügen.";
      return;
    }

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
      plannedDate: $("#milestonePlannedDate").value,
      preparationPercent: Math.max(0, Math.min(100, numeric($("#milestonePreparationPercent").value))),
      latitude: $("#milestoneLatitude").value === "" ? null : numeric($("#milestoneLatitude").value),
      longitude: $("#milestoneLongitude").value === "" ? null : numeric($("#milestoneLongitude").value),
      duration: $("#milestoneDuration").value,
      speed: $("#milestoneSpeed").value,
      elevation: numeric($("#milestoneElevation").value),
      route: $("#milestoneRoute").value,
      subtitle: $("#milestoneSubtitle").value,
      story: $("#milestoneStory").value,
      coverUrl: $("#milestoneCoverUrl").value,
      gpxUrl: $("#milestoneGpxUrl").value,
      activityUrl: $("#milestoneActivityUrl").value,
      stravaEmbed,
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

    const stravaEmbedInput = $("#challengeStravaEmbed").value.trim();
    const stravaEmbed = parseStravaEmbed(stravaEmbedInput);
    if (stravaEmbedInput && !stravaEmbed) {
      $("#challengeStatus").textContent = "Der Strava-Einbettungscode ist ungültig. Bitte den vollständigen Code aus Strava einfügen.";
      return;
    }

    const payload = {
      title: $("#challengeTitle").value,
      icon: $("#challengeIcon").value,
      order: numeric($("#challengeOrder").value),
      mode: $("#challengeMode").value,
      target: numeric($("#challengeTarget").value),
      current: numeric($("#challengeCurrent").value),
      description: $("#challengeDescription").value,
      stravaEmbed,
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


  $("#galleryMediaUrl").addEventListener("input", renderGalleryLinkPreview);
  $("#galleryMediaType").addEventListener("change", renderGalleryLinkPreview);

  $("#galleryForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!firebaseReady) return alert("Firebase ist noch nicht konfiguriert.");

    const mediaUrl = String($("#galleryMediaUrl").value || "").trim();

    if (!mediaUrl) {
      $("#galleryStatus").textContent = "Bitte zuerst einen Medien-Link eintragen.";
      return;
    }

    try {
      const payload = {
        title: $("#galleryTitle").value,
        displayTarget: $("#galleryDisplayTarget").value,
        mediaType: $("#galleryMediaType").value,
        order: numeric($("#galleryOrder").value),
        tourId: $("#galleryTourId").value,
        description: $("#galleryDescription").value,
        published: $("#galleryPublished").checked,
        url: mediaUrl,
        updatedAt: serverTimestamp()
      };

      const id = $("#galleryItemId").value;
      if (id) {
        await updateDoc(doc(db, "galleryItems", id), payload);
      } else {
        await addDoc(collection(db, "galleryItems"), { ...payload, createdAt: serverTimestamp() });
      }

      $("#galleryStatus").textContent = "Galerie-Eintrag gespeichert.";
      resetGalleryForm();
    } catch (error) {
      console.error(error);
      $("#galleryStatus").textContent = error.message || "Fehler beim Speichern.";
    }
  });

  $("#resetGalleryButton").addEventListener("click", resetGalleryForm);

  $("#resetChallengeButton").addEventListener("click", resetChallengeForm);
}

function setupFirebaseListeners() {
  if (!firebaseReady) {
    renderAll();
    return;
  }

  renderAll();

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const isAdmin = user?.email === ADMIN_EMAIL;
    $("#loginButton").textContent = isAdmin ? "Admin" : "Login";
    $("#mobileLoginButton span").textContent = isAdmin ? "Admin" : "Profil";
  });

  onSnapshot(query(collection(db, "tours"), orderBy("date", "desc")), (snapshot) => {
    tours = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    loadState.tours = true;
    renderAll();
  });

  onSnapshot(query(collection(db, "milestones"), orderBy("order", "asc")), (snapshot) => {
    milestones = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    loadState.milestones = true;
    renderAll();
  });

  onSnapshot(query(collection(db, "challenges"), orderBy("order", "asc")), (snapshot) => {
    challenges = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    loadState.challenges = true;
    renderAll();
  });

  onSnapshot(query(collection(db, "galleryItems"), orderBy("order", "asc")), (snapshot) => {
    galleryItems = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    loadState.gallery = true;
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

function setupScrollSpy() {
  const sections = $$("main section[id]");
  const links = $$('a[href^="#"]');
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    links.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`));
  }, { rootMargin: "-25% 0px -60%", threshold: [0, .25, .6] });
  sections.forEach((section) => observer.observe(section));
}

function init() {
  document.documentElement.dataset.theme = localStorage.getItem("yot-theme") || "light";
  bindEvents();
  setupScrollSpy();
  resetTourForm();
  resetMilestoneForm();
  resetChallengeForm();
  resetGalleryForm();
  setupFirebaseListeners();
  window.addEventListener("hashchange", () => {
    if (location.hash.startsWith("#tour=")) openTourFromHash();
    else if (!$("#tourModal").classList.contains("hidden")) hideModal("tourModal");
  });
  window.addEventListener("resize", () => renderGallery());
}

init();
