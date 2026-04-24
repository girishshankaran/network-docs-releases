# Architecture

This solution separates canonical content from release packaging.

- `network-docs-content` owns reusable topic Markdown, frontmatter, schemas, templates, and content validation.
- `network-docs-releases` owns release manifests, release metadata, the static site builder, and the GitHub Pages deployment workflow.

## System Diagram

```mermaid
flowchart LR
  author[Author] --> contentPR[Content PR]
  author --> releasePR[Release PR]

  subgraph contentRepo["network-docs-content"]
    topics["topics/*.md<br/>canonical topic Markdown"]
    template["templates/topic-template.md"]
    schema["schemas/topic-frontmatter.schema.json<br/>future schema hook"]
    contentValidate["scripts/validate-content.js"]
    topicTools["scripts/create-topic.js<br/>scripts/assign-missing-topic-ids.js"]
  end

  subgraph releaseRepo["network-docs-releases"]
    manifests["releases/&lt;version&gt;/manifests/book.yml"]
    metadata["releases/&lt;version&gt;/assets/release-metadata.yml"]
    suggest["scripts/suggest-release-updates.js"]
    build["scripts/build-site.js"]
    site["site/<br/>generated static HTML"]
    workflow[".github/workflows/releases-pages.yml"]
  end

  subgraph github["GitHub Actions and Pages"]
    contentCI["Validate Content workflow"]
    pagesCI["Build And Deploy Releases workflow"]
    pages["GitHub Pages"]
  end

  contentPR --> contentCI
  topics --> contentValidate
  contentValidate --> contentCI
  contentCI -->|push to content main triggers| pagesCI

  releasePR --> pagesCI
  topics --> build
  manifests --> build
  metadata --> build
  suggest --> contentCI
  build --> site
  site --> pagesCI
  pagesCI --> pages

  topicTools --> topics
  template --> topicTools
  schema -. not wired today .-> contentValidate
```

## Build Flow

```mermaid
sequenceDiagram
  participant GH as GitHub Actions
  participant Rel as network-docs-releases
  participant Con as network-docs-content
  participant Build as scripts/build-site.js
  participant Site as site/
  participant Pages as GitHub Pages

  GH->>Rel: checkout release repo
  GH->>Con: checkout content repo main
  GH->>Build: node build-site.js network-docs-content network-docs-releases
  Build->>Con: read topics/*.md
  Build->>Rel: read releases/&lt;version&gt;/manifests/book.yml
  Build->>Rel: read releases/&lt;version&gt;/assets/release-metadata.yml
  Build->>Build: filter topics by manifest and lifecycle.applies_to
  Build->>Build: render release-specific version blocks
  Build->>Site: write index.html and release topic pages
  GH->>Pages: deploy site/ artifact
```

## Topic Inclusion Rules

A topic appears in a release only when both conditions are true:

1. The topic `topic_id` is listed in `releases/<version>/manifests/book.yml`.
2. The topic frontmatter includes that release in `lifecycle.applies_to`.

```mermaid
flowchart TD
  start["Topic candidate"] --> manifestCheck{"topic_id listed in<br/>book.yml topics?"}
  manifestCheck -->|No| excluded["Excluded from release"]
  manifestCheck -->|Yes| lifecycleCheck{"release listed in<br/>lifecycle.applies_to?"}
  lifecycleCheck -->|No| excluded
  lifecycleCheck -->|Yes| sectionCheck{"topic_id listed in<br/>a book.yml section?"}
  sectionCheck -->|No| omitted["No topic page linked<br/>from release TOC"]
  sectionCheck -->|Yes| included["Included in release TOC<br/>and generated topic page"]
```

## Version-Specific Content

Topics can contain release-specific blocks:

```md
:::version range="19.0"
Content for 19.0 only.
:::

:::version range="20.0+"
Content for 20.0 and later.
:::
```

`scripts/build-site.js` evaluates these blocks for each release before converting Markdown to HTML.

```mermaid
flowchart LR
  body["Topic body Markdown"] --> versionFilter["renderVersionBlocks(topic.body, releaseName)"]
  versionFilter --> markdown["markdownToHtml(...)"]
  markdown --> page["site/&lt;release&gt;/&lt;topic&gt;.html"]
```

Supported range patterns:

- `19.0`: exact release match
- `20.0+`: release `20.0` and later
- `19.0-20.0`: inclusive release range

## Deployment Triggers

```mermaid
flowchart TD
  contentMain["Push to network-docs-content main"] --> contentWorkflow["Validate Content workflow"]
  contentWorkflow --> dispatch["repository_dispatch: content-updated"]
  dispatch --> releaseWorkflow["Build And Deploy Releases workflow"]

  releaseMain["Push to network-docs-releases main"] --> releaseWorkflow
  releasePR["Release pull request"] --> releaseWorkflow
  manual["Manual workflow_dispatch"] --> releaseWorkflow

  releaseWorkflow --> artifact["Upload Pages artifact from site/"]
  artifact --> deploy["Deploy to GitHub Pages"]
```

Pull requests run the release build but skip deployment. Pushes to `network-docs-releases/main`, manual dispatches, and content update dispatches can deploy to GitHub Pages.
