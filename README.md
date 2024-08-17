# wpt-embed

<!-- TODO: embed an image of the timeline at work and/or link to demo -->

Web Components for displaying WPT traces, and scripts for saving them for display in your own pages.

This is designed to be a lightweight setup with zero client-side dependencies. In short, you provide a [WPT API key](https://docs.webpagetest.org/api/keys/) via environment variable, command line, or config file, and we fetch the results.

The result of those operations will be a `./out/` directory with folders corresponding to each of the traces, their individual runs, etc. Media assets including videos will also be saved.

The `<wpt-filmstrip>` web component consumes the `timeline.json` file generated in each trace run's directory, referencing the previously downloaded media.

## CLI Examples

First, install this package into your project via NPM, or via github (today):

```console
$ npm i --save @slightlyoff/wpt-embed
```

Then run the provided script to download a previously-captured WebPageTest.org trace using your API key and the trace ID:

```console
$ pwd
/tmp/test
$ npx wpt-fetch --key [yourkey] TRACE_ID
ℹ no ouput directory, creating: /tmp/test/wpt-traces
✔  Results downloaded for test TEST_ID
✔  Downloaded 76 filmstrip images for TEST_ID, run 1, firstView
✔  Downloaded videos of TEST_ID, run 1, firstView
✔  Downloaded gif of TEST_ID, run 1, firstView
✔  Downloaded videos of TEST_ID, run 1, firstView
✔  Downloaded 1 filmstrip images for TEST_ID, run 1, repeatView
✔  Downloaded videos of TEST_ID, run 1, repeatView
✔  Downloaded gif of TEST_ID, run 1, repeatView
✔  Downloaded videos of TEST_ID, run 1, repeatView
✔  Downloaded 75 filmstrip images for TEST_ID, run 2, firstView
✔  Downloaded videos of TEST_ID, run 2, firstView
✔  Downloaded gif of TEST_ID, run 2, firstView
✔  Downloaded videos of TEST_ID, run 2, firstView
✔  Downloaded 63 filmstrip images for TEST_ID, run 2, repeatView
✔  Downloaded videos of TEST_ID, run 2, repeatView
✔  Downloaded gif of TEST_ID, run 2, repeatView
✔  Downloaded videos of TEST_ID, run 2, repeatView
✔  Downloaded 77 filmstrip images for TEST_ID, run 3, firstView
✔  Downloaded videos of TEST_ID, run 3, firstView
✔  Downloaded gif of TEST_ID, run 3, firstView
✔  Downloaded videos of TEST_ID, run 3, firstView
✔  Downloaded 63 filmstrip images for TEST_ID, run 3, repeatView
✔  Downloaded videos of TEST_ID, run 3, repeatView
✔  Downloaded gif of TEST_ID, run 3, repeatView
✔  Downloaded videos of TEST_ID, run 3, repeatView
```

This will download all of the assets needed to render a WPT timeline into the output directory. If no directory is specified, a new directory will be created under the current working directory at `./wpt-traces/`.

Within this directory, each run will be cached in a separate directory with its own, lightweight JSON summary that captures essential metrics and references to the media files needed to render the timeline.

Each directory has roughly the same structure:

```console
$ cd wpt-traces/
$ tree
.
└── TEST_ID
    ├── results.json
    └── runs
        ├── 1
        │   ├── firstView
        │   │   ├── checklist.png
        │   │   ├── connectionView.png
        │   │   ├── filmstrip
        │   │   │   ├── ms_000000.jpg
        │   │   │   ├── ms_003500.jpg
        │   │   │   ├── ...
        │   │   │   └── ms_035000.jpg
        │   │   ├── screenShot.png
        │   │   ├── timeline.gif
        │   │   ├── timeline.json
        │   │   ├── timeline.mp4
        │   │   └── waterfall.png
        │   └── repeatView
        │       ├── ...
        │       ├── timeline.json
        │       ├── timeline.mp4
        │       └── waterfall.png
        ├── 2
        │   ├── firstView
        │   |   ├── ...
        │   |   ├── timeline.json
        │   |   ├── timeline.mp4
        │   |   └── waterfall.png
        │   └── repeatView
        │       ├── ...
        │       ├── timeline.json
        │       ├── timeline.mp4
        │       └── waterfall.png
        └── 3
            ├── firstView
            |   ├── ... 
            |   ├── timeline.json
            |   ├── timeline.mp4
            |   └── waterfall.png
            └── repeatView
                ├── ... # You get the idea
                ├── timeline.json
                ├── timeline.mp4
                └── waterfall.png
```

Each of the view directories includes media and a a`timeline.json` file. To display timelines, we use the components provided in this package.

## Component Examples

Let's build a test file inside the same directory in which we ran the `wpt-fetch` script:

```console
$ pwd
/tmp/test
$ touch timelines.html
```

In `timelines.html`, we will directly reference the component script, but for product, you'd be expected to copy or package it to a different location. The script is self-contained and designed to work (only) on modern browsers:

```html
<!DOCTYPE html>
<!-- timelines.html -->
<html>
  <head>
    <script type="module">
      import "./node_modules/wpt-embed/src/components/wpt-filmstrip.js";
    </script>
  </head>
  <body>
    <!-- Display the first view, one frame every 500ms -->
    <wpt-filmstrip 
      size="medium" 
      interval="500ms">
      <wpt-test
        timeline="./wpt-traces/TEST_ID/runs/1/firstView/timeline.json">
        <!-- Include a link for progressive enhancement -->
        <a 
          href="https://www.webpagetest.org/video/results.php?tests=TEST_ID"
          target="_new">Test name and description</a>
      </wpt-test>
    </wpt-filmstrip>

    <!-- First-view and repeat-view side-by-side with small images -->
    <wpt-filmstrip 
      size="small"
      interval="100ms">
      <wpt-test
        label="First View"
        timeline="./wpt-traces/TEST_ID/runs/1/firstView/timeline.json">
        <!-- fallback link -->
        <a 
          href="https://www.webpagetest.org/video/compare.php?tests=TEST_ID-r:1-c:0"
          target="_new">First view</a>
      </wpt-test>
      <wpt-test
        label="Repeat View"
        timeline="./wpt-traces/TEST_ID/runs/1/repeatView/timeline.json">
        <!-- fallback link -->
        <a 
          href="https://www.webpagetest.org/video/compare.php?tests=TEST_ID-r:1-c:1"
          target="_new">Repeat view</a>
      </wpt-test>
      <!-- SxS -->
      <a 
        href="https://www.webpagetest.org/video/compare.php?tests=TEST_ID-r:1-c:0,TEST_ID-r:1-c:1"
        target="_new">side-by-side comparison</a>
    </wpt-filmstrip>

    <!-- First views, 60fps large images -->
    <wpt-filmstrip 
      size="large"
      interval="60fps">
      <wpt-test
        timeline="./wpt-traces/TEST_ID/runs/1/firstView/timeline.json">
      </wpt-test>
      <wpt-test
        timeline="./wpt-traces/TEST_ID/runs/2/firstView/timeline.json">
      </wpt-test>
      <wpt-test
        timeline="./wpt-traces/TEST_ID/runs/3/firstView/timeline.json">
      </wpt-test>
    </wpt-filmstrip>
  </body>
</html>
```

Timeline images are fetched from locations relative to the `timeline.json` file, so if you copy or move files, be sure to include the `filmstrip/` directory located next to `timeline.json` for the run in question.

## Design Goals

Client-side:

  - Zero dependencies. Components are small and self-contained for maximum performance.
  - Single-connection serving. Components and assets can all be delivered from the same server.

`wpt-fetch`:

  - Transparent recovery. Re-running scripts should re-use previously downloaded assets to the greatest extent possible.
  - Config-file and environment-variable based configuration to avoid API key leakage.
  - Full results available. The `results.json` file deposited at the top of the test directory contains all of the information WPT provides about a trace, and `timeline.json` subsets are produced from it.

## Future features

The current version is very much an MVP. Features that might get added (if there's demand):

For the web components:

  - Waterfall image scrubbing integration
  - Overlapping image waterfalls w/ opacity
  - Long-task highlighting

For the fetch scripts:

  - The ability to execute new traces via config file settings.
  - Ability to generate and fetch side-by-side videos of multiple test runs.