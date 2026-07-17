import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const baselinePath = fileURLToPath(new URL("../data/source-baseline.json", import.meta.url));
const args = new Set(process.argv.slice(2));
const outputIndex = process.argv.indexOf("--output");
const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
const writeBaseline = args.has("--write-baseline");
const baseline = JSON.parse(await readFile(baselinePath, "utf8"));

function normalizeHtml(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500_000);
}

async function inspect(source) {
  try {
    const response = await fetch(source.url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: {
        "user-agent": "Agent-Boundary-Atlas-Source-Review/1.0",
        accept: "text/html,application/xhtml+xml,text/markdown,text/plain",
      },
    });
    const html = await response.text();
    const normalized = normalizeHtml(html);
    return {
      ...source,
      status: response.status,
      ok: response.ok,
      hash: normalized ? createHash("sha256").update(normalized).digest("hex") : null,
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
      checkedUrl: response.url,
      error: null,
    };
  } catch (error) {
    return {
      ...source,
      status: null,
      ok: false,
      hash: null,
      etag: null,
      lastModified: null,
      checkedUrl: source.url,
      error: error instanceof Error ? error.message : "unknown_error",
    };
  }
}

const inspected = await Promise.all(baseline.sources.map(inspect));

if (writeBaseline) {
  const next = {
    verifiedAt: new Date().toISOString().slice(0, 10),
    sources: inspected.map(({ id, name, url, hash, etag, lastModified }) => ({
      id,
      name,
      url,
      hash,
      etag,
      lastModified,
    })),
  };
  await writeFile(baselinePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(`Updated source baseline for ${next.sources.length} agents.`);
  process.exit(0);
}

const changes = inspected.filter((current) => {
  const previous = baseline.sources.find((source) => source.id === current.id);
  if (!current.ok || current.error) return true;
  if (!previous?.hash) return true;
  return current.hash !== previous.hash;
});

let report = "";
if (changes.length) {
  const rows = changes.map((current) => {
    const previous = baseline.sources.find((source) => source.id === current.id);
    const result = current.error
      ? `访问失败：${current.error}`
      : !current.ok
        ? `HTTP ${current.status}`
        : !previous?.hash
          ? "尚未建立内容基线"
          : "页面正文发生变化";
    return `| ${current.name} | ${result} | [打开官网](${current.url}) |`;
  });
  report = [
    "## 每周 Agent 官方来源复核",
    "",
    `检查时间：${new Date().toISOString()}`,
    "",
    "以下来源需要人工确认。自动检查不会直接修改网站正文。",
    "",
    "| Agent | 检查结果 | 来源 |",
    "|---|---|---|",
    ...rows,
    "",
    "复核后请更新 `app/agents.ts` 的事实描述与 `data/source-baseline.json`，再合并发布。",
  ].join("\n");
}

if (outputPath) await writeFile(outputPath, report, "utf8");
else if (report) console.log(report);
else console.log("All official sources match the current baseline.");
