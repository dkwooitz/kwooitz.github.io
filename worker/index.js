// Password gate for kwooitz.co.za.
//
// Every request runs through this Worker before any file is served
// (assets.run_worker_first in wrangler.jsonc). Visitors without a valid
// cookie get a sign-in page. The password is the Worker secret SITE_PASSWORD;
// it is never stored in this repository.
//
// The cookie holds an HMAC of the password, not the password. Changing
// SITE_PASSWORD therefore signs out everyone who used the old one.

const COOKIE = "kz_access";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Files that may load without signing in, so the sign-in page has its icon.
const PUBLIC = new Set(["/favicon.ico", "/favicon-32.png", "/icon-192.png", "/apple-touch-icon.png", "/robots.txt"]);

const enc = new TextEncoder();

async function token(password) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("kwooitz.co.za access v1"));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// Compare two strings in time that does not depend on where they differ.
function same(a, b) {
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

const SECURITY = {
  "X-Robots-Tag": "noindex, nofollow",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "private, no-store",
};

function signInPage({ error = "", status = 401, configured = true } = {}) {
  const message = !configured
    ? `<p class="err">The site's password hasn't been set up yet. Please try again later.</p>`
    : error ? `<p class="err" role="alert">${error}</p>` : "";
  const form = configured ? `
    <form method="post" action="/sign-in">
      <label for="pw">Password</label>
      <input id="pw" name="password" type="password" autocomplete="current-password" required autofocus>
      <button type="submit">View CV</button>
    </form>` : "";
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Diedrik Kwooitz</title>
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>
:root{--bg:#F2F4F3;--surface:#FFFFFF;--ink:#16211E;--muted:#5A6964;--line:#D5DCD9;--accent:#1D6B57;--on-accent:#FFFFFF;--adverse:#B5462F}
@media (prefers-color-scheme: dark){:root{--bg:#111816;--surface:#18211E;--ink:#E4ECE9;--muted:#97A6A1;--line:#2B3833;--accent:#5FC2A2;--on-accent:#0E1714;--adverse:#EE8C74;color-scheme:dark}}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--ink);font:17px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px max(16px,env(safe-area-inset-right,0px)) 24px max(16px,env(safe-area-inset-left,0px))}
main{width:100%;max-width:380px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:28px}
img{width:72px;height:72px;border-radius:50%;display:block;margin-bottom:16px}
h1{font-size:26px;line-height:1.15;margin:0 0 6px}
p{margin:0 0 20px;color:var(--muted)}
label{display:block;font-weight:600;font-size:15px;margin-bottom:6px}
input{width:100%;font:inherit;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink)}
button{margin-top:14px;width:100%;font:inherit;font-weight:600;padding:11px;border:0;border-radius:8px;background:var(--accent);color:var(--on-accent);cursor:pointer}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.err{color:var(--adverse);font-weight:600;margin:0 0 16px}
</style>
</head>
<body>
<main>
  <img src="/icon-192.png" alt="">
  <h1>Diedrik Kwooitz</h1>
  <p>This CV is shared privately. Enter the password you were given to view it.</p>
  ${message}${form}
</main>
</body>
</html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", ...SECURITY } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (PUBLIC.has(url.pathname)) return env.ASSETS.fetch(request);

    if (!env.SITE_PASSWORD) return signInPage({ configured: false, status: 503 });
    const expected = await token(env.SITE_PASSWORD);

    if (url.pathname === "/sign-in") {
      if (request.method !== "POST") return Response.redirect(new URL("/", url), 303);
      const form = await request.formData().catch(() => null);
      const given = (form && form.get("password")) || "";
      if (!same(String(given), env.SITE_PASSWORD)) {
        await new Promise(r => setTimeout(r, 800)); // slow down guessing
        return signInPage({ error: "That password isn't right. Check it and try again." });
      }
      return new Response(null, {
        status: 303,
        headers: {
          Location: "/",
          "Set-Cookie": `${COOKIE}=${expected}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
          ...SECURITY,
        },
      });
    }

    if (url.pathname === "/sign-out") {
      return new Response(null, {
        status: 303,
        headers: { Location: "/", "Set-Cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`, ...SECURITY },
      });
    }

    const cookie = readCookie(request, COOKIE);
    if (!cookie || !same(cookie, expected)) return signInPage();

    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(SECURITY)) out.headers.set(k, v);
    return out;
  },
};
