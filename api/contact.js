// Contactformulier-afhandeling voor Glashandel Groenewegen.
// Ontvangt een POST van elk formulier op de site en mailt de inhoud naar
// info@glashandelgroenewegen.nl via Resend (https://resend.com).
//
// Vereiste omgevingsvariabele in Vercel:
//   RESEND_API_KEY   – de API-sleutel uit je Resend-account
// Optioneel:
//   MAIL_TO          – ontvanger (standaard info@glashandelgroenewegen.nl)
//   MAIL_FROM        – afzender (standaard een adres op je eigen domein)

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Alleen deze velden tonen we in de mail, in deze volgorde. Interne
// hulpvelden (namen die met _ beginnen) laten we weg.
const LABELS = {
  Name: "Naam",
  Email: "E-mail",
  Phone: "Telefoon",
  Subject: "Onderwerp",
  Message: "Bericht",
  Pagina: "Pagina",
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseUrlEncoded(raw) {
  const out = {};
  for (const [key, val] of new URLSearchParams(raw)) out[key] = val;
  return out;
}

async function readBody(req) {
  if (req.body && typeof req.body === "object" && Object.keys(req.body).length) {
    return req.body;
  }
  if (typeof req.body === "string" && req.body.length) {
    return parseUrlEncoded(req.body);
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  const type = req.headers["content-type"] || "";
  if (type.includes("application/json")) {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return parseUrlEncoded(raw);
}

// Voorkom open-redirects: sta alleen relatieve paden op de eigen site toe.
function safeRedirect(next) {
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/bedankt";
}

function redirect(res, location) {
  res.statusCode = 303;
  res.setHeader("Location", location);
  res.end();
}

function errorPage(res, status) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(
    `<!doctype html><meta charset="utf-8"><title>Er ging iets mis</title>` +
      `<div style="font-family:sans-serif;max-width:32rem;margin:15vh auto;padding:0 1.5rem;text-align:center">` +
      `<h1>Er ging iets mis</h1>` +
      `<p>Je bericht kon niet verstuurd worden. Probeer het later nog eens of mail ons direct op ` +
      `<a href="mailto:info@glashandelgroenewegen.nl">info@glashandelgroenewegen.nl</a>.</p>` +
      `<p><a href="/contact">Terug naar het contactformulier</a></p></div>`
  );
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const body = await readBody(req);

  // Honeypot: bots vullen dit verborgen veld in. Doe alsof het lukte.
  if (body._honey) {
    redirect(res, safeRedirect(body._next));
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    errorPage(res, 500);
    return;
  }

  const to = process.env.MAIL_TO || "info@glashandelgroenewegen.nl";
  const from =
    process.env.MAIL_FROM ||
    "Glashandel Groenewegen <contact@glashandelgroenewegen.nl>";
  const subject = body._subject || "Nieuw bericht via glashandelgroenewegen.nl";

  const rows = [];
  const textLines = [];
  for (const [field, label] of Object.entries(LABELS)) {
    const value = body[field];
    if (value == null || String(value).trim() === "") continue;
    rows.push(
      `<tr><td style="padding:4px 12px 4px 0;font-weight:600;vertical-align:top">${label}</td>` +
        `<td style="padding:4px 0;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`
    );
    textLines.push(`${label}: ${value}`);
  }

  if (!rows.length) {
    errorPage(res, 400);
    return;
  }

  const html =
    `<div style="font-family:sans-serif;color:#111">` +
    `<p>Er is een bericht binnengekomen via de website:</p>` +
    `<table style="border-collapse:collapse">${rows.join("")}</table></div>`;

  const payload = {
    from,
    to: [to],
    subject,
    html,
    text: textLines.join("\n"),
  };
  // Laat een reply direct naar de afzender gaan.
  if (body.Email && String(body.Email).includes("@")) {
    payload.reply_to = String(body.Email).trim();
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      errorPage(res, 502);
      return;
    }
  } catch {
    errorPage(res, 502);
    return;
  }

  redirect(res, safeRedirect(body._next));
};
