# Development

panX is a Bun workspace: the viewer in `packages/app`, the data format in `packages/data-format`, and the local hosts in `packages/local-server`. The `justfile` holds every command; `just` lists them. The format of the data that the viewer reads is in [data-format.md](data-format.md).

## Layout

```
.config/              mise.toml and mise.lock: the pinned tools
dev/docker/           the development container and its runner, dev/docker/run
justfile              every command
patches/              patches of dependencies (bun patch)
packages/
  data-format/        schemas, data paths, object headers, and pack readers of the data format
  local-server/       the local app host and data host
  app/
    index.html        the page shell, which serves every page path
    404.html          the error page of the hosts
    vite.config.ts    the build
    public/           images/ and fonts/, copied into the build unchanged
    src/
      main.js         the page dispatch
      pages/          the page parts, their modules, stylesheet sets, and linked-datasets.json
      shell/          the navigation bar and footer of index.html and 404.html
      data/           loading of the index and dataset files
      js/             the viewer modules
      vendor/         vendored scripts and phyloTree
      styles/         the stylesheets of the viewer
    dist/             the build output, not in git
```

## Setup

Two ways run the same pinned tools:

- **mise** on the host: `mise trust .config/mise.toml`, `mise install`, then `bun install --frozen-lockfile`
- **the development container**: `dev/docker/run <command>` builds the image on first use and runs the command in it as your user, with the checkout mounted at its own path. With no command it starts a shell

Run every command that executes repository code in the container, such as `dev/docker/run just check`: the build, the servers, the scripts, and `just check`, which runs the JSON Schema script. The container gets `PANX_DATA`, `APP_PORT`, `DATA_PORT`, `VITE_*`, and `AWS_*` from your environment, mounts the folder of `PANX_DATA` read-only, and publishes the ports of `DEV_PUBLISH` on `127.0.0.1` of the host.

## Data

`PANX_DATA` names the data root that the app reads:

- a folder with the content of a data root, the folder that holds `releases.json`: the local data host serves it on `http://127.0.0.1:8001`
- the URL of a deployed data host, such as `https://data.pangenome.org`: the app reads it directly, and no local data host starts

The build takes the data root from `VITE_DATA_URL` and fails without it. `just dev` and `just serve` set it from `PANX_DATA`; `just build` needs it set.

## Commands

| Command            | What it does                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `just dev`         | the Vite dev server of the app on port 8000, with the data of `PANX_DATA`; for a folder also the local data host on port 8001             |
| `just serve`       | a production build with the data of `PANX_DATA`, then the local app host on port 8000 and, for a folder, the local data host on port 8001 |
| `just build`       | a production build into `packages/app/dist/`; needs `VITE_DATA_URL`, and takes `VITE_PLAUSIBLE_DOMAIN` for the analytics tag              |
| `just verify-data` | check the data root of `PANX_DATA` against the data format                                                                                |
| `just schemas`     | write the JSON Schema files of `docs/schemas/` from the schemas of `packages/data-format`                                                 |
| `just check`       | the format check, the lints, the type check, and the check that the JSON Schema files are current                                         |
| `just fmt`         | format the TypeScript, the root files, the shell scripts, and the justfile                                                                |
| `just publish`     | upload a build to the app bucket                                                                                                          |
| `just tools-lock`  | write `.config/mise.lock` after a change of `.config/mise.toml`                                                                           |

Examples:

```bash
dev/docker/run just check
PANX_DATA=/data/panx/data.pangenome.org DEV_PUBLISH=8000,8001 dev/docker/run just serve
PANX_DATA=https://data.pangenome.org DEV_PUBLISH=8000 dev/docker/run just dev
VITE_DATA_URL=https://data.pangenome.org dev/docker/run just build
```

`APP_PORT` and `DATA_PORT` change the ports. The servers listen on `127.0.0.1` on the host, and on `0.0.0.0` in the container, so that the ports that `DEV_PUBLISH` publishes reach them; `HOST` overrides the address. Both servers log one line per request to stderr.

## The build

`packages/app/vite.config.ts` builds two pages: `index.html`, which serves every page path, and `404.html`, the error page of the hosts. Scripts and stylesheets go into `static-<build id>/`, where the build id is a hash of the build inputs and the `VITE_*` values, so the same inputs give the same folder. The build targets the browser floor of the data format: Chrome and Edge 107, Firefox 117, Safari 16.4.

`main.js` picks the page from the path: `/` home, `/tutorial`, `/pipeline`, `/pathogens`, `/<dataset id>` a dataset, and every other path the not-found part. It loads `releases.json` and the `index.json` of the shown release when the page needs them, imports the page module, which resolves after the module's stylesheets have loaded, inserts the page part before the footer, and only then shows the body. The query parameter `release` picks a listed release; the default release of `releases.json` is shown without it.

