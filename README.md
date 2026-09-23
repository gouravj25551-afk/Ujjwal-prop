# Ujjwal Properties

Website for Ujjwal Properties, a real estate business focused only on Gurugram.

Static HTML, CSS and JavaScript with no build step. Upload the folder to any static host
(GitHub Pages, Netlify, Vercel, cPanel) and it works.

## Pages

| Page | File |
| --- | --- |
| Home | `index.html` |
| Buy / Sell / Rent / Invest | `buy.html`, `sell.html`, `rent.html`, `invest.html` |
| Photo credits | `credits.html` |
| Not found | `404.html` |

## Before launch

1. **Contact details.** Fill in `assets/js/config.js`. Call, WhatsApp and Email buttons stay
   hidden until their value is set.
2. **Enquiry form.** Set `formEndpoint` in the same file to a form service URL (e.g. Formspree)
   so enquiries arrive by email. Without it the form falls back to WhatsApp, then email.
   With none of the three set, the form tells visitors enquiries aren't connected yet.
3. **Listings.** Add real listings to `data/listings.js`. The Buy, Rent and Invest pages show a
   listings section only when there are entries for that page.
4. **Logo.** The header uses a text wordmark and `assets/favicon.svg` is a placeholder
   monogram. Replace both with the real logo.

## Local preview

```sh
npm install
npm start          # http://localhost:4173
```

## Checks

```sh
npm run check        # everything below
npm run check:html   # HTML validation
npm run check:site   # links, images, buttons, forms, no hardcoded contacts or prices
npm test             # Playwright, desktop and mobile
npm run screenshots  # full-page screenshots into docs/screenshots (needs npm start)
```

The Playwright tests use Chromium. On a fresh machine run `npx playwright install chromium` once.

## Photos

Photos of Gurugram from Wikimedia Commons under Creative Commons licences. Attribution is on
`credits.html`; keep that page linked if the photos stay.
