/**
 * Playwright + axe accessibility scan (Lighthouse-equivalent rules).
 * node scripts/a11y-audit-playwright.mjs [url]
 */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const url = process.argv[2] ?? "https://www.zeluladesign.com/";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await context.newPage();
await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });

const results = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
  .analyze();

const focus = results.violations.filter((v) =>
  ["color-contrast", "target-size"].includes(v.id),
);

console.log(`URL: ${url}`);
console.log(`Violations total: ${results.violations.length}`);
console.log(`Contrast + touch target: ${focus.length}\n`);

for (const v of focus) {
  console.log(`\n=== ${v.id}: ${v.help} (impact: ${v.impact}) ===`);
  console.log(v.description);
  for (const node of v.nodes.slice(0, 12)) {
    console.log(`  • ${node.html.slice(0, 140)}`);
    if (node.failureSummary) console.log(`    ${node.failureSummary.replace(/\n/g, "\n    ")}`);
  }
  if (v.nodes.length > 12) console.log(`  … +${v.nodes.length - 12} more`);
}

await context.close();
await browser.close();
process.exit(focus.some((v) => v.impact === "serious" || v.impact === "critical") ? 1 : 0);
