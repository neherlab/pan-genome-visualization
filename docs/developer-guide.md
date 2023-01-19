# Developer guide

## TL;DR

```bash
cp .env.example .env
yarn install
yarn dev
```

## About this document

This document describes how to build and run the application as well as how to maintain it.

Pangenome is under development and this document may sometimes get obsolete (when we forget to update it). For a known working build setup, see the description of the continuous integration (CI) at `.github/workflows/ci.yml`.

## General information

Pangenome is a static web application, built using [Next.js](https://nextjs.org/) framework and is based on [React](https://reactjs.org/) and [Typescript](https://www.typescriptlang.org/). Among notable dependencies there are [react-query](https://tanstack.com/query), which helps to fetch and cache data, and [recoil](https://recoiljs.org/), which helps to maintain app state. You need to understand these technologies in order to understand the code. And, in particular:

- File-based routing in Next.js (see the [docs](https://nextjs.org/docs/routing/introduction))
- React components (see the [docs](https://reactjs.org/docs/components-and-props.html))
- React hooks (see the [docs](https://reactjs.org/docs/hooks-overview.html))
- How react-query hooks work (see the educational videos in the [docs](https://tanstack.com/query/v4/docs/videos))
- How recoil hooks work (see the educational videos in the [docs](https://recoiljs.org/))

The app is static, meaning that it has no programmable server components and can be deployed to any static file server or to a cloud hosting. For example pangenome.org is usging AWS S3 + Cloudfront to serve the app files.


## Building and running

### Install prerequisites

Prerequisites:

- Node.js 14 or above
- yarn

Install Node.js version 14 or higher, by either downloading it from the official website: https://nodejs.org/en/download/, or by using [nvm](https://github.com/nvm-sh/nvm). We don't recommend using Node.js from the package manager of your operating system, and neither from conda nor other sources. If you install manually, don't forget to add Node.js bin directory to the system path.

The `yarn` command should be included in most Node.js distributions. Check it with:

```bash
yarn --version
```

If not found, you can additionally install it using:

```bash
npm install -g yarn
```

### Build and serve development version

Development version builds much faster, but runs slower thatn production version. It also runs a development server,
which detects code changes and updates the app on the fly, often wihtout need for reloading the page (fast-refresh). It
is convenient for routine development needs, but does not reflect the final, production application fully.

Having Node.js and `yarn` ready, run the following commands:

```bash
# Prepare environment by creating `.env` file and filling values in it according to example in `.env.example`. In simple case, you can just use the example file itself:
cp .env.example .env

# Install required npm packages
yarn install

# Run development server
yarn dev
```

The last command will start server on `http://localhost:3000` by default. You can open this URL in the browser and
should be able to see the main page of the application. Note that it might take some time to display the page when it's
accessed for the first time - in development mode the pages are built on demand.


### Build and serve production version locally

In production mode, the app takes a long time to build but the result is optimized for speed and file size, and reflects what is being shipped to the end user. It has less debug information and is harder to use in routine development, but sometimes you need to make sure the app works in production mode locally before deploying it to an actual server. That's what this section is for.

Having Node.js and `yarn` ready, run the following commands:

```bash
# Prepare environment by creating `.env` file and filling values in it according to example in `.env.example`. In simple case, you can just use the example file itself:
cp .env.example .env

# Install required npm packages
yarn install

# Build production files
yarn prod:build

# Serve production files using a local server
yarn prod:serve
```

The `prod:build` command should emit app files into `.build/production/web/`. This directory can then be served using any static file server.

The `prod:serve` wil serve these files locally on `http://localhost:8080` by default. You can open this URL in the browser and should be able to see the main page of the application.

Note that this local server is only for development needs - it is slow and insecure, and is not suitable for production deployments. A real deployment should use a properly configured static web server (such as Nginx) or a cloud-based file hosting. For example pangenome.org is usging AWS S3 + Cloudfront.

### Use different data

The app is requing on external data to be served separately.

TODO: exlain where to find it of how to produce it.

In order to use an alternative source of data, you can change the default `DATA_ROOT_URL` variable in the `.env`, rebuild, and restart the application.


### Exploring and modifying the code

Run development version of the app as described above, open it in a browser, and then open the project directory in your favorite text editor or an IDE.

In Next.js, the entry points to the application are the "pages", each defined as a file in `src/pages/` directory. For example, the main (index) page, the one that is shown when you navigate to the root URL (`/`), is in `src/pages/index.tsx`. From there you can follow the imports to see what React components are used on the page and how they are defined. In order to add a new page, add a file to `src/pages/`.

If you run the app in development mode and modify the code relevant for a page, upon saving the file(s), the dev server detects the changes, incrementally rebuilds only the changed parts and updates the page in the browser. If you run in production mode, you need to rebuild the app and refresh the page yourself.


## Maintenance

TODO

### Linting (static analysis)

TODO

### Code formatting (code style)

TODO

### Continuous integration

TODO

### Versioning

TODO

### Releasing

TODO
