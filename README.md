# wpt-embed
Web Components for displaying WPT traces, and scripts for saving them for display in your own pages.

This is designed to be a lightweight setup with zero client-side dependencies. In short, you provide a [WPT API key](https://docs.webpagetest.org/api/keys/) via environment variable or config file, and we either run traces (as specified in a `traces.json` file) or fetch the results of existing traces (as listed in that same file or via command line params; see below).

The result of those operations will be a `./traces/` directory with folders inside corresponding to each of the traces, their individual runs, etc.