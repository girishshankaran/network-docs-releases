# Repo Plan

## Recommended repo names

- `network-docs-content`
- `network-docs-releases`

These names make the split explicit:

- `content` = canonical source text
- `releases` = release-specific packaging and publishing

## Ownership

`network-docs-content`

- Documentation writers
- Information architects
- Shared content reviewers

`network-docs-releases`

- Release managers
- Docs build owners
- Product release leads

## Branch strategy

Both repos can stay simple:

`network-docs-content`

- `main`
- short-lived feature branches

`network-docs-releases`

- `main`
- short-lived feature branches

Release separation happens by folders, not branches:

- `releases/19.9/`
- `releases/20.0/`
- `releases/21.0/`

## Why this model is cleaner

- No `release/* -> main` merge confusion
- No accidental topic copies in release branches
- Cleaner permissions and review ownership
- Easier CI because the release repo is the publishing trigger
