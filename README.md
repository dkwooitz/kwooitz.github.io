# kwooitz.co.za

Personal site for Diedrik Kwooitz, management accountant (aspiring ACMA, CGMA).

The page is a CV with a section on apps I have built: Capital Management, Car-diology and my wedding website.

The site is one static page, `public/index.html`, built with HTML, CSS and JavaScript. It has no build step and no dependencies other than Google Fonts.

## Run locally

Open `public/index.html` in a browser.

## Publish

Served by the Cloudflare Worker `kwooitz-github-io` at **https://kwooitz.co.za**. Every push to `main` deploys automatically.

`wrangler.jsonc` is the source of truth for the Worker's settings, including both custom domains. A deploy overwrites anything changed by hand in the Cloudflare dashboard, so change settings in `wrangler.jsonc` instead.
