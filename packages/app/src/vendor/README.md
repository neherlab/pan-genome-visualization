# Vendored scripts

Third-party scripts that the viewer imports from this folder, because no package of their release is in use:

- `msa-niaid.js`: a build of the BioJS MSA viewer (`msa`) with changes of its own; sets `window.msa`
- `autocomplete.js`: the species autocomplete of BrightPoint Consulting (MIT), an ES module on d3
- `pace.min.js`: Pace 1.0.0, the page load progress bar
- `gifffer.min.js`: Gifffer, the play button for animated GIFs; sets `window.Gifffer`
- `jquery.bootstrap-autohidingnavbar.min.js`: Bootstrap Auto-Hiding Navbar 1.0.4 (Apache 2.0), a jQuery plugin
- `phyloTree/`: the tree renderer of nextstrain (see its README)

Pace and Gifffer were classic scripts: their wrappers called the factory with `this` as the global object, and took a CommonJS branch when `module` or `exports` existed. Each wrapper here calls the factory with `globalThis` and keeps only the branch of a browser script, so the files run as ES modules in the same way under the Vite dev server and in the build.
