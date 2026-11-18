# Deployment

panX runs on two hosts, both CloudFront distributions of the lab's site module in the AWS account `org-pangenome`:

- **App host** `pangenome.org`: the static build of `packages/app`, in the app bucket under the key prefix `pangenome.org/`. The edge serves `index.html` for every path whose last segment has no `.`, and a `.br` or `.gz` copy of every file whose name does not end in an archive extension, by the `Accept-Encoding` of the request
- **Data host** `data.pangenome.org`: the releases of the data format ([data-format.md](data-format.md)), in the data bucket. The data repository `neherlab/pan-genome-analysis` builds and publishes them; [Publication of a release](data-format.md#publication-of-a-release) gives its steps

The app reads its data host from `VITE_DATA_URL` at build time and finds the releases and datasets in the index files, so new data needs no app rebuild.

## App publish

`just publish` (`packages/app/scripts/publish.ts`) uploads the build of `packages/app/dist/` to the app bucket:

1. the static folder `static-<build id>/` of the build, whose file names carry content hashes, with `Cache-Control: public, max-age=31536000, immutable`
2. the other files: `images/` and `fonts/` with `public, max-age=86400`
3. the pages `index.html` and `404.html` with `public, max-age=0, must-revalidate`

Each step starts after the step before it has finished, so a page never refers to a file that is not stored yet. The `Cache-Control` of each file comes from `appCacheControl` in `packages/local-server/src/app-site.ts`, which the local app host also sends. The content type of each file is the one that Bun gives its extension, as the local app host sends it.

- **Compressed copies**: the edge requests a `.br` or `.gz` copy of every path that does not end in `.7z`, `.br`, `.bz2`, `.gz`, `.lz`, `.lz4`, `.lzma`, `.lzo`, `.sz`, `.xz`, `.zip`, or `.zst`, and it does not check that the copy exists. So every other file also gets a `.br` copy (Brotli quality 11) and a `.gz` copy (gzip level 9), with the content type of the file and `Content-Encoding: br` or `gzip`. The script stops before the first upload when a file lacks one of its copies
- **Earlier builds stay**: the script deletes no object, so a page that a browser or the CDN still holds keeps loading its own static folder
- **No cache clear**: the pages revalidate on every request, so a publish needs no invalidation, and the preview role, which may not create one, publishes the same way
- **Refusals**: the script stops when `dist/` has no `index.html`, or when `AWS_S3_PREFIX` starts with `/` or does not end with `/`

Environment:

| Variable        | Value                                                                           |
| --------------- | ------------------------------------------------------------------------------- |
| `AWS_S3_BUCKET` | the app bucket                                                                  |
| `AWS_S3_PREFIX` | the key prefix of the host, such as `pangenome.org/`; empty for the bucket root |
| `AWS_REGION`    | `eu-central-1`; with the credentials of the AWS SDK's default chain             |

`just publish --dry-run` prints each write to stdout (key, size, content type, content encoding, `Cache-Control`), in upload order, and sends no request, so it needs no credentials:

```bash
VITE_DATA_URL=https://data.pangenome.org dev/docker/run just build
AWS_S3_BUCKET=<app bucket> AWS_S3_PREFIX=pangenome.org/ dev/docker/run just publish --dry-run
```

## CI job `publish`

The job `publish` of `.github/workflows/ci.yml` runs after the job `check` on every push to `release` and `master`:

- **Target**: `release` publishes the site `pangenome.org` with the role, bucket, and prefix of the variables `*_RELEASE`; `master` publishes its preview with the variables `*_MASTER`. A missing variable fails the job
- **Build**: `VITE_DATA_URL=https://data.pangenome.org`, and on `release` also `VITE_PLAUSIBLE_DOMAIN=pangenome.org`, which adds the analytics tag
- **Credentials**: `aws-actions/configure-aws-credentials` assumes the deploy role of the branch with the job's OIDC token (`id-token: write`) in `eu-central-1`; the repository has no AWS keys
- **Order**: each branch has one concurrency group without cancellation, so a running publish always finishes and two publishes never overlap. GitHub starts the waiting jobs of a group in no fixed order, and a newer waiting job replaces an older one, so the first step compares the job's commit with the current head of its branch and ends the job without a write when they differ. An older build therefore never replaces the pages of a newer one

## Repository settings

A repository administrator makes these settings on GitHub; no workflow changes them:

1. **Immutable OIDC subject claims**: turn on the immutable subject claims in the OIDC settings of GitHub Actions of the repository or the organization, before the trust policies of the deploy roles are written. The deploy roles of the site module trust subjects with the immutable owner and repository ids, such as `repo:neherlab@<owner id>/pan-genome-visualization@<repository id>:ref:refs/heads/release`
2. **Repository variables** (Settings, Secrets and variables, Actions, Variables), from the outputs `deploy_role_arns` and `site_bucket` of the infrastructure roots `tofu/org-pangenome/site` (`release`) and `tofu/click-neherlab/site` (`master`):

   | Variable                | Value                                                                |
   | ----------------------- | -------------------------------------------------------------------- |
   | `AWS_ROLE_ARN_RELEASE`  | the ARN of the deploy role `release` of `tofu/org-pangenome/site`    |
   | `AWS_S3_BUCKET_RELEASE` | the site bucket of `tofu/org-pangenome/site`                         |
   | `AWS_S3_PREFIX_RELEASE` | `pangenome.org/`                                                     |
   | `AWS_ROLE_ARN_MASTER`   | the ARN of the deploy role of `master` of `tofu/click-neherlab/site` |
   | `AWS_S3_BUCKET_MASTER`  | the site bucket of `tofu/click-neherlab/site`                        |
   | `AWS_S3_PREFIX_MASTER`  | the folder of the preview host of `master`, with a trailing `/`      |

3. **Old secrets**: after the first good publish of both branches, delete the secrets `RELEASE_*` and `MASTER_*` of the earlier deployment

## Switch to the new hosts

The switch of `pangenome.org` to the new distribution goes in this order:

1. The infrastructure maintainer applies the data bucket root, then the site root with the host `data.pangenome.org`, records its `distribution_domain_name` in `site.json`, applies the zone root, which then creates the record of `data.pangenome.org`, and applies the preview host settings of `tofu/click-neherlab/site`
2. The data repository publishes the first release: the upload, the checks of [Publication of a release](data-format.md#publication-of-a-release), then the one write that creates `releases.json`. Then `just verify-data` passes with `PANX_DATA=https://data.pangenome.org`
3. The job `publish` publishes the preview of `master`; the browser checks of [development.md](development.md#after-a-deployment) run there
4. The job `publish` publishes `release` to `pangenome.org/`; it is checked at `https://next.pangenome.org`
5. The infrastructure moves the host `pangenome.org` to the new distribution by its move plan

The old distributions, the host `data.master.pangenome.org`, and the old buckets stay unchanged until the infrastructure maintainer retires them.
