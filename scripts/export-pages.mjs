import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const clientDir = fileURLToPath(new URL("../dist/client/", import.meta.url));
const outputDir = fileURLToPath(new URL("../dist/pages/", import.meta.url));
const repositoryBase = "/agent-boundary-atlas";

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(clientDir, outputDir, { recursive: true });

const { default: worker } = await import(
  new URL(`../dist/server/index.js?pages=${Date.now()}`, import.meta.url)
);

const response = await worker.fetch(
  new Request("https://agent-boundary-atlas.local/", {
    headers: { accept: "text/html" },
  }),
  {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  },
  {
    waitUntil() {},
    passThroughOnException() {},
  },
);

if (!response.ok) {
  throw new Error(`Static render failed with HTTP ${response.status}.`);
}

let html = await response.text();
html = html
  .replaceAll('href="/assets/', `href="${repositoryBase}/assets/`)
  .replaceAll('src="/assets/', `src="${repositoryBase}/assets/`)
  .replaceAll('href="/favicon.svg"', `href="${repositoryBase}/favicon.svg"`);

await writeFile(`${outputDir}/index.html`, html, "utf8");
await writeFile(`${outputDir}/404.html`, html, "utf8");
await writeFile(`${outputDir}/.nojekyll`, "", "utf8");

const index = await readFile(`${outputDir}/index.html`, "utf8");
if (!index.includes(`${repositoryBase}/assets/`)) {
  throw new Error("GitHub Pages asset paths were not written correctly.");
}

console.log(`GitHub Pages export ready at ${outputDir}`);
