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

# Run every check: formatting, lints, and types, keep-going
[script]
check: _node-modules
    status=0
    just fmt-check || status=1
    just lint || status=1
    just typecheck || status=1
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
