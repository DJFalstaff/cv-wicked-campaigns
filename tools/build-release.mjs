// Builds a distributable module ZIP into dist/. Assumes `npm run pack` has already
// compiled packs/_source into the binary compendium packs Foundry actually reads -
// this script only handles the zipping step.
import { createWriteStream, readFileSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import archiver from "archiver";

const TOP_LEVEL_EXCLUDES = new Set([
  "node_modules",
  "dist",
  "tools",
  ".git",
  ".gitignore",
  "package.json",
  "package-lock.json",
]);
const SOURCE_DIR_NAME = "_source";

const moduleJson = JSON.parse(readFileSync("module.json", "utf8"));
const outName = `${moduleJson.id}-v${moduleJson.version}.zip`;

await mkdir("dist", { recursive: true });
const outPath = path.join("dist", outName);

const output = createWriteStream(outPath);
const archive = archiver("zip", { zlib: { level: 9 } });

const closed = new Promise((resolve, reject) => {
  output.on("close", resolve);
  archive.on("error", reject);
});
archive.on("warning", (err) => {
  if (err.code !== "ENOENT") throw err;
});
archive.pipe(output);

async function addDir(dir, zipBase) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (zipBase === "" && TOP_LEVEL_EXCLUDES.has(entry.name)) continue;
    if (entry.name === SOURCE_DIR_NAME) continue;
    const fullPath = path.join(dir, entry.name);
    const zipPath = zipBase ? `${zipBase}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await addDir(fullPath, zipPath);
    else archive.file(fullPath, { name: zipPath });
  }
}

await addDir(".", "");
await archive.finalize();
await closed;

console.log(`Built ${outPath} (${(archive.pointer() / 1024).toFixed(1)} KB)`);
