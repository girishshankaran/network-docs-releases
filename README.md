# network-docs-releases

Release packaging repo for the production Option 2 model.

This repo stores:

- release manifests
- release TOCs
- release metadata
- publishing workflow and build scripts

This repo does not store canonical topic Markdown.

Publishing model:

- check out `network-docs-releases`
- check out `network-docs-content`
- build each release from:
  - `network-docs-content/topics`
  - `network-docs-releases/releases/<version>`

The starter workflow is in:

- `.github/workflows/releases-pages.yml`