The viewer libraries keep their major lines of the old site: d3 3, dc 2, crossfilter 1, DataTables 1, jQuery 3, Bootstrap 3. Two of them need patches to run as ES modules, in `patches/`: d3 calls its wrapper with `globalThis` as `this`, and svg-pan-zoom passes its interval in place of a top-level `this`. `src/js/libs.js` loads jQuery before the jQuery plugins, which read the global jQuery when they load; every page module imports it first.

## Local hosts

`packages/local-server` copies the deployed hosts, so the app works locally as it does on CloudFront:

- the app host serves `index.html` for every path whose last segment has no `.`, each file with the `Cache-Control` of its folder (`packages/local-server/src/app-site.ts`), every answer with the Content-Security-Policy of the site, and a missing file with status 404 and `404.html`
- the data host serves the object headers of `packages/data-format/src/headers.ts`, `Access-Control-Allow-Origin: *`, single byte ranges as S3 answers them, and no compression of its own
- both hosts serve only paths that follow the key rules of the data format inside their folder, and answer 403 to methods other than `GET` and `HEAD`, as CloudFront does, so a CORS preflight fails locally too. Any website can send requests to `127.0.0.1` and read the answers of the data host, so no path resolves outside the served folder

## Manual checks

This repository has no automated tests. Each change is checked by hand, the app in a real browser against `just serve` with real data, compared with https://pangenome.org where the change keeps the behavior. Scratch data roots go under `tmp/` and are deleted afterwards.

### Data for the checks

The local release of the data build serves the browser checks. Checks that need changed data, such as a broken file or a second release, use a scratch data root with one small dataset, written with `just release-build --dataset Candidatus_Portiera --out <scratch folder>` of the data repository.

### Local hosts

With `just serve` running, `curl` shows:

- 206 with `Content-Range` for `Range: bytes=0-99` on a `gene_clusters.tar.gz`
- 206 with the bytes up to the end for a range that ends past the end of the file
- 416 with `Content-Range: bytes */<size>` for a range that starts beyond the end
- 200 with the whole file for a request with several ranges
- the headers of `headers.ts` for `releases.json`, an `index.json`, a `dataset.json`, a `strain_tree.nwk`, a `metadata.tsv`, and a pack; `Access-Control-Allow-Origin: *` on every data answer
- `index.html` for `/`, `/tutorial`, `/Escherichia_coli`, and `/Escherichia_coli/`; 404 with `404.html` for a missing file such as `/missing.js`
- 404 for `/..%2f..%2fetc%2fpasswd`, `/a//b`, `/a%20b`, and other paths outside the key rules; 403 for `OPTIONS` and `POST`

```bash
curl -sD - -o /dev/null -H 'Range: bytes=0-99' http://127.0.0.1:8001/<release>/<dataset>/gene_clusters.tar.gz
curl -s --compressed http://127.0.0.1:8001/releases.json
curl -sD - -o /dev/null --path-as-is 'http://127.0.0.1:8000/..%2f..%2fetc%2fpasswd'
curl -sD - -o /dev/null -X OPTIONS http://127.0.0.1:8001/releases.json
```

### Data format

- the verifier passes on the local release; `--release` checks a release folder that `releases.json` does not list yet
- on scratch copies with one broken rule each, it reports exactly that rule
- GNU `tar -tvzf` and Python `tarfile` list every entry of a real pack, and the bytes of one cluster `range` (cut with `tail -c` and `head -c`) extract with `tar -xzf -` to exactly that cluster's files

### Pages

In Chromium, against `just serve` with the local release:

- every page paints only with its styles, and the console shows no error while d3, dc, DataTables, and the jQuery plugins load
- page dispatch and titles for `/`, `/index.html`, `/tutorial`, `/pipeline`, `/pathogens`, `/Escherichia_coli`, `/Escherichia_coli/`, `/compare`, and an unknown id; `?release=unknown` shows the not-found page, and a listed second release opens with `?release=<id>`
- the home page: the dataset dropdown, the species search, and the downloads table with every dataset of `index.json`
- the dataset pages: the cluster table, the charts, the strain tree, and the metadata table behave as on the live site (sorting, expandable rows, column order, column menu); a click on a cluster shows its alignment and gene tree after exactly one range request; the download buttons save the cluster files
- bundle errors: on scratch data roots with one fault each (a shifted range, a member without one of its entries or with an extra entry, a range past the end of the pack), a click shows the error with the cluster id in the alignment panel

### After a deployment

- `just verify-data` with `PANX_DATA=https://data.pangenome.org`
- the page checks on the preview site, and a smoke test in Firefox 117 or newer and Safari 16.4 or newer
- one extraction of a pack with bsdtar, macOS Archive Utility, or Windows 11 File Explorer
