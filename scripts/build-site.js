const fs = require("fs");
const path = require("path");

const contentRoot = path.resolve(process.argv[2] || "network-docs-content");
const releasesRoot = path.resolve(process.argv[3] || "network-docs-releases");
const topicsDir = path.join(contentRoot, "topics");
const releasesDir = path.join(releasesRoot, "releases");
const siteDir = path.join(releasesRoot, "site");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function parseScalar(raw) {
  const trimmed = raw.trim();
  if (trimmed === "null") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return JSON.parse(trimmed.replace(/'/g, '"'));
  }
  return trimmed;
}

function parseYamlBlock(lines, startIndex, currentIndent) {
  const result = {};
  let index = startIndex;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }
    const indent = line.match(/^ */)[0].length;
    if (indent < currentIndent) break;
    if (indent > currentIndent) throw new Error(`Unexpected indentation near: ${line}`);
    const trimmed = line.trim();
    const keyValue = trimmed.match(/^([^:]+):(.*)$/);
    if (!keyValue) throw new Error(`Unsupported YAML line: ${line}`);
    const key = keyValue[1].trim();
    const rest = keyValue[2].trim();
    if (!rest) {
      const nextLine = lines[index + 1] || "";
      const nextTrimmed = nextLine.trim();
      const nextIndent = nextLine.match(/^ */)[0].length;
      if (nextTrimmed.startsWith("- ")) {
        const listResult = [];
        index += 1;
        while (index < lines.length) {
          const listLine = lines[index];
          const listIndent = listLine.match(/^ */)[0].length;
          const listTrimmed = listLine.trim();
          if (!listTrimmed) {
            index += 1;
            continue;
          }
          if (listIndent < currentIndent + 2 || !listTrimmed.startsWith("- ")) break;
          listResult.push(parseScalar(listTrimmed.slice(2).trim()));
          index += 1;
        }
        result[key] = listResult;
        continue;
      }
      if (nextIndent > currentIndent) {
        const nested = parseYamlBlock(lines, index + 1, currentIndent + 2);
        result[key] = nested.value;
        index = nested.nextIndex;
        continue;
      }
      result[key] = {};
      index += 1;
      continue;
    }
    result[key] = parseScalar(rest);
    index += 1;
  }
  return { value: result, nextIndex: index };
}

function parseYaml(source) {
  return parseYamlBlock(source.split("\n"), 0, 0).value;
}

function parseFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error("Missing frontmatter");
  return { frontmatter: parseYaml(match[1]), body: match[2].trim() };
}

function loadTopics() {
  const topics = new Map();
  for (const fileName of fs.readdirSync(topicsDir)) {
    if (!fileName.endsWith(".md")) continue;
    const fullPath = path.join(topicsDir, fileName);
    const { frontmatter, body } = parseFrontmatter(fs.readFileSync(fullPath, "utf8"));
    topics.set(frontmatter.topic_id, {
      slug: fileName.replace(/\.md$/, ""),
      topicId: frontmatter.topic_id,
      title: frontmatter.title,
      lifecycle: frontmatter.lifecycle || {},
      body,
    });
  }
  return topics;
}

function releaseMatchesTopic(release, topic) {
  return (topic.lifecycle.applies_to || []).includes(release);
}

function buildRelease(topics, releaseName) {
  const releaseRoot = path.join(releasesDir, releaseName);
  const manifest = parseYaml(fs.readFileSync(path.join(releaseRoot, "manifests", "book.yml"), "utf8"));
  const metadata = parseYaml(fs.readFileSync(path.join(releaseRoot, "assets", "release-metadata.yml"), "utf8"));
  const outputDir = path.join(siteDir, releaseName);
  ensureDir(outputDir);

  const included = [];
  for (const topicId of manifest.topics || []) {
    const topic = topics.get(topicId);
    if (!topic) continue;
    if (!releaseMatchesTopic(releaseName, topic)) continue;
    included.push(topic);
    fs.writeFileSync(
      path.join(outputDir, `${topic.slug}.html`),
      `<!doctype html><html><body><h1>${topic.title}</h1><pre>${topic.body}</pre></body></html>`
    );
  }

  const links = included.map((topic) => `<li><a href="./${topic.slug}.html">${topic.title}</a></li>`).join("");
  fs.writeFileSync(
    path.join(outputDir, "index.html"),
    `<!doctype html><html><body><h1>${metadata.display_name}</h1><ul>${links}</ul></body></html>`
  );
}

function main() {
  ensureDir(siteDir);
  const topics = loadTopics();
  const releases = fs.readdirSync(releasesDir).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const releaseName of releases) {
    buildRelease(topics, releaseName);
  }
  const releaseLinks = releases.map((release) => `<li><a href="./${release}/index.html">${release}</a></li>`).join("");
  fs.writeFileSync(path.join(siteDir, "index.html"), `<!doctype html><html><body><ul>${releaseLinks}</ul></body></html>`);
}

main();
