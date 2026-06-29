/** WCAG contrast helpers — node scripts/check-a11y-contrast.mjs */
function lin(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
function lum(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function ratio(fg, bg) {
  const l1 = lum(fg);
  const l2 = lum(bg);
  const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (a + 0.05) / (b + 0.05);
}

const bg = "#faf8f5";
const pairs = [
  ["stone-400", "#a8a29e"],
  ["stone-500", "#78716c"],
  ["stone-600", "#57534e"],
  ["brand-gold on bg", "#c9a86a"],
  ["#a07d4a ETBIS sub", "#a07d4a"],
  ["#8b5a2b instagram", "#8b5a2b"],
  ["white/45 carousel dot", "rgba(255,255,255,0.45)"],
];

for (const [name, fg] of pairs) {
  if (fg.startsWith("rgba")) {
    console.log(name, "— skip composite");
    continue;
  }
  console.log(`${name} on ${bg}: ${ratio(fg, bg).toFixed(2)}:1`);
}
