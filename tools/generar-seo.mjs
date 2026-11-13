// Genera una página por cada juego (juego/<slug>/index.html) y el sitemap.xml.
// Lo corre GitHub solo (ver .github/workflows/seo.yml). No hace falta tocarlo.
import fs from "node:fs";
import path from "node:path";

const SITIO = "https://nomadavn.github.io/";
const PROYECTO = "nomada-4a182";
const API_KEY = "AIzaSyDBSieT2aJYXLOIJcInY5S6I9NnSVny29M";
const RAIZ = process.cwd();

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const recortar = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; };
const abs = (u) => (/^https?:\/\//i.test(u) ? u : SITIO + String(u).replace(/^\/+/, ""));

function valor(v) {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(valor);
  if ("mapValue" in v) { const o = {}; for (const k in v.mapValue.fields || {}) o[k] = valor(v.mapValue.fields[k]); return o; }
  return null;
}

async function leerTodos() {
  if (process.env.SEO_FUENTE) return JSON.parse(fs.readFileSync(process.env.SEO_FUENTE, "utf8"));
  const out = [];
  let token = "";
  do {
    const url = "https://firestore.googleapis.com/v1/projects/" + PROYECTO + "/databases/(default)/documents/juegos?pageSize=300&key=" + API_KEY + (token ? "&pageToken=" + encodeURIComponent(token) : "");
    const r = await fetch(url);
    if (!r.ok) throw new Error("Firestore respondió " + r.status);
    const d = await r.json();
    for (const doc of d.documents || []) {
      const j = {};
      for (const k in doc.fields || {}) j[k] = valor(doc.fields[k]);
      j.id = doc.name.split("/").pop();
      out.push(j);
    }
    token = d.nextPageToken || "";
  } while (token);
  return out;
}

function limpiarTitulo(t) {
  return String(t || "").replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").replace(/\s*(Español|Espanol)\s*PC\/Android\s*$/i, "").trim();
}

function pagina(j) {
  const slug = j.slug;
  const nombre = limpiarTitulo(j.titulo) || j.titulo;
  const plats = (j.plataformas || []).map((x) => String(x).toLowerCase());
  const pc = plats.some((x) => x.includes("pc")), an = plats.some((x) => x.includes("android"));
  const para = pc && an ? "PC y Android" : pc ? "PC" : an ? "Android" : "PC y Android";
  const titulo = nombre + " – Español para " + para + " | Nómada VN";
  const sin = String(j.sinopsis || "").trim();
  const desc = recortar(sin, 155) || "Descargá " + nombre + " en español para " + para + ". Novelas visuales +18 en Nómada VN.";
  const propia = SITIO + "juego/" + encodeURIComponent(slug) + "/";
  const destino = SITIO + "?juego=" + encodeURIComponent(slug);
  const portadaOk = j.portadaUrl && !j.portadaAdulta;
  const imagen = portadaOk ? abs(j.portadaUrl) : SITIO + "assets/images/logo/vista-previa.jpg";
  const ld = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: nombre,
    description: desc,
    inLanguage: "es",
    gamePlatform: para === "PC y Android" ? ["PC", "Android"] : [para],
    url: propia,
    image: imagen,
    audience: { "@type": "PeopleAudience", suggestedMinAge: 18 },
    isPartOf: { "@type": "WebSite", name: "Nómada VN", url: SITIO },
  };
  if (j.fechaCreacion) ld.datePublished = String(j.fechaCreacion).slice(0, 10);
  return '<!DOCTYPE html>\n<html lang="es"><head><meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    "<title>" + esc(titulo) + "</title>\n" +
    '<meta name="description" content="' + esc(desc) + '">\n' +
    '<meta name="robots" content="index, follow">\n' +
    '<meta name="rating" content="RTA-5042-1996-1400-1577-RTA">\n' +
    '<meta name="color-scheme" content="dark"><meta name="theme-color" content="#0a070c">\n' +
    '<link rel="canonical" href="' + esc(propia) + '">\n' +
    '<meta property="og:type" content="website"><meta property="og:site_name" content="Nómada VN">\n' +
    '<meta property="og:url" content="' + esc(propia) + '">\n' +
    '<meta property="og:title" content="' + esc(titulo) + '">\n' +
    '<meta property="og:description" content="' + esc(desc) + '">\n' +
    '<meta property="og:image" content="' + esc(imagen) + '">\n' +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, "\\u003c") + "</script>\n" +
    "<style>*{box-sizing:border-box}body{margin:0;background:#0a070c;color:#f1e6e2;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;line-height:1.6;padding:24px}" +
    "main{max-width:760px;margin:0 auto}a{color:#ff3b5c}.top{font-size:.9rem;margin-bottom:18px}" +
    "img{max-width:100%;height:auto;border-radius:14px;display:block;margin:14px 0}h1{font-size:1.6rem;line-height:1.25;margin:.2em 0}" +
    ".tag{display:inline-block;font-size:.8rem;padding:2px 10px;border-radius:999px;border:1px solid #ff3b5c;color:#ff3b5c;margin-right:6px}" +
    ".btn{display:inline-block;margin-top:18px;padding:12px 22px;border-radius:12px;background:#ff3b5c;color:#fff;font-weight:700;text-decoration:none}" +
    "p.sin{white-space:pre-line;color:#e6d6d2}</style></head><body><main>\n" +
    '<div class="top"><a href="' + SITIO + '">← Nómada VN</a></div>\n' +
    '<span class="tag">+18</span><span class="tag">' + esc(para) + '</span><span class="tag">Español</span>\n' +
    "<h1>" + esc(nombre) + "</h1>\n" +
    (portadaOk ? '<img src="' + esc(imagen) + '" alt="Portada de ' + esc(nombre) + '" width="640" loading="lazy">\n' : "") +
    (sin ? '<p class="sin">' + esc(sin) + "</p>\n" : "<p>Novela visual +18 en español para " + esc(para) + ". Solo para mayores de 18 años.</p>\n") +
    '<a class="btn" href="' + esc(destino) + '">Ver y descargar en Nómada VN</a>\n' +
    '<p style="font-size:.85rem;opacity:.7;margin-top:28px">Contenido solo para mayores de 18 años.</p>\n' +
    "</main></body></html>\n";
}

const juegos = (await leerTodos()).filter((j) => j.slug && /^[A-Za-z0-9_-]{1,160}$/.test(j.slug));
if (!juegos.length) { console.log("Sin juegos: no se cambia nada."); process.exit(0); }

const dir = path.join(RAIZ, "juego");
fs.rmSync(dir, { recursive: true, force: true });
for (const j of juegos) {
  fs.mkdirSync(path.join(dir, j.slug), { recursive: true });
  fs.writeFileSync(path.join(dir, j.slug, "index.html"), pagina(j));
}

const hoy = new Date().toISOString().slice(0, 10);
let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  "  <url><loc>" + SITIO + "</loc><lastmod>" + hoy + "</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>\n";
for (const j of juegos) {
  const f = j.fechaCreacion ? String(j.fechaCreacion).slice(0, 10) : hoy;
  xml += "  <url><loc>" + SITIO + "juego/" + encodeURIComponent(j.slug) + "/</loc><lastmod>" + f + "</lastmod></url>\n";
}
xml += "</urlset>\n";
fs.writeFileSync(path.join(RAIZ, "sitemap.xml"), xml);
console.log("Listo: " + juegos.length + " páginas de juegos.");
