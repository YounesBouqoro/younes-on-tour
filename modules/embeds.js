import { safe } from "./utils.js";

export function parseStravaEmbed(value) {
  if (!value) return null;
  if (typeof value === "object") {
    const id = String(value.id || "").trim();
    const token = String(value.token || "").trim();
    return /^\d+$/.test(id) && (!token || /^[A-Za-z0-9_-]+$/.test(token)) ? { id, token } : null;
  }
  const raw = String(value).trim();
  const documentFragment = new DOMParser().parseFromString(raw, "text/html");
  const placeholder = documentFragment.querySelector(".strava-embed-placeholder");
  const urlMatch = raw.match(/strava\.com\/activities\/(\d+)/i);
  const id = String(placeholder?.dataset.embedId || urlMatch?.[1] || "").trim();
  const token = String(placeholder?.dataset.token || "").trim();
  return /^\d+$/.test(id) && (!token || /^[A-Za-z0-9_-]+$/.test(token)) ? { id, token } : null;
}

export function stravaEmbedCode(value) {
  const embed = parseStravaEmbed(value);
  if (!embed) return "";
  const token = embed.token ? ` data-token="${embed.token}"` : "";
  return `<div class="strava-embed-placeholder" data-embed-type="activity" data-embed-id="${embed.id}" data-style="standard" data-from-embed="false"${token}></div><script src="https://strava-embeds.com/embed.js"></script>`;
}

export function stravaEmbedMarkup(value) {
  const embed = parseStravaEmbed(value);
  if (!embed) return "";
  const token = embed.token ? ` data-token="${embed.token}"` : "";
  return `<div class="strava-embed-shell"><div class="strava-embed-placeholder" data-embed-type="activity" data-embed-id="${embed.id}" data-style="standard" data-from-embed="false"${token}></div></div>`;
}

export function refreshStravaEmbeds() {
  window.setTimeout(() => {
    if (!document.querySelector(".strava-embed-placeholder")) return;
    document.querySelectorAll("script[data-yot-strava-embed]").forEach((script) => script.remove());
    const script = document.createElement("script");
    script.src = "https://strava-embeds.com/embed.js";
    script.async = true;
    script.dataset.yotStravaEmbed = "true";
    document.body.appendChild(script);
  }, 0);
}

export function youtubeVideoId(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    let id = "";
    if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
    if (host.endsWith("youtube.com")) id = url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)?.[1] || "";
    return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : "";
  } catch { return ""; }
}

export function youtubeEmbedMarkup(value, title = "Tourvideo") {
  const id = youtubeVideoId(value);
  if (!id) return "";
  return `<div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${safe(title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
}
