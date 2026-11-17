# panX data format

This document defines the data that the panX viewer reads: the layout of a data root, the files and their content, the HTTP behavior of the data host, the life of a release, and the encodings. It is the normative source of the format. The data build in the repository `neherlab/pan-genome-analysis` writes data by these rules; the viewer, the verifier, the local server, and the JSON Schema files of this repository implement them.

Goals of the format:

- **Few objects**: about 8 objects per dataset and 2 per release, in place of one object per cluster file, so a copy of all data costs cents in S3 requests
- **Small page loads**: the page of a dataset loads its tree, strains, and cluster table without the locus tags of all genes
- **One request per cluster**: a click on a cluster reads all files of that cluster with one HTTP range request
- **Immutable releases**: a release folder never changes after its upload; only `releases.json` changes
- **No app rebuild for new data**: the app finds the releases and datasets in the index files

## Terms

- **Data root**: the URL of the data host (`https://data.pangenome.org`), or locally a folder with the same content
- **Release**: one immutable folder of all datasets on the data host, named by the UTC time of its creation
- **Dataset**: one species, case study, or order of panX, with an id such as `Escherichia_coli`
- **Cluster**: a gene cluster of a dataset: one row of the cluster table, with its alignments and trees
- **Pack**: the file `gene_clusters.tar.gz` of a dataset, which holds the files of all its clusters
- **Bundle**: the files of one cluster, read from the pack with one HTTP range request
- **Member**: one gzip stream inside a file that holds several gzip streams one after another

## Layout of the data root

```
releases.json                                  # the only object that changes
<release>/index.json
<release>/manifest.json
<release>/<dataset>/dataset.json
<release>/<dataset>/clusters.json
<release>/<dataset>/loci.json
<release>/<dataset>/gene_clusters.tar.gz
<release>/<dataset>/core_gene_alignments.tar.gz
<release>/<dataset>/all_gene_alignments.tar.gz
<release>/<dataset>/strain_tree.nwk
<release>/<dataset>/metadata.tsv
```

- **Release id** `^\d{8}T\d{6}Z$`: the UTC time of the release's creation in ISO 8601 basic format, such as `20261112T080000Z`. The id needs no URL encoding, is a valid file name on every operating system (it has no `:`), sorts by time, and allows several releases per day
- **Dataset id** `^[A-Za-z][A-Za-z0-9_]*$`, unique in its release, and never equal to a page name of the app (`tutorial`, `pipeline`, `pathogens`, `index`), because the app shows a dataset at the path `/<dataset>`
- **Keys**: the URL path equals the data path. Keys use only ASCII letters, digits, `_`, `-`, `.`, and `/`, are case-sensitive, and need no URL encoding. No segment is empty, `.`, or `..`
- **S3 key**: `<host folder>/<data path>`, where the host folder is the folder of the data host in the hosting configuration
- **Size**: 8 objects per dataset plus 2 per release, so about 2,200 objects for 270 datasets. A release of the 2022 data holds about 13.5 GB: the packs about 8 GB, the alignment archives about 4.6 GB, and the rest well under 1 GB

## Object headers and bucket settings

| Object                                           | Content-Type                               | Content-Encoding | Cache-Control                         | Content-Disposition                                |
| ------------------------------------------------ | ------------------------------------------ | ---------------- | ------------------------------------- | -------------------------------------------------- |
| `releases.json`                                  | `application/json`                         | `gzip`           | `public, max-age=300`                 | none                                               |
| `<release>/*.json`, `<release>/<dataset>/*.json` | `application/json`                         | `gzip`           | `public, max-age=31536000, immutable` | none                                               |
| `strain_tree.nwk`                                | `text/plain; charset=utf-8`                | `gzip`           | `public, max-age=31536000, immutable` | `attachment; filename="<dataset>_strain_tree.nwk"` |
| `metadata.tsv`                                   | `text/tab-separated-values; charset=utf-8` | `gzip`           | `public, max-age=31536000, immutable` | `attachment; filename="<dataset>_metadata.tsv"`    |
| `*.tar.gz`                                       | `application/gzip`                         | none             | `public, max-age=31536000, immutable` | `attachment; filename="<dataset>_<name>.tar.gz"`   |

