#!/bin/bash

npx esbuild --minify --format=esm --outdir=dist/components/ src/components/wpt-embed.js
node minify-built-css.mjs