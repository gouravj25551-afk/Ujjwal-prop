// Site integrity checks: `npm run check:site`
//
// - every link, script, stylesheet and image points at something that exists
// - no dead "#" links, every in-page anchor has a target
// - every button and form is wired to an action
// - no hardcoded contact details or prices (they must come from config / real data)

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const pages = readdirSync(root).filter((f) => f.endsWith(".html"));
const errors = [];
const fail = (page, msg) => errors.push(`${page}: ${msg}`);

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1] : null;
};
const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, "g")) || [];
const ids = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

const cache = new Map();
const read = (file) => {
  if (!cache.has(file)) cache.set(file, readFileSync(join(root, file), "utf8"));
  return cache.get(file);
};

for (const page of pages) {
  const html = read(page);
  const pageIds = ids(html);

  for (const a of tags(html, "a")) {
    const href = attr(a, "href");
    if (!href || href === "#") {
      fail(page, `link without a real destination: ${a}`);
      continue;
    }
    if (/^(https?:|mailto:|tel:)/.test(href)) continue;
    const [file, hash] = href.split("#");
    const target = file || page;
    if (!existsSync(join(root, target))) {
      fail(page, `broken link: ${href}`);
      continue;
    }
    if (hash && !ids(read(target)).has(hash)) fail(page, `missing anchor: ${href}`);
  }

  for (const tag of [...tags(html, "link"), ...tags(html, "script")]) {
    const ref = attr(tag, "href") || attr(tag, "src");
    if (ref && !/^https?:/.test(ref) && !existsSync(join(root, ref))) fail(page, `missing asset: ${ref}`);
  }

  for (const img of tags(html, "img")) {
    if (attr(img, "alt") === null) fail(page, `image without alt: ${img}`);
    if (!attr(img, "width") || !attr(img, "height")) fail(page, `image without width/height: ${img}`);
    const srcs = [attr(img, "src"), ...(attr(img, "srcset") || "").split(",").map((s) => s.trim().split(" ")[0])];
    for (const src of srcs.filter(Boolean)) {
      if (!existsSync(join(root, src))) fail(page, `missing image: ${src}`);
    }
  }

  for (const btn of tags(html, "button")) {
    const type = attr(btn, "type");
    if (!type) fail(page, `button without type: ${btn}`);
    if (type === "button") {
      const controls = attr(btn, "aria-controls");
      if (!controls || !pageIds.has(controls)) fail(page, `button not wired to anything: ${btn}`);
    }
  }
  const forms = tags(html, "form");
  for (const form of forms) {
    if (!/\sdata-enquiry[\s>]/.test(form)) fail(page, `form without a handler: ${form}`);
  }
  if (/type="submit"/.test(html) && !forms.length) fail(page, "submit button outside a form");

  // Contact details and prices must never be hardcoded or invented.
  if (/(href="(tel:|mailto:)|wa\.me\/\d)/.test(html)) fail(page, "hardcoded contact link (use assets/js/config.js)");
  if (/(\+91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/.test(html.replace(/<[^>]+>/g, " "))) fail(page, "phone-like number in page text");
  if (/₹|\bRs\.?\s?\d|\blakh\b|\bcrore\b/i.test(html)) fail(page, "price in page text (listings belong in data/listings.js)");
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${pages.length} pages checked`);
