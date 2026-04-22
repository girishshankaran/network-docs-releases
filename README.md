# network-docs-releases

Release packaging repo for the production Option 2 model.

This repo stores:

- release manifests
- release metadata
- publishing workflow and build scripts

This repo does not store canonical topic Markdown.

Publishing model:

- check out `network-docs-releases`
- check out `network-docs-content`
- build each release from:
  - `network-docs-content/topics`
  - `network-docs-releases/releases/<version>`

Each release uses a single manifest file:

- `releases/<version>/manifests/book.yml`

That file defines both:

- which topics belong in the release
- how those topics are organized into sections

The starter workflow is in:

- `.github/workflows/releases-pages.yml`
