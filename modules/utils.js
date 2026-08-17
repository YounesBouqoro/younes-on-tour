export function formatNumber(value, digits = 1) {
  const number = Number(value || 0);
  return number.toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

export const formatKm = (value) => `${formatNumber(value, 1)} km`;

export function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

export const nl2br = (value) => safe(value).replace(/\n/g, "<br>");

export function numeric(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

export function dateLabel(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}
