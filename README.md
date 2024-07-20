# wpt-embed
Web Components for displaying WPT traces, and scripts for saving them for display in your own pages.

This is designed to be a lightweight setup with zero client-side dependencies. In short, you provide a [WPT API key](https://docs.webpagetest.org/api/keys/) via environment variable, command line, or config file, and we either run traces (as specified in a `traces.json` file or command line args) or fetch the results of existing traces.

The result of those operations will be a `./out/` directory with folders corresponding to each of the traces, their individual runs, etc. Media assets including videos will also be saved.