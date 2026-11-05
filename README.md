# kwooitz.co.za

Personal site for Diedrik Kwooitz, management accountant (aspiring ACMA, CGMA).

The page is a CV with a section on apps I have built: Capital Management, Car-diology and my wedding website.

The site is one static page, `public/index.html`, built with HTML, CSS and JavaScript. It has no build step and no dependencies other than Google Fonts.

## Password

The whole site sits behind a password. `worker/index.js` checks it before any file is served, and only the icons are public so the sign-in page can show them.

The password is the Worker secret `SITE_PASSWORD`. It is set in Cloudflare (Worker → Settings → Variables and Secrets, type **Secret**) and is never stored in this repo. Changing it signs out everyone who used the old one.

## Run locally

Open `public/index.html` in a browser to see the page without the password gate.

To test the gate, put `SITE_PASSWORD=anything` in a `.dev.vars` file (git ignores it) and run `npx wrangler dev`.

## Publish

Served by the Cloudflare Worker `kwooitz-github-io` at **https://kwooitz.co.za**. Every push to `main` deploys automatically.

`wrangler.jsonc` is the source of truth for the Worker's settings, including both custom domains. A deploy overwrites anything changed by hand in the Cloudflare dashboard, so change settings in `wrangler.jsonc` instead.
