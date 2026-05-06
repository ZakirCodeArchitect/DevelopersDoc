# @developersdoc/cli

Official DevelopersDoc CLI for linking and syncing your repository metadata.

## Install

```bash
npm install --save-dev @developersdoc/cli
```

## Run

```bash
npx developersdoc init
npx developersdoc scan
```

## One-time npx usage

```bash
npx @developersdoc/cli init
```

## Commands

- `developersdoc --help`
- `developersdoc init`
- `developersdoc scan`
- `developersdoc login`

## Maintainer publish command

```bash
npm publish --access public
```

## Dry-run publish checklist

```bash
npm whoami
npm view @developersdoc/cli
npm link
developersdoc --help
npm pack --dry-run
npm publish --access public
```

## Notes

- `developersdoc init` creates `.developerdoc/config.json` and `.developerdoc/state.json`.
- Do not commit secrets in repository config files.
- TODO: move CLI auth token persistence to secure local keychain storage.
