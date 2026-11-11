# panX task runner: `just` lists every recipe.
#
# Recipes run the tools pinned in .config/mise.toml and package.json: on the
# host after `mise install` and `bun install`, or in the development container
# as `dev/docker/run just <recipe>`. Bun is the one JavaScript runtime: the
# tools of node_modules run under `bun --bun`.

set default-list
set quiet
set positional-arguments
set shell := ["mise", "exec", "--", "bash", "-euo", "pipefail", "-c"]
set script-interpreter := ["mise", "exec", "--", "bash", "-euo", "pipefail"]

# The TypeScript that oxfmt and oxlint check. The moved viewer JavaScript and
# the vendored files of packages/app keep their own style.
ts_paths := "packages/data-format packages/local-server packages/app/src/data packages/app/scripts"

# Root files that oxfmt formats beside the TypeScript.
fmt_root_files := "package.json tsconfig.base.json .oxfmtrc.json .oxlintrc.json .github"

dockerfiles := "dev/docker/dev.dockerfile"

# The JSON Schema files of the data format, written by `just schemas`.
schemas_dir := "docs/schemas"

# Run every check: formatting, lints, types, and the JSON Schema files, keep-going
[script]
check: _node-modules
    status=0
    just fmt-check || status=1
    just lint || status=1
    just typecheck || status=1
    just schemas-check || status=1
    exit "${status}"

# Format the TypeScript and root files (oxfmt), the shell scripts (shfmt), and the justfile
fmt: _node-modules
    bun --bun oxfmt --write --no-error-on-unmatched-pattern {{ ts_paths }} {{ fmt_root_files }}
    just _shell-files | xargs -0r shfmt --write
    just --fmt

# Check the formatting of the TypeScript, root files, shell scripts, and justfile, keep-going
[script]
fmt-check: _node-modules
    status=0
    bun --bun oxfmt --check --no-error-on-unmatched-pattern {{ ts_paths }} {{ fmt_root_files }} || status=1
    just _shell-files | xargs -0r shfmt --diff || status=1
    just --fmt --check || status=1
    exit "${status}"

# Lint the TypeScript (oxlint), shell scripts (shellcheck), Dockerfile (hadolint), and workflows (actionlint), keep-going
[script]
lint: _node-modules
    status=0
    bun --bun oxlint --deny-warnings --no-error-on-unmatched-pattern {{ ts_paths }} || status=1
    just _shell-files | xargs -0r shellcheck --source-path=SCRIPTDIR || status=1
    hadolint --config .config/hadolint.yaml {{ dockerfiles }} || status=1
    actionlint || status=1
    exit "${status}"

# Check the types of each workspace package that has a tsconfig.json, keep-going
[script]
typecheck: _node-modules
    shopt -s nullglob
    status=0
    for config in packages/*/tsconfig.json; do
      bun --bun tsc --project "${config}" || status=1
    done
    exit "${status}"

# Build the app into packages/app/dist; needs VITE_DATA_URL, the URL of the data root
build: _node-modules
    cd packages/app && bun --bun vite build

# Start the Vite dev server of the app on APP_PORT (8000), with the data of PANX_DATA: a folder through the local data host on DATA_PORT (8001), or a URL
[script]
dev: _node-modules
    export VITE_DATA_URL="$(just _data-url)"
    host=127.0.0.1
    if [[ "${PANX_CONTAINER:-}" == 1 ]]; then host=0.0.0.0; fi
    if [[ -d "${PANX_DATA}" ]]; then
      bun packages/local-server/src/serve.ts --data-only &
      trap 'kill $!' EXIT
    fi
    cd packages/app
    bun --bun vite --host "${host}" --port "${APP_PORT:-8000}" --strictPort

# Build the app with the data of PANX_DATA, then serve it on APP_PORT (8000) and a data root folder on DATA_PORT (8001): the local equivalent of the deployed site
[script]
serve: _node-modules
    VITE_DATA_URL="$(just _data-url)" just build
    bun packages/local-server/src/serve.ts

# Check the data root of PANX_DATA against the data format: a folder gets every check, a URL the HTTP checks; `--help` lists the options and rules
verify-data *args: _node-modules
    bun packages/data-format/src/cli.ts "$@"

# Write the JSON Schema files of docs/schemas from the zod schemas of packages/data-format
schemas: _node-modules
    bun --bun packages/data-format/scripts/schemas.ts {{ schemas_dir }}

# Check that the JSON Schema files of docs/schemas equal fresh ones
schemas-check: _node-modules
    bun --bun packages/data-format/scripts/schemas.ts --check {{ schemas_dir }}

# Write .config/mise.lock for every platform after a change to .config/mise.toml; name tools to lock only those
tools-lock *tools:
    mise lock --platform linux-x64,linux-arm64,macos-x64,macos-arm64 "$@"

# Print the tracked and new bash scripts of dev/, NUL-separated
[private]
_shell-files:
    git ls-files -z --cached --others --exclude-standard -- dev | xargs -0r grep --null -lIE '^#!(/usr/bin/env bash|/bin/bash)' | LC_ALL=C sort -z

[private]
_node-modules:
    [[ -d node_modules ]] || { printf 'node_modules is missing: run `bun install` first\n' >&2; exit 1; }

# Print the data root URL of the app for PANX_DATA: the local data host for a folder, the URL itself for a URL
[private]
_data-url:
    if [[ -z "${PANX_DATA:-}" ]]; then printf 'PANX_DATA is not set: give a data root folder or URL\n' >&2; exit 1; fi
    if [[ "${PANX_DATA}" =~ ^https?:// ]]; then printf '%s\n' "${PANX_DATA%/}"; elif [[ -d "${PANX_DATA}" ]]; then printf 'http://127.0.0.1:%s\n' "${DATA_PORT:-8001}"; else printf 'PANX_DATA is neither an http(s) URL nor a folder: %s\n' "${PANX_DATA}" >&2; exit 1; fi
