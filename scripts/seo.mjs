import { readFile, writeFile } from "node:fs/promises";
const site = process.env.SITE_URL || "https://davefurius.github.io/jugada-clara/";
if (site) {
  const url = new URL(site.endsWith("/") ? site : site + "/");
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("SITE_URL debe ser HTTP o HTTPS.");
  const escaped = url.href.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Jugada Clara",
    url: url.href,
    applicationCategory: "GameApplication",
    operatingSystem: "Navegador web",
    inLanguage: "es",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    description:
      "Analizador de posiciones FEN con Stockfish 19 en el navegador. Sin registro.",
  };
  let html = await readFile("dist/index.html", "utf8");
  html = html.replace(
    "</head>",
    `<link rel="canonical" href="${escaped}"><meta property="og:url" content="${escaped}"><script type="application/ld+json">${JSON.stringify(schema).replaceAll("<", "\\u003c")}</script></head>`,
  );
  await writeFile("dist/index.html", html);
  await writeFile(
    "dist/sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escaped}</loc></url></urlset>`,
  );
  await writeFile(
    "dist/robots.txt",
    `User-agent: *\nAllow: /\nSitemap: ${url.href}sitemap.xml\n`,
  );
}
await writeFile("dist/.nojekyll", "");
