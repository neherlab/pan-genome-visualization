# Pan-genome analysis and visualization

> NOTE: The project is currently undergoing a complete rewrite.
>
> The `master` branch currently contains the legacy application written in vanilla JavaScript sometimes in 2015. It uses some very old libraries and techniques. And this is what you currently see on [pangenome.org](https://pangenome.org). It might be tricky to run. We tried to summarize how to run the application in the sections below.
>
> The new application will probably work differently, and once the implementation is completed, when it's moved to the `master` branch, it will likely break your current setup. So make sure you remember the git commit hash you are currently using, just in case you want to go back to it. The rewrite currently has low-to-medium priority compared to our other projects, so it might take a while to finish. You can track the progress in https://github.com/neherlab/pan-genome-visualization/pull/13


Even closely related bacterial genomes can differ in the presence of hundreds of genes and individual genes can be horizontally acquired from distant strains and species.
This mix of inheritance patterns complicates phylogenetic analysis of bacteria.

Although several software packages are available for pan-genome analysis, yet visualization, interpretation and exploration of pan-genomes remains challenging.
**panX
** (Pan-genome Analysis and Exploration) aims at facilitating pan-genome research with an easy-to-use and interactive platform for analyzing and exploring pan-genomic data.

panX displays the pan-genome using interconnected visual components including gene cluster table, multiple alignment, comparative phylogenetic tree viewers and strain metadata table. The pan-genome data structures are prepared by our [pan-genome-analysis](https://github.com/neherlab/pan-genome-analysis) analysis pipeline, which efficiently identifies orthologous clusters from large sets of genome sequences and pre-computes alignments, trees, and plenty of informative statistics.
**panX is available at [pangenome.org](https://pangenome.org)**

## Pipeline overview

![panX](/panX-pipeline.png)

panX analysis pipeline is based on DIAMOND, MCL and post-processing to determine clusters of orthologous genes from a collection of annotated genomes.
panX generates a strain/species tree based on core genome SNPs and a gene tree for each gene cluster.

**panX interactive visualization
**: (1) The dynamic pan-genome statistical charts allow rapid filtering and selection of gene subsets in cluster table;

clicking a gene cluster in cluster table loads (2) related alignment, (3) individual gene tree and (4) gene presence/absence and gain/loss pattern on strain/species tree;

(5) Selecting sequences in alignment highlights associated strains on strain/species tree;

(6) (7) Strain/species tree interacts with gene tree in various ways;

(8) Zooming into a clade on strain/species tree screens strains in metadata table;

(9) Searching in metadata table display strains pertinent to specific meta-information.

## Running locally with the default data

Steps:

- Install Node.js <= 10

  > Note, Node.js versions 11 and above are not supported due to legacy packages used in the implementation. Installing from the package manager of the operating system is discouraged. We recommend to install Node.js either with a direct download from the official website [[1](https://nodejs.org/en/download/)], [[2](https://nodejs.org/dist/)], or by using [nvm](https://github.com/nvm-sh/nvm) or [nvm-windows](https://github.com/coreybutler/nvm-windows). Don't forget to add the `bin` directory of the Node.js distribution to your `$PATH`.

  After installation is done, verify the correctness of the installation by printing versions:

   ```bash
   node --version
   # output: v10.x.y
   
   npm --version
   # output: 6.x.y
   ````

- Clone the repository and initialize submodules

   ```bash
   git clone https://github.com/neherlab/pan-genome-visualization
   cd pan-genome-visualization
   git submodule update --init
   ```

- Configure the build environment configuration, by copying the example configuration:

   ```bash
   cp .env.example .env
   ```

  The file `.env` should now contain some of the variables that control the build and behavior of the application.

- Install Node.js dependencies (they will appear in the directory `node_modules/`)

   ```bash
   npm install
   ```

- Build the application

   ```bash
   npm run build
   ```

  If you are receiving the error

  ```
  ReferenceError: primordials is not defined
  ```

  then you are likely running Node.js version that is incompatible with the old packages the application is using. Try to install Node.js version 10 or below.

- Start the local server:

   ```bash
   npm run start
   ```

  This will start a local web server on port `8000`

- Navigate to http://localhost:8000 in your browser

## Running locally with your own data

By default, the web app fetches data from `https://data.master.pangenome.org`. The data on this address is served by a separate web server, maintained by project developers. In this section we describe how to run the app with your own data instead.

This section assumes that you can already run the app with the default data, as described in the previous section.

#### Overview of steps

If you want to run the app with your own data, you need to perform the following steps:

1. Index the data: create an `index.json` file. The `index.json` allows the web app to discover the list of pathogens available in the data and to generate a page for each pathogen.

2. Serve the data: Run your own web server to serve the data. This could be a separate local HTTP server (e.g. with Node.js `serve` package, python's `http.server` etc.), or a remote file server. You need to know an IP address and port of this sever. CORS should be enabled on your server.

3. Configure the app: Set `DATA_ROOT_URL` variable in the `.env` file to the IP address and port of your data sever.

4. Rebuild and run the app


#### Step 1: Index the data

Gather your data, using the following directory structure:

 ```bash
 pangenome-data/
 ├── dataset/
 │   ├── Escherichia_coli/
 │   │   ├── all_gene_alignments.zip
 │   │   ├── allclusters_final.tsv
 │   │   ├── coreGenomeTree.json
 │   │   ├── core_gene_alignments.zip
 │   │   ├── geneCluster/
 │   │   │   ├── 001316641f4c392d_refined.nwk
 │   │   │   ├── 001316641f4c392d_refined_aa_aln.fa
 │   │   │   ├── 001316641f4c392d_refined_aa_aln_reduced.fa
 │   │   │   ├── 001316641f4c392d_refined_na_aln.fa
 │   │   │   ├── 001316641f4c392d_refined_na_aln_reduced.fa
 │   │   │   ├── ...
 │   │   ├── metaConfiguration.js
 │   │   ├── metainfo.tsv
 │   │   ├── strainMetainfo.json
 │   │   └── strain_tree.nwk
 │   ├── Pseudomonas_aeruginosa/
 │   ├──...
 │   ├── Staphylococcus_aureus/
 │   ├──...
 
 ```

In this example we have a directory called `pangenome-data/`, which will be the root of your data server. Inside, there is a subdirectory `dataset/`. Inside the `dataset/` subdirectory, for each pathogen there is a directory with the name of the pathogen, e.g. `Escherichia_coli/` (it will become a part of the URL, so it is better to avoid spaces and special characters). Each pathogen directory should contain the output of the panX analysis pipeline.

In order to prepare the data for consumption by the web app, run:

```bash
npm run prepare-data ../pangenome-data/dataset
```

Replace the path `../pangenome-data/dataset` as apropriate for your local filesystem setup.

After `prepare-data` script finishes, the files `index.json` and `not_found.json` should appear in the `pangenome-data` directory.

```
pangenome-data/
├── dataset/
├── index.json
└── not_found.json
```

The `index.json` allows the web app to discover the list of pathogens available and to generate a web page for each pathogen.

Your data is now indexed and is ready to be served.


#### Step 2: Serve the data

You can serve the data in many ways. You can use any static file server. There is a few requirements:

 - You should know the address of the server: hostname (or IP address) and the port
 - [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) must be anbled on the server

Here we describe how to start a local webserver using [`serve` NPM package](https://www.npmjs.com/package/serve) using [npx](https://www.npmjs.com/package/npx).

Run:

 ```bash
 npx serve@13 --cors --listen=tcp://0.0.0.0:8001 pangenome-data/
 ```

Here, the `pangenome-data/` is the data root directory that we prepared above. We have started the data server on port `8001`, and enabled CORS. Note that starting with version 14, the `serve` package does not support Node.js 10 anymore, so we use version 13.

You should now be able to access your raw data files directly in the browser:

```
http://localhost:8001/dataset/Escherichia_coli/coreGenomeTree.json
```

or on command line with CURL:

```bash
curl http://localhost:8001/dataset/Escherichia_coli/coreGenomeTree.json
```


#### Step 3: Configure the app

Notice the variable `DATA_ROOT_URL` in the `.env` file (see "Running locally with the default data" for details). This variable tells the web app where to look for the data. By default, this variable points to the server hosted by the maintainers of panX (the server is located at `https://data.master.pangenome.org`). This is the data that you see on https://pangenome.org.

Let's change this variable to point to the data we have prepared in the steps above:

Open `.env` file and change the value of the variable `DATA_ROOT_URL` to `http://localhost:8001`:

```
DATA_ROOT_URL=http://localhost:8001
```

Change the address as appropriate, depending on how you serve your data.


#### Step 4: Rebuild and run the app

These steps are the same as in the section "Running locally with the default data", except you don't need to copy the default `.env` file anymore, because you should already have it from the previous steps:

```bash
npm run build
npm run start
```

If you navigate to http://localhost:8000 in your browser, you will still see that your data is still not available in the dropdown. However, you can now navigate to the page of the pathogen by its name, for example:

```
http://localhost:8000/Escherichia_coli
```

In this case the app will fetch data from the server you specified, from its subdirectory `dataset/Escherichia_coli`.


#### (Optional) Step 5: Change dropdown items

If you want to change the dropdown items, then, due to legacy reasons, it's tricky. Currently, they are hardcoded in the file [/public/javascripts/species-list-info.js](https://github.com/neherlab/pan-genome-visualization/blob/08d876b526f273f7ee33bcc56a087f8938470ff9/public/javascripts/species-list-info.js). Modify the lists as you see fit and then rebuild and restart the application.


#### (Optional) Step 6: Update custom data and rebuild

Note, the changes to the `.env` file, as well as changes in data directory are only picked up after rebuild. So if you add, remove of change your datasets, or their names, or the URL of your data server, you need to rerun all the steps again:

```bash
npm run prepare-data pangenome-data/dataset
npm run build
npm run start
```

## Hosting your own copy of PanX on the internet

The build process produces all necessary files (except input data) in the directory `public/`.

The build is static and self-contained. To serve the application to the world, you can use any static HTTP server (e.g. Express, Apache or nginx), as well as any cloud service (e.g. AWS) or a web hosting (e.g. GitHub Pages). All you need is to put the `public/` directory into the root of your webserver.

Note that the data still has to be prepared and served independently. It can be served by a separate HTTP server or on the same server as the application. The `DATA_ROOT_URL` should be set correctly during app build, so that the app can find the data. CORS should be enabled on the server.

In fact, this is exactly how https://pangenome.org works. The data and the app are both served on AWS S3 (different buckets), both via Cloudfront cache. The app is built by the GitHub Action and the `public/` directory is simply copied to S3 (see GitHub Action config in `.github/workflows/ci.yml`).

Similarly, the `npm run start` command just runs a local static web server (based on Express), which serves the `public/` directory.