In the last row, `<name>` is the file name without `.tar.gz`, such as `Escherichia_coli_gene_clusters.tar.gz`.

- **Text objects** (JSON, Newick, TSV) are stored once, gzip-compressed (see [Encodings](#encodings)), with `Content-Encoding: gzip`. There are no pairs of a plain object and a `.gz` object, because each pair doubles the object count
- **`releases.json`** stays at most 5 minutes in the CDN and then at most 5 minutes in a browser, so a change reaches every visitor within 10 minutes without a cache invalidation
- **Archives** never carry `Content-Encoding`: on the pack it would make browsers decompress the whole object, and range reads would break
- **Storage class** `STANDARD`, because archive tiers need a restore before a read. The bucket default encryption is SSE-S3, which CloudFront reads through Origin Access Control without KMS permissions
- **No object tags and no user metadata** (`x-amz-meta-*`): the app and the checks read neither
- **Bucket**: a private REST origin read through Origin Access Control (no static website hosting), public access blocked, object ownership enforced, no bucket CORS configuration (CloudFront adds the CORS header, see [HTTP behavior](#http-behavior)), no versioning, and no lifecycle rule

## JSON files

The sections below define the JSON files of the data root. The JSON files inside the pack keep the shape of the pipeline output.

### `releases.json`

```json
{
  "default": "20261112T080000Z",
  "releases": [{ "id": "20261112T080000Z", "title": "panX data of 2022" }]
}
```

- `default` names a listed release: the release that the app shows when the URL has no `?release=`
- `releases` lists every live release, newest first
- `title` is for people who read the file; the app does not show it. The release id is the creation time, so the file has no separate time field

### `<release>/index.json`

```json
{
  "release": "20261112T080000Z",
  "categories": [
    { "id": "case_study", "label": "Case studies" },
    { "id": "refseq", "label": "Pan-genomes from RefSeq records" },
    { "id": "order", "label": "Orders" }
  ],
  "datasets": [
    {
      "id": "Escherichia_coli",
      "name": "Escherichia coli",
      "label": "Escherichia coli (500)",
      "category": "refseq",
      "source": "RefSeq",
      "strains": 500,
      "clusters": 28609
    }
  ]
}
```

- `release` is the id of the release folder that holds the file
- `categories` lists the dataset groups of the dataset dropdown with their labels, in display order. Category ids are unique
- `datasets` lists the datasets in display order. Each dataset's `category` names a listed category
- `label` is the text in the dataset dropdown: `Escherichia coli (500)`, or a title such as `Epidemiology of S. pneumoniae (Croucher et al)`
- `name` is the name in the species search and in the downloads table: the species for a pan-genome of RefSeq records, the dropdown text for a case study or an order
- `source` is the source column of the downloads table: `RefSeq`, or the study of a case study, such as `Croucher et al`
- `strains` and `clusters` equal the counts in the dataset's `dataset.json` and `clusters.json`
- The app shows exactly these groups, labels, and datasets

### `<release>/manifest.json`

```json
{
  "release": "20261112T080000Z",
  "build": {
    "repository": "https://github.com/neherlab/pan-genome-analysis",
    "commit": "<40 hex digits>",
    "uncommitted_changes": false,
    "python": "<version of the Python of the data build>",
    "zlib": "<zlib.ZLIB_RUNTIME_VERSION of that Python>",
    "snapshot": "<SHA-256 of the MD5SUMS file of the input snapshot>",
    "recipe": "<SHA-256 of the recipe file of the release>"
  },
  "objects": [
    {
      "path": "Escherichia_coli/clusters.json",
      "size": 1534221,
      "sha256": "<64 hex digits>",
      "contentType": "application/json",
      "contentEncoding": "gzip",
      "cacheControl": "public, max-age=31536000, immutable",
      "contentDisposition": null
    }
  ]
}
```

- `objects` lists every object of the release folder except `manifest.json` itself, with its path relative to the folder, the size and SHA-256 of the stored bytes, and the headers of [Object headers](#object-headers-and-bucket-settings) for that path. The publish command sets the S3 metadata from these headers
- `build` names the tool commit, the runtime, and the inputs that wrote the release, so a second build can reproduce the same bytes
- `repository` is always the constant `https://github.com/neherlab/pan-genome-analysis`, never the remote URL of the checkout, which differs between SSH and HTTPS clones

### `<release>/<dataset>/dataset.json`

The strain tree, the strains, the metadata columns, the extra cluster columns, and the accession links of a dataset:

```json
{
  "id": "Escherichia_coli",
  "strain_tree": {
    "name": "NODE_0000000",
    "branch_length": 0,
    "children": [
      { "name": "NC_000913", "branch_length": 0.0132 },
      { "name": "NC_002695", "branch_length": 0.002 }
    ]
  },
  "metadata": [
    { "key": "collection_date", "type": "continuous", "scale": "linear", "numbers": { "1922": 1922.5, "2013-01-01": 2013.0 } },
    { "key": "country", "type": "discrete" },
    { "key": "Ceftriaxone MIC (ug/mL)", "type": "continuous", "scale": "log2", "numbers": { ">2.00": 1.0, "<0.03": -5.06 } },
    { "key": "Sequence Type", "type": "text" }
  ],
  "strains": [
    {
      "accession": "NC_000913",
      "strain": "K-12 MG1655",
      "values": { "collection_date": "1922", "country": "USA", "Ceftriaxone MIC (ug/mL)": ">2.00", "Sequence Type": null }
    },
    {
      "accession": "NC_002695",
      "strain": null,
      "values": { "collection_date": "2013-01-01", "country": null, "Ceftriaxone MIC (ug/mL)": "<0.03", "Sequence Type": "ST11" }
    }
  ],
  "cluster_columns": [],
  "accession_url": "https://www.ncbi.nlm.nih.gov/nuccore/{accession}"
}
```

- **`id`** equals the name of the dataset folder
- **`strain_tree`**: inner nodes have `children` (at least one), tips have none. Node names are unique, every `branch_length` is at least 0, and the tip names equal the strain accessions one to one
- **Pre-order**: the pre-order walk of the strain tree (the root first, then the children in array order) defines the positions of the gain and loss patterns of the clusters (see [Entries of a cluster](#entries-of-a-cluster))
- **`metadata`** lists the columns of the metadata table after `accession` and `strain`, in display order. Keys are unique. The column header and the colour menu show the key
- **`strains`**: one entry per strain, with a unique `accession`. `strain` is a string, or `null` when the pipeline output names no strain; the metadata table shows a `null` strain as an empty cell. `values` holds every metadata key and no other key; every value is a string as reported, or `null` for unknown
- **Column types**:
  - `discrete`: a colour option with one colour per value
  - `continuous`: a colour option on a colour scale. `numbers` maps values of the column to finite numbers; every key of `numbers` is a value of that column, and a value without an entry colours as unknown. `scale` is `linear`, where the legend shows the numbers, or `log2`, where the legend shows `2^number`
  - `text`: shown in the table and the tooltips, and not a colour option
- **Numbers of a column**: the data build computes them, and the app parses no values. A date column, whose values are dates or ranges of two dates, maps each value to its decimal year: a full date to `year + (day of year - 1 + fraction of the day) / days in the year`, a year alone or a month alone to the middle of its interval (`1922` gives `1922.5`), and a range `<a>/<b>` to the midpoint of the numbers of `a` and `b`
- **`cluster_columns`** (`{ "key", "label", "group", "description" }`, all strings, with unique keys) adds columns to the cluster table after the column "Length", such as the antibiotic associations of a case study. Their values are in `extra` of each cluster in `clusters.json`
- **`accession_url`** is a URL template with `{accession}`, or `null` when the accessions have no public page (such as strain names or the sample ids of a study). The metadata table links accessions only when it is set

### `<release>/<dataset>/clusters.json`

The cluster table without locus tags, in descending strain count, the order of the pipeline output:

```json
{
  "clusters": [
    {
      "id": "40b985f8b06b58ba_refined",
      "kind": "protein",
      "strains": 500,
      "length": 522,
      "annotation": "shikimate_kinase_AroK",
      "gene": "aroK",
      "annotations": [["shikimate_kinase_AroK", 500]],
      "genes": [["aroK", 500]],
      "duplications": [],
      "events": 0,
      "diversity": 0.002,
      "range": [0, 2752],
      "extra": {}
    }
  ]
}
```

| Field                  | Meaning                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `id`                   | cluster id: ASCII letters, digits, `_`; unique in the dataset                                                        |
| `kind`                 | `protein`, or `rna` for a cluster without an amino-acid alignment                                                    |
| `strains`              | number of strains that have the gene, at least 1                                                                     |
| `length`               | mean gene length in nucleotides, an integer                                                                          |
| `annotation`, `gene`   | the most common annotation and gene name, or `null` when there is none                                               |
| `annotations`, `genes` | every annotation and gene name with its count, as `[name, count]`; the name is `null` for genes without one          |
| `duplications`         | `[accession, copies]` for each strain with more than one copy (`copies` at least 2); empty when every strain has one |
| `events`               | number of gain and loss events, an integer                                                                           |
| `diversity`            | nucleotide diversity, or `null` when the pipeline gave none                                                          |
| `range`                | inclusive byte range `[first, last]` of the cluster's member in `gene_clusters.tar.gz`                               |
| `extra`                | values of the `cluster_columns` keys of `dataset.json`, exactly those keys: a number, a string, or `null`            |

The ranges follow the order of the clusters: the first starts at byte 0, and each next one starts at the previous `last + 1`.

### `<release>/<dataset>/loci.json`

```json
{ "loci": ["NC_000913|b0001 NC_002695|ECs0001"] }
```

`loci[i]` holds the genes of `clusters[i]` as `<accession>|<locus_tag>`, the record identifiers of that cluster's full nucleotide alignment (the FASTA headers without the free text after them), in record order and joined by single spaces. `loci` has one string per cluster.

- **Separate file**: the locus tags make up most of the bytes of a cluster table, so the page draws from `clusters.json` first and loads this file after it, for the search of the cluster table
- **One string per cluster**: a dataset of 500 strains has about 2.4 million genes in 29,000 clusters. A list of separate strings costs the browser hundreds of milliseconds to parse, check, and join on every page, and one string per cluster costs tens of milliseconds and is the text that the search reads

## The pack `gene_clusters.tar.gz`

The pack is a normal `.tar.gz` for every tool, made of one gzip member per cluster, so the bytes of one cluster's `range` alone form a complete `.tar.gz`:

```sh
curl -r <first>-<last> <url> | tar -xzf -
```

- **Members**: member `i` holds the tar entries of `clusters[i]` and nothing else. After the last cluster comes one member with the tar end marker: at least 1,024 zero bytes. Every member is a complete gzip stream (header, deflate data, CRC32, size)
- **Ranges**: the first member starts at byte 0, each next member at the previous `last + 1`, and the end member follows the last cluster. The file has no other bytes
- **Gzip**: the fixed header and the deflate settings of [Encodings](#encodings)
- **Tar**: ustar format only (no PAX or GNU headers), regular files only (type `0`, no directory entries), mode `0644`, uid and gid 0, empty user and group names, and the modification time of the input file. A path over 100 bytes goes through the ustar `prefix` field; paths over 255 bytes are not allowed
- **End marker**: the tar end marker appears only in the last member, because gzip readers read the members as one stream, so a zero block in the middle would end the archive there for tools without `--ignore-zeros`. GNU tar and Python's `tarfile` read the pack as one archive

### Entries of a cluster

The entries are plain UTF-8 text under `<dataset>/geneCluster/`, in this order:

| Entry                    | Present                                    |
| ------------------------ | ------------------------------------------ |
| `<id>_aa_aln.fa`         | `protein` clusters only                    |
| `<id>_aa_aln_reduced.fa` | `protein` clusters only                    |
| `<id>_na_aln.fa`         | always                                     |
| `<id>_na_aln_reduced.fa` | always                                     |
| `<id>_tree.json`         | when the pipeline made a gene tree         |
| `<id>.nwk`               | when the pipeline wrote a Newick gene tree |
| `<id>_patterns.json`     | always                                     |

`_tree.json` and `.nwk` are independent of each other.

- **FASTA headers** are `<accession>|<locus_tag>`, optionally followed by a space and free text. Every accession names a strain of the dataset
- **Reduced alignments** hold an optional first record `>consensus`, then exactly the records of the full alignment, in any order. In those records `.` marks a position equal to the consensus
- **`_tree.json`**: each node has `name` and `branch_length` (a number). Inner nodes have `children` (at least one), tips have `accession`, the accession of a strain of the dataset. Nodes may have `muts` and `aa_muts` (comma-separated mutations such as `A23T,C56T`, possibly empty), and tips may have `annotation`
- **`_patterns.json`** is `{"patterns": "<string>"}` with one character per non-root node of the strain tree, in pre-order: `3` gene present, `0` absent, `1` gained on the branch to this node, `2` lost on it

## Other downloads

The two alignment archives are each a regular tar.gz in one gzip stream, with the tar and gzip rules of the pack:

- **`core_gene_alignments.tar.gz`**: `core_genes/<id>_aa_aln.fa` and `core_genes/<id>_na_aln.fa` for every `protein` cluster whose `strains` equals the dataset's strain count and that has no `duplications` (single-copy genes of every strain)
- **`all_gene_alignments.tar.gz`**: `all_genes/<id>_aa_aln.fa` and `all_genes/<id>_na_aln.fa` for every `protein` cluster
- RNA clusters are in neither archive. The files are byte-equal to the full alignments in the pack
- Windows 11 File Explorer (since October 2023), macOS, Linux, and Python open the archives; Windows 10 needs `tar -xzf` in a terminal or 7-Zip

The text downloads:

- **`strain_tree.nwk`** is the pipeline's strain tree
- **`metadata.tsv`** has a header row with `accession`, `strain`, and then the metadata keys in `metadata` order, and one row per strain in `strains` order. Unknown values and a `null` strain are empty fields. Fields follow the quoting rule of [Encodings](#encodings)

## HTTP behavior

The app relies on this behavior of the data host. The table names the part of the hosting setup that sends each header:

| Header or behavior                                                                                                      | Set by                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Content-Type`, `Content-Encoding`, `Cache-Control`, `Content-Disposition`                                              | S3 object metadata, written at upload from the manifest                                                                                                                                                  |
| `Content-Length`, `ETag`, `Last-Modified`, `Accept-Ranges: bytes`, `Content-Range` on 206                               | S3                                                                                                                                                                                                       |
| `Access-Control-Allow-Origin: *`                                                                                        | only the managed CloudFront response headers policy `Managed-CORS-With-Preflight`, on answers to requests with an `Origin` header; the header profile of the data host sets no `access-control-*` header |
| `Strict-Transport-Security`, `X-Content-Type-Options`, `Content-Security-Policy: default-src 'none'`, `X-Frame-Options` | the viewer-response CloudFront Function, header profile `data`                                                                                                                                           |
| `robots.txt` that lets crawlers read the JSON files and nothing else                                                    | the object `robots.txt` that the infrastructure stores in the data folder                                                                                                                                |
| Cache key and TTL                                                                                                       | the managed cache policy `CachingOptimized`                                                                                                                                                              |

- **Requests of the app**: `GET` with no query string, no credentials, and no request header of its own except one `Range` header with a single range
- **No CORS preflight**: Chrome and Edge 107, Firefox 117, and Safari 16.4 or newer send such a request without preflight, because the form `bytes=<first>-<last>` is a CORS-safelisted `Range` header; a suffix range or several ranges cause a preflight. So the data host needs no `OPTIONS` answer. Older browsers send a preflight and cannot read clusters: the distribution allows only `GET` and `HEAD`, and the managed policy has no `Access-Control-Allow-Headers`. These browser versions are also the first with `DecompressionStream("gzip")`, which the app uses to decompress a bundle
- **CORS after the cache**: the CORS header comes from CloudFront after the cache, so one cache entry serves every origin. The bucket needs no CORS configuration, because CloudFront's requests to S3 carry no `Origin`
- **Range reads**: a pack answers `Range: bytes=<first>-<last>` with 206 and exactly those bytes. CloudFront serves a cached range or the cached object, and on a miss asks S3, sometimes for a larger range, and caches the answer. A malformed range header (several ranges out of order or overlapping, a negative value) gets 200 with the whole object, and a range that starts beyond the end gets 416. So the app accepts only 206, checks that the body has `last - first + 1` bytes, and cancels every other body. It cannot read `Content-Range`, because the answers carry no `Access-Control-Expose-Headers`
- **Text objects** answer with their stored gzip bytes and `Content-Encoding: gzip`, also to a request without `Accept-Encoding`, which RFC 9110 allows. Browsers decompress them; `curl` needs `--compressed`. CloudFront never compresses again: it skips every answer that has `Content-Encoding`, `application/gzip` is not on its list of compressible types, and the distribution has compression off
- **Missing paths** answer 404: S3 answers 403 to Origin Access Control requests for missing keys, and the distribution turns 403 and 404 into a 404 with its HTML error page. The app checks the status before it parses
- **No redirects** for data paths

## Publication of a release

The steps, in this order:

1. **Upload** every object of the new release folder, then its `manifest.json`
2. **Check**: the verifier on the local data root that was uploaded (every check), then the verifier on the deployed URL with `--release <id>` (the HTTP checks). The folder is not listed yet, and `--release` checks it all the same
3. **List**: add the release to `releases.json` and keep `default` as it is. The release now opens with `?release=<id>`
4. **Promote**: set `default` to the release once it is accepted. Every visitor gets the new `releases.json` within 10 minutes, so no cache invalidation is needed

Rules:

- **First release**: a data host without `releases.json` gets it in one write after step 2 and the acceptance of the release: the release is its only entry and its `default` (steps 3 and 4 in one). The write uses S3 `If-None-Match: *`, so it fails when the object exists
- **One writer**: the publish command is the only writer of `releases.json`. Every later write (list, promote, rollback, removal) reads the object and writes it with S3 `If-Match` on the ETag that it read, so a second publish that runs at the same time fails instead of dropping a release from the list
- **Write once**: every path in a release folder is written once. A changed file needs a new release; the publish command refuses to replace an object whose bytes differ from the manifest
- **Several live releases**: a rollback writes `releases.json` with the earlier `default`
- **Removal**: first take the release out of `releases.json`, then keep its folder for at least 30 days, so open pages and cached copies of `releases.json` keep working for that time. Later, a page or a link with `?release=` of a removed release shows the not-found page or a load error with a reload link

## Encodings

- **JSON**: UTF-8 without BOM, compact (no indentation), finite numbers only (`null` for missing values), integers as JSON integers, dates as `YYYY-MM-DD`, and times as UTC ISO 8601 with `Z`
- **Gzip** of every stored text object and of every pack member: the fixed 10-byte header `1f 8b 08 00 00 00 00 00 02 ff` (no flags, so no file name, extra field, or comment; mtime 0; XFL 2; OS 255, unknown), then raw deflate of zlib at level 9 with window bits 15, memory level 8, and the default strategy, then the CRC32 and the size. The build writes the header and the trailer itself, because Python's `gzip.compress` writes another OS byte in other Python versions. So the same content compressed with the same zlib build gives the same bytes and the same SHA-256. Other zlib builds (such as zlib-ng, which some Linux distributions ship) give other deflate bytes, so the data build pins its Python and zlib and checks the zlib version
- **One member per text object**: a stored text object is one gzip member, because some HTTP clients decode only the first member of a `Content-Encoding: gzip` body (curl did until 2025)
- **FASTA and Newick** have LF line ends
- **TSV** has LF line ends and tab separators. A field that holds a tab, a line break, or `"` is written in double quotes, with each `"` doubled (a value `LLII<tab>III` becomes `"LLII<tab>III"`); every other field is written as it is

## What makes a deployment valid

The verifier of this repository (`just verify-data`) checks all of these rules.

Files and releases:

- Every JSON file passes its schema
- `releases.json` names only existing release folders
- `index.json` and `manifest.json` name the release of their folder
- Every dataset of `index.json` has its folder with all 8 files, and every `category` is listed in `categories`
- The default release has every dataset that the home page of the app links to

Per dataset:

- The `id` of `dataset.json` equals its folder name
- `strains` and `clusters` of its `index.json` entry equal the counts in `dataset.json` and `clusters.json`
- The strain-tree tips equal the strains, and so do the tips of `strain_tree.nwk`
- `metadata.tsv` equals the rendering of `strains` by the rule of [Other downloads](#other-downloads)
- `values` has every metadata key, with a string or `null`
- Every key of a column's `numbers` is a value of that column and maps to a finite number
- `extra` has exactly the `cluster_columns` keys
- `loci` has the length of `clusters`
- Every `_patterns.json` has the length of the strain tree's non-root node count

Per cluster:

- Every gene-tree tip `accession` and the accession of every FASTA record except `consensus` name a strain of the dataset
- A reduced alignment holds, after an optional first `consensus` record, exactly the record identifiers of its full alignment, in any order
- `loci[i]`, split at its spaces, equals the record identifiers (`<accession>|<locus_tag>`) of the full nucleotide alignment of `clusters[i]`, in record order

Archives and objects:

- **Pack**: the ranges follow [the pack rules](#the-pack-gene_clusterstargz) (start at 0, no gaps, end member last, nothing after it). Each member decompresses to ustar entries with exactly the names and order of [Entries of a cluster](#entries-of-a-cluster) for its cluster id and kind, with no zero block before the last member
- **Alignment archives** hold exactly the files of [Other downloads](#other-downloads), byte-equal to the full alignments of the pack
- Every stored text object is one gzip member
- Every stored text object, every member of the pack, and each alignment archive starts with the fixed gzip header of [Encodings](#encodings), and each alignment archive is one gzip stream
- Every tar entry of the pack and of the alignment archives has mode `0644`, uid and gid 0, and empty user and group names
- `manifest.json` lists exactly the files of the folder, with their size, SHA-256, and the headers of their path

A deployed data root, in addition:

- Every manifest object answers `HEAD` with its headers, a `Content-Length` equal to its manifest size, and, for a request with an `Origin` header, `Access-Control-Allow-Origin: *`
- Range reads of the first and the last cluster of each pack (one read when it has one cluster) answer 206 with the bundles of those clusters
- A path that does not exist answers 4xx

## Code and JSON Schema files

- **`packages/data-format`** implements this format in TypeScript for browsers and Bun: the zod schemas and types of the JSON files, the data paths, the object headers as data, the ustar reader, and the bundle reader of the pack. The zod schemas also check the rules inside one file that JSON Schema cannot express: unique ids, keys, and names; a `default` release that is listed and releases newest first; listed categories; strain-tree tips equal to the strains; `values` with exactly the metadata keys; `numbers` keys that are values of their column; contiguous cluster ranges from byte 0; and gene-tree nodes with either children or an accession
- **`docs/schemas/<file>.schema.json`** (JSON Schema draft 2020-12) are generated from the zod schemas with `just schemas`, for checks outside this repository: `releases`, `index`, `manifest`, `dataset`, `clusters`, `loci`, `tree` (`<id>_tree.json`), and `patterns` (`<id>_patterns.json`). They cover the structure of one file. The rules across files, the archives, and the HTTP behavior are in this document, and `just check` fails when the committed files differ from fresh ones
