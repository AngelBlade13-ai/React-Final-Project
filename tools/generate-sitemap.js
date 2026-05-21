/**
 * Regenerate frontend/public/sitemap.xml from the local catalog file.
 * Usage: node tools/generate-sitemap.js [--base-url=https://example.com]
 */
const fs = require("fs/promises");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const CATALOG_PATH = path.resolve(
  REPO_ROOT,
  "backend",
  "data",
  "posts.local.json"
);
const OUTPUT_PATH = path.resolve(REPO_ROOT, "frontend", "public", "sitemap.xml");
const DEFAULT_BASE_URL =
  "https://react-final-project-seven-sigma.vercel.app";

function parseBaseUrl(argv) {
  const flag = argv.find((entry) => entry.startsWith("--base-url="));
  return (flag ? flag.split("=")[1] : DEFAULT_BASE_URL).replace(/\/$/, "");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(baseUrl, pathname, priority) {
  return `  <url>
    <loc>${escapeXml(`${baseUrl}${pathname}`)}</loc>
    <priority>${priority}</priority>
  </url>`;
}

async function main() {
  const baseUrl = parseBaseUrl(process.argv.slice(2));
  const raw = await fs.readFile(CATALOG_PATH, "utf8");
  const catalog = JSON.parse(raw);
  const posts = (catalog.posts || []).filter((post) => post.published !== false);
  const collections = (catalog.collections || []).filter(
    (collection) => collection.isPublicPrimary !== false
  );
  const paths = (catalog.siteContent?.guidedPaths || []).length
    ? catalog.siteContent.guidedPaths
    : [
        { slug: "start-here" },
        { slug: "fractureverse" },
        { slug: "eldoria" },
        { slug: "identity-becoming" },
        { slug: "princess-anime" },
        { slug: "villain-catastrophe" }
      ];

  const urls = [
    urlEntry(baseUrl, "/", "1.0"),
    urlEntry(baseUrl, "/collections", "0.9"),
    urlEntry(baseUrl, "/paths", "0.9"),
    urlEntry(baseUrl, "/paths/start-here", "0.9"),
    urlEntry(baseUrl, "/explore", "0.8"),
    urlEntry(baseUrl, "/about", "0.7"),
    urlEntry(baseUrl, "/community", "0.4"),
    ...collections.map((collection) =>
      urlEntry(baseUrl, `/collections/${collection.slug}`, "0.8")
    ),
    ...paths.map((path) =>
      urlEntry(baseUrl, `/paths/${path.slug}`, "0.75")
    ),
    ...posts.map((post) =>
      urlEntry(baseUrl, `/release/${post.slug}`, "0.7")
    )
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

  await fs.writeFile(OUTPUT_PATH, xml, "utf8");
  console.log(`Wrote ${urls.length} URLs to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
