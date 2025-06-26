/**
 * TODO:
 *
 * - styling + :part()s
 * - pie charts in breakdown
 * - support an `order` attribute
 * - Highlight low compression ratios and large payloads
 * - theme support
 * - filmstrip styling for timeline events:
 *    https://nooshu.com/blog/2019/10/02/how-to-read-a-wpt-waterfall-chart/#what-do-the-filmstrip-thumbnail-border-colours-signify
 * - expose as a webc plugin for 11ty
 * - options to display connection and device params
 * - sync'd scroll for timeline and waterfall/connections
 * - "play" button?
 */

// Dummy for syntax highlighting
let css = function(strs, subs) {
 if (strs?.length > 1 || subs?.length > 1) {
  console.error("`css` tag called with values, which should not happen"); 
 }
 return strs[0];
} 

CSS.registerProperty({
  name: "--wpt-scroll-pct",
  syntax: "<percentage>",
  inherits: true,
  initialValue: "0%",
});


let attrToBool = (value, attr) => {
  let t = (typeof value);
  if(t === "boolean") { return value; }
  if(t === "string") {
    let lc = value.toLowerCase();
    if(
      (!value.length) ||
      (lc == "true")  ||
      (lc == attr)
    ){
      return true;
    }
  }
  return false;
};

let attrToList = (value, attr, def) => {
  let lc = value.toLowerCase();
  if( (lc === attr) || (lc === "true")) {
    return def;
  }
  return value.split(/\s+/);
}

let qs = (el, sel) => {
  return el.querySelector(sel);
};
let eqs = (el) => {
  return (sel) => { return qs(el, sel); };
}

let _styleMap = new Map();
let addStyles = (doc, styles) => {
  let s = _styleMap.get(styles);
  if (!s) {
    try {
      s = {
        type: "CSS",
        value: new CSSStyleSheet()
      }
      s.value.replaceSync(styles);
    } catch(e) {
      s = {
        type: "sheet",
        value: styles
      };
    }
    _styleMap.set(styles, s);
  }
  switch(s.type) {
    case "sheet":
      let sheet = doc.createElement("style");
      sheet.textContent = s.value;
      doc.appendChild(sheet);
      break;
    case "CSS":
      doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, s.value];
      break;
  };
}

let toCamelCase = (() => {
  let _c = new Map();
  return (s) => {
    let _s = _c.get(s);
    if (_s) { return _s; }
    _s = s.replace(/(-)+([a-z]?)/g, (m, g0, g1, offset) => {
      let c = m[m.length-1];
      if(!offset) return c;
      return (c === "-") ? "" : c.toUpperCase();
    });
    _c.set(s, _s);
    return _s;
  };
})();

let templateFor = (str) => {
  document.body.insertAdjacentHTML(
    "beforeend", 
    `<template>${str}</template>`
  );
  return document.body.lastElementChild.content;
};

class WPTFilmstrip extends HTMLElement {

  static observedAttributes = [
    "aspect-ratio",
    "size",
    "interval",
    "filmstrip",
    "waterfall",
    "connections",
    "breakdown",
    "crux",
    "video",
    "gif",
    "end",
  ];

  static styles = css`
    /* A wee reset */
    h1, h2, h3, h4, p, figure, blockquote, dl, dd {
      margin-block-end: 0;
      margin-block-start: 0;
    }
    h1, h2, h3, h4 {
      text-wrap: balance;
    }

    /*
     * Doesn't work currently. See:
     *
     *    https://developer.chrome.com/docs/css-ui/css-names 
     * 
     * and:
     *    https://github.com/w3c/csswg-drafts/issues/10541
     * 
     * CSS.registerProperty() used instead.
     */
    /*
    @property --wpt-scroll-pct {
      syntax: "<percentage>";
      inherits: true;
      initial-value: 0%;
    }
    */

    * {
      box-sizing: border-box;
    }

    :host {
      timeline-scope: --wpt-filmstrip-scroller;

      --wpt-image-width: var(--image-width, 100px);
      --wpt-progress-line-color: red;
      --wpt-progress-line-width: 2px;

      --wpt-section-padding: 1rem 0;

      /* TODOC
      --wpt-scroll-pct: var(--wpt-line-pct-left, 24.6%);
      --wpt-line-pct-top: 37px;
      --wpt-line-pct-bottom: 170px;
      --wpt-crux-good: rgb(12, 206, 107);
      --wpt-crux-fair: rgb(255, 164, 0);
      --wpt-crux-poor: rgb(255, 78, 66);
      --wpt-breakdown-even-color: ...
      */

      /* TODO:
      --wpt-no-change-border-color: transparent;
      --wpt-visual-change-border-color: yellow;
      --wpt-lcp-border-color: red;
      */
    }

    :host([debug]) {
      * {
        outline: 1px solid blue;
      }
      outline: 2px dotted red;
    }
    
    /**************
     * 
     * All sections
     * 
     **/

    :host {
      display: flex;
      flex-direction: column;
    }

    :host > div {
      width: 100%;
      margin: var(--wpt-section-padding);

      /* center */
      display: flex;
      justify-content: center;
      gap: 1rem;
    }

    caption,
    figcaption {
      text-align: center;
      margin: 0.25em 0;
    }

    table {
      border-collapse: collapse;
    }

    figure {
      margin: 0;
      padding: 0;
    }

    /**************
     * 
     * Filmstrip section
     * 
     ***/
    
    #scroll-container {
      overflow-x: auto;
      display: block;
      position: relative;
      scrollbar-gutter: stable;

      scroll-timeline-axis: x;
      scroll-timeline-name: --wpt-filmstrip-scroller;
    }

    /* TODO: elide when there's no filmstrip */
    :host([waterfall]),
    :host([connections]) {
      #scroll-container {
        border-left: var(--wpt-progress-line-width) solid var(--wpt-progress-line-color);
      }
      #scroll-container.hidden { display: none; }
    }

    #main-table {
      width: 100%;
      top: 0px;
      left: 0px;
      /* TODO: not working in FF */
      margin-right: calc(100%);
    }

    .filmstrip-row {
      width: 100%;

      & img {
        border: 1px solid black;
        content-visibility: auto;
      }

      & .pct {
        text-align: center;
      }
    }

    .meta {
      text-align: left;
    }

    .labels {
      position: sticky;
      display: inline-block;
      top: 0px;
      left: 0px;
      padding: 0.5rem;
    }

    #timing td {
      text-align: center;
    }

    :host([size="small"]) {
      --wpt-image-width: 50px;
    }

    :host([size="medium"]) {
      --wpt-image-width: 50px;
    }

    :host([size="large"]) {
      --wpt-image-width: 200px;
    }

    .filmstrip-row img {
      width: var(--wpt-image-width, 100px);
      contain-intrinsic-width: var(--wpt-image-width, 100px);
      aspect-ratio: var(--wpt-aspect-ratio);
    }

    .filmstrip-meta {
      padding: 1em;
    }

    :host > div.hidden { 
      display: none;
      margin: 0;
      padding: 0;
    }

    @keyframes scrollTransform {
      from {
        --wpt-scroll-pct: 0%;
      }
      to {
        --wpt-scroll-pct: 100%;
      }
    }

    /**************
     * 
     * Breakdown table and charts section
     * 
     ***/

    #breakdown {

      & > table {
        min-width: 20rem;
        width: 100%;
        max-width: 35rem;
        border-collapse: collapse;
        border: 1px solid #dddddd;
        margin: 0;

        & > caption {
          caption-side: bottom;
        }

        & td, th {
          padding: 0.5em 0.35em;
        }

        & > thead {
          background-color: gainsboro;
          text-align: center;
          color: var(--wpt-breakdown-even-color, inherit);
        }
        & > tbody {
          & > tr {
              border-bottom: 1px solid #dddddd;
          }

          & > tr:nth-of-type(even) {
            background-color: #f3f3f3;
            color: var(--wpt-breakdown-even-color, inherit);
          }

          & th {
            text-align: left;
          }
          & td {
            text-align: right;
          }
        }
      }
    }

    /**************
     * 
     * CrUX data
     * 
     ***/
    #crux {
      flex-direction: column;

      & > .crux {
        width: 100%;

        & > .metric {
          width: 100%;
          margin: 2em 0;

          & .title {
            opacity: 0.7;
          }

          & .value{
            font-weight: 900;
            font-size: 2em;
            line-height: 1;
            margin: 0.2em 0;
          }

          & .pct{
            margin: 0.2em 0;
          }

          & .good {
            background-color: var(--wpt-crux-good, rgb(12, 206, 107));
            color: white; /* TODO: themes & contrast */
          }
          & .fair {
            background-color: var(--wpt-crux-fair, rgb(255, 164, 0));
          }
          & .poor {
            background-color: var(--wpt-crux-poor, rgb(255, 78, 66));
            color: white; /* TODO: themes & contrast */
          }

          & > ul {
            list-style: none;
            padding: 0;
            display: flex;
            width: 100%;

            & > li {
              line-height: 2.2;
              text-indent: 0.8em;

            }
          }

          & > .thresholds {
            display: flex;

            & > div {
              padding: 0.2em 0.8em;

              & > .key {
                display: inline-block;
                width: 1.5em;
              }
            }
          }
        }
      }
    }

    /**************
     * 
     * Waterfall and Connections sections
     * 
     ***/

    /*
     * These images are all 1012px wide, with insets for legends, 
     * resource names, and utilization (at the bottom). For our 
     * following red line, we need to place it with offsets relative 
     * to how the image is scaled.
     */

    #waterfall,
    #connections {
      align-items: inherit;
      overflow-x: auto;
      width: 100%;
      --wpt-start-stop: 0.24;

      & picture {
        width: 100%;
        max-width: 1012px;
        display: inline-block;
        position: relative;
        contain: content;
        margin: 0;
        padding: 0;
        border: 0;

        --es-tl: var(--wpt-test-length);
        --es-lt: var(--wpt-longest-test, 1);
        --wpt-end-stop: calc(var(--es-tl) / var(--es-lt) * 100%);

        & > img {
          width: 100%;
          max-width: 1012px;
        }
      }

      & picture::after {
        content: "";
        display: block;
        z-index: 1;
        position: absolute;
        display: block;
        width: var(--wpt-progress-line-width);

        /* TODO: 
            hate that we're animating left, but it's relative and can be set
            using the timeline very easily
        */
        left: var(--wpt-scroll-pct);
        top: var(--wpt-line-pct-top, 37px);
        bottom: var(--wpt-line-pct-bottom, 170px);

        background-color: var(--wpt-progress-line-color);
        opacity: 0.8;

        will-change: left;

        /*
        animation-name: scrollTransform;
        animation: scrollTransform linear;
        */

        animation: scrollTransform linear(0, var(--wpt-start-stop) 0%, 1 var(--wpt-end-stop) 90%);
        animation-timeline: --wpt-filmstrip-scroller;
      }
    }

    /**************
     * 
     * Gif and Video sections
     * 
     ***/

    #gif,
    #video {
    }
  `;

  static template = templateFor(`
  <div id="scroll-container" part="scroll-container">
    <table id="main-table">
      <tbody>
        <tr id="timing">
        </tr>
      </tbody>
    </table>
  </div>
  <div id="waterfall" part="waterfall" class="hidden"></div>
  <div id="connections" part="connections" class="hidden"></div>
  <div id="breakdown" part="breakdown" class="hidden"></div>
  <div id="crux" part="crux" class="hidden"></div>
  <div id="gif" part="gif" class="hidden"></div>
  <div id="video" part="video" class="hidden"></div>
  `);

  static tagName = "wpt-filmstrip";
  get tagName() { return this.constructor.tagName; }

  constructor() {
    super();
    let shadow = this.attachShadow({ mode: "open" });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if(
      WPTFilmstrip.observedAttributes.includes(name) &&
      oldValue !== newValue
    ) {
      let n = toCamelCase(name);
      this[n] = newValue;
    }
  }

  #_tf = Intl.NumberFormat("en-US", { minimumFractionDigits: 1 });
  #_intervalMs = 100;
  #_interval = "100";
  set interval(i) {
    let oldIntervalMS = this.#_intervalMs;
    if(typeof i === "number") {
      i = i.toString();
    }
    let mfd;
    switch(i) {
      case "16":
      case "16ms":
      case "60fps":
        this.#_intervalMs = 16;
        mfd = 3;
        break;
      case "1000":
      case "1000ms":
      case "1s":
        this.#_intervalMs = 1000;
        mfd = 0;
        break;
      case "5000":
      case "5000ms":
      case "5s":
        this.#_intervalMs = 5000;
        mfd = 0;
        break;
      case "500":
      case "500ms":
      case "0.5s":
        this.#_intervalMs = 500;
        mfd = 1;
        break;
      case "100":
      case "100ms":
      case "0.1s":
      default:
        this.#_intervalMs = 100;
        mfd = 1;
        break;
    }
    this.#_tf = Intl.NumberFormat("en-US", { minimumFractionDigits: mfd });
    if (this.#_intervalMs !== oldIntervalMS) {
      this.updateTests();
    }
  }
  get interval() { return this.#_interval; }
  getTimingFor(ms=0) {
    let td = document.createElement("td");
    let s = document.createElement("span");
    s.innerText = this.#_tf.format(ms / 1000)+"s";
    td.appendChild(s);
    return td;
  }

  #filmstrip = true;
  set filmstrip(v) {
    this.#filmstrip = attrToBool(v, "filmstrip");
  }
  get filmstrip() { return this.#filmstrip; }

  #waterfall = false;
  set waterfall(v) {
    this.#waterfall = attrToBool(v, "waterfall");
    // TODO, etc, etc.
  }
  get waterfall() { return this.#waterfall; }

  #connections = false;
  set connections(v) {
    this.#connections = attrToBool(v, "connections");
  }
  get connections() { return this.#connections; }

  #breakdown = false;
  set breakdown(v) {
    this.#breakdown = attrToBool(v, "breakdown");
  }
  get breakdown() { return this.#breakdown; }

  #crux = [];
  set crux(v) {
    this.#crux = attrToList(v, "crux", ["inp", "lcp", "cls"]);
  }
  get crux() { return this.#crux; }

  #video = false;
  set video(v) {
    this.#video = attrToBool(v, "video");
  }
  get video() { return this.#video; }

  #gif = false;
  set gif(v) {
    this.#gif = attrToBool(v, "gif");
  }
  get gif() { return this.#gif; }

  #end = "full";
  #endMapping = {
    "full": "fullyLoaded",
    "visual": "visualComplete",
    "onload": "loadEventEnd",
    "lcp": "LargestContentfulPaint",
    "fcp": "FirstContentfulPaint",
  };
  set end(v) {
    if (!this.#endMapping[v]) { return; }
    this.#end = ((v === "end") ? "full" : v);
  }
  get end() { return this.#end; }
  get longEnd() { return this.#endMapping[this.#end]; }

  connectedCallback() {
    this.wireElements();
  }

  get #tests() {
    // TODO: cache
    return Array.from(this.children).filter((e) => {
      return e.tagName === "wpt-test";
    });
  }

  #_matchHiddenState(value, el) {
    if(typeof el === "string") { el = this.byId(el); }
    el.classList[ !!value ? "remove" : "add" ]("hidden");
    return el;
  }

  updateTests() {
    if(!this.#wired) { return; }
    // Get the maximum duration
    let durations = this.#tests.map((t) => { return t.duration; })
    let end = Math.max(...durations) + this.#_intervalMs;
    // TODO: can this cut off the last frame?
    let timings = [];
    for(let x=0; x <= end; x+=this.#_intervalMs) {
      timings.push(this.getTimingFor(x));
    }
    if(this.filmstrip) {
      this.byId("timing").replaceChildren(...timings);
    }

    var longest = 0;
    for(let t of this.#tests) {
      let len = t.duration || 0;
      if(len > longest) {
        longest = len;
      }
    }
    this.style.setProperty("--wpt-longest-test", longest);

    this.#tests.forEach((t) => {
      if(this.filmstrip) {
        t.renderFilmstripInto(
          this.#_intervalMs,
          timings.length,
          this.byId("main-table").tBodies[0]
        );
      } else {
        this.byId("main-table").classList.add("hidden");
        this.byId("scroll-container").classList.add("hidden");
      }

      // TODO: DRY
      let c = this.byId("waterfall");
      this.#_matchHiddenState(this.waterfall, c);
      if(this.waterfall) { t.renderWaterfallInto(c); }

      c = this.byId("connections");
      this.#_matchHiddenState(this.connections, c); 
      if(this.connections) { t.renderConnectionsInto(c); }

      c = this.byId("breakdown");
      this.#_matchHiddenState(this.breakdown, c); 
      if(this.breakdown) { t.renderBreakdownInto(c); }

      c = this.byId("crux");
      this.#_matchHiddenState(this.crux, c); 
      if(this.crux.length) { t.renderCruxInto(c, this.crux); }

      c = this.byId("video");
      this.#_matchHiddenState(this.video, c); 
      if(this.video) { t.renderVideoInto(c); }

      c = this.byId("gif");
      this.#_matchHiddenState(this.gif, c); 
      if(this.gif) { t.renderGifInto(c); }
    });
  }

  #wired = false;
  byId(id) { return this.shadowRoot.getElementById(id); }
  wireElements() {
    // Prevent memory leaks
    if (this.#wired) { return; }
    this.#wired = true;

    let sr = this.shadowRoot;
    let listen = (id, evt, method) => {
      let m = (typeof method == "string") ?  this[method].bind(this) : method;
      this.byId(id).addEventListener(evt, m);
    };

    addStyles(sr, WPTFilmstrip.styles);

    sr.appendChild(WPTFilmstrip.template.cloneNode(true));

    this.addEventListener("test-modified", this.updateTests);
  }
}
customElements.define(WPTFilmstrip.tagName, WPTFilmstrip);

/**
 * Does not render its own Shadow DOM due to the <table> based layout,
 * but owns data for a single timeline, loads it, and notifies the parent when
 * re-rendering is required. Must be nested inside a <wpt-filmstrip>.
 *
 * Notifies parent on attribute changes.
 */
class WPTTest extends HTMLElement {

  static observedAttributes = [
    "label",
    "test",
    "run",
    "view",
    "timeline",
    "timeline-video",
    "aspect-ratio",
    "avif",
    // TODO: ID reference to an existing test data obj
    // "ref",
  ];

  static tagName = "wpt-test";
  get tagName() { return this.constructor.tagName; }

  constructor() {
    super();
  }

  #dirty = false;
  #maybeNotify() {
    this.#dirty = true;
    if(this.#connected) {
      this.dispatchEvent(new CustomEvent("test-modified", {
        bubbles: true,
      }));
    }
  }

  #connected = false;
  connectedCallback() {
    if(this.parentNode &&
       this.parentNode?.tagName === WPTFilmstrip.tagName) {
        this.#connected = true;
        this.#maybeNotify();
        this.#maybeBuildTimeline();
    }
  }

  data = null;
  #_timeline = "";
  set timeline(i) { this.updateTimeline(i); }
  get timeline()  { return this.#_timeline; }

  #_label = "";
  set label(l) {
    this.#_label = l;
    this.#maybeNotify();
  }
  get label()  { return this.#_label; }

  #test = "";
  set test(v) { 
    if(v && !v.endsWith("/")) { v += "/"; }
    this.#test = v;
    if(v) { this.#maybeBuildTimeline(); }
  }

  #run = "1";
  set run(v) {
    this.#run = parseInt(v) + "";
    if(v) { this.#maybeBuildTimeline(); }
  }

  #view = "first";
  set view(v) {
    if(v && ["first", "repeat"].includes(v)) {
      this.#view = v;
      this.#maybeBuildTimeline();
    }
  }

  get duration() {
    return this?.data?.[this?.parentNode?.longEnd] || 0;
  }

  #_avif = false;
  set avif(v) {
    this.#_avif = attrToBool(v, "avif");
  }
  get avif() { return this.#_avif; }

  #maybeBuildTimeline() {
    if(!this.#connected) { return; }
    if(this.#test && this.#run && this.#view) {
      let u = `${this.#test}runs/${this.#run}/${this.#view}View/timeline.json`;
      this.updateTimeline(u);
      return;
    }
    let inlineConfig = 
        this.querySelector(`:scope > script[type="text/json"]`) ||
        this.querySelector(`:scope > script[type="application/json"]`);
    if(inlineConfig && inlineConfig.hasAttribute("dir")) {
      let cfg = JSON.parse(inlineConfig.textContent);
      let dir = inlineConfig.getAttribute("dir");
      let test = `${dir}${cfg.id}/runs/${cfg.run}/${cfg.view}/timeline.json`;
      this.data = cfg;
      this.avif = this.data.optimizedImages;
      this.#_timeline = test;
      this.#maybeNotify();
    }
  }

  async updateTimeline(url) {
    if( (!url) || (url === this.#_timeline)) { return; }

    this.#_timeline = url;
    // Fetch and parse
    try {
      let r = await fetch(url);
      this.data = await r.json();
      this.avif = this.data.optimizedImages;
      this.#maybeNotify();
    } catch(e) {
      console.error(e);
      this.data = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if(
      WPTTest.observedAttributes.includes(name) &&
      oldValue !== newValue
    ) {
      let n = toCamelCase(name);
      this[n] = newValue;
      this.#maybeNotify(n, newValue);
    }
  }

  static rowTemplate = templateFor(`
    <!-- start -->
    <tr class="meta-row">
      <td class="meta">
        <div class="labels">
          <a class="test-link" target="_new" part="test-link">
            <span class="label" part="label"></span>
          </a>
        </div>
      </td>
    </tr>
    <tr class="filmstrip-row">
    </tr>
    <!-- end -->
  `);

  #fragStart = null;
  #fragEnd = null;
  #extracted = null;
  // TODO: update to handle other rendered tracks
  extract() {
    if(this.#fragStart) {
      if(this.#extracted) { return this.#extracted; }
      let r = new Range();
      r.setStartBefore(this.#fragStart);
      r.setEndAfter(this.#fragEnd);
      this.#extracted = r.extractContents();
      r.detach();

      [
        this.#waterfall,
        this.#connections,
        this.#breakdown,
        this.#crux,
        this.#video,
        this.#gif,
      ].forEach((ref) => { 
        if(ref) { ref.remove(); }
      });
      return this.#extracted;
    }
  }

  disconnectedCallback() {
    this.extract();
  }

  renderFilmstripInto(interval=100, frameCount, container) {
    if(!this.data) { return; }
    let f;
    if(this.#fragStart) {
      // Remove it from wherever it is...
      f = this.extract();
      if(!this.#dirty) {
        // ...and put it back where it's supposed to go.
        container.append(f);
        this.#extracted = null;
        return;
      }
    }

    f = WPTTest.rowTemplate.cloneNode(true);
    let comments = Array.from(f.childNodes).filter((n) => {
      return n.nodeType === 8;
    });
    this.#fragStart = comments.shift();
    this.#fragEnd = comments.shift();
    let fqs = eqs(f);
    fqs(".test-link").setAttribute("href", this.data.summary);
    fqs(".meta").setAttribute("colspan", frameCount);
    fqs(".label").innerText = this.label || this.data.url;
    let frames = this.getFrames(interval, frameCount);
    let r = fqs(".filmstrip-row");
    r.replaceChildren(...frames);
    r.style.setProperty("--wpt-aspect-ratio", this.data.filmstripImageAspectRatio);
    container.append(f);
    this.#extracted = null;
  }

  #_timelineURL = null;
  #relativeImgURL(path) {
    if(!this.#_timelineURL) {
      this.#_timelineURL = new URL(this.#_timeline, window.location);
    }
    if(this.avif && (
      path.endsWith(".png") ||
      path.endsWith(".jpg")
    )) {
      path = path.slice(0, -4) + ".avif";
    }
    return new URL(path, this.#_timelineURL);
  }

  static figureTemplate = templateFor(`
    <figure>
      <a target="_blank">
        <picture>
          <img>
        </picture>
      </a>
      <figcaption></figcaption>
    </figure>
  `);

  #setupFigure(container, name="", timeline=false) {
    container.appendChild(WPTTest.figureTemplate.cloneNode(true));
    let figure = container.lastElementChild;
    if(name) { figure.setAttribute("part", name); }
    if(timeline) {
      let img = qs(figure, "img");
      img.addEventListener("load", (e) => {
        let nw = img.naturalWidth;
        let nh = img.naturalHeight;

        // CSS calc() can't convert to percentages, so we do it here instead
        figure.style.setProperty("--wpt-line-pct-top", `${(37 / nh).toFixed(5) * 100 }%`);

        figure.style.setProperty("--wpt-start-stop", `${(250 / nw).toFixed(5)}`);

        figure.style.setProperty("--wpt-line-pct-bottom", `${(170/ nh).toFixed(5) * 100 }%`);
      });
    }
    return figure;
  }

  #location = "";
  get location() {
    if(!this.#location && this.data) {
      let u = new URL(this.data.testUrl);
      this.#location = `${u.host}${u.pathname == "/" ? "" : u.pathname}`;
    }
    return this.#location;
  }

  #summary = "";
  get summary() {
    if(this.#summary && this.data) {
      // TODO: cleanup on the collection side too
      let from = this.data.from
                     .replaceAll("<b>", "")
                     .replaceAll("</b>", "")
                     .replace(" - ", ` in ${this.data.mobile ? "mobile" : "desktop"} `)
                     .replace(" - ", ` on an `)
                     .replace(" - ", ` using an emulated `) + " connection";

      this.#summary = `${this.location} tested from ${from}; ${this.#view} view`;
    }
    return this.#summary; 
  }

  #waterfall = null;
  renderWaterfallInto(container) {
    if(this?.parentNode?.end != "full") {
      console.error("cannot render waterfalls for filmstrips that specify an 'end' other than 'full'");
      return;
    }
    if(!this.#waterfall) {
      this.#waterfall = this.#setupFigure(container, "waterfall-figure", true);
    } else {
      // Ensure order
      container.appendChild(this.#waterfall);
    }
    if(!this.data) { return; }
    let wqs = eqs(this.#waterfall);
    wqs("a").href = this.data.summary;
    wqs("img").src = this.#relativeImgURL(this.data.waterfall);
    wqs("figcaption").innerText = this.summary; 
    this.#waterfall.style.setProperty("--wpt-test-length", this?.data?.fullyLoaded);
  }


  #connections = null;
  renderConnectionsInto(container) {
    if(this?.parentNode?.end != "full") {
      console.error("cannot render connections for filmstrips that specify an 'end' other than 'full'");
      return;
    }
    if(this.#connections) {
      container.appendChild(this.#connections);
      return;
    }
    if(!this.data) { return; }
    let w = this.#connections = this.#setupFigure(container, "container-figure", true);
    qs(w, "a").href = this.data.summary;
    qs(w, "img").src = this.#relativeImgURL(this.data.connectionView);
    // TODO: factor out
    qs(w, "figcaption").textContent = `Connections and utilization. ${this.data.view == "firstView" ? "First" : "Repeat" } view, ${(this.data.bwDown / 1000).toFixed(1)}/${(this.data.bwUp / 1000).toFixed(1)}Mbps, ${this.data.latency}ms RTT.`;
      this.#connections.style.setProperty("--wpt-test-length", this?.data?.fullyLoaded);
  }

  // TODO: implement Anna Tudor's pie charts:
  // https://codepen.io/thebabydino/pen/XWvKjJJ
  static breakdownTemplate = templateFor(`
    <table part="breakdown-table">
      <caption></caption>
      <thead>
        <tr>
          <th>Type</th>
          <th>Wire Size</th>
          <th>Decoded</th>
          <th>Requests</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th></th>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      </tbody>
    </table>
  `);
  #kbFormatter = new Intl.NumberFormat('en', {
    style: 'unit',
    unit: 'kilobyte',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });

  #breakdown = null;
  renderBreakdownInto(container) {
    if(this.#breakdown) {
      container.appendChild(this.#breakdown);
      return;
    }
    if(!(this?.data?.breakdown)) { return; }
    delete this.data.breakdown.flash;

    // Build the breakdown table and chart
    container.appendChild(WPTTest.breakdownTemplate.cloneNode(true));
    let bdt = this.#breakdown = container.lastElementChild;

    // Caption
    let c = qs(bdt, "caption");
    c.textContent = `${this.location}, ${this.#view} view`;

    // Fill the rows with data
    let rt = qs(bdt, "tbody > tr");
    rt.remove();
    let total = {
      bytes: 0,
      bytesUncompressed: 0,
      requests: 0,
    };
    for(let [ k, v ] of Object.entries(this.data.breakdown)) {
      if(v.bytes === 0) { continue; }
      total.bytes += v.bytes;
      total.bytesUncompressed += v.bytesUncompressed;
      total.requests += v.requests;
    }
    this.data.breakdown.Total = total;
    for(let [ k, v ] of Object.entries(this.data.breakdown)) {
      // if(v.bytes === 0) { continue; }
      let r = rt.cloneNode(true);
      r.firstElementChild.textContent = k;
      r.children[1].textContent = this.#kbFormatter.format(v.bytes / 1000);
      r.children[2].textContent = this.#kbFormatter.format(v.bytesUncompressed / 1000);
      r.children[3].textContent = v["requests"];
      bdt.tBodies[0].appendChild(r);
    }
  }

  static cruxTemplate = templateFor(`
  <div class="crux">
    <!-- <h3 class="summary"></h3> -->
    <h3 class="details"></h3>
    <div class="metric">
      <h4 class="title"></h3>
      <p class="value"></p>
      <p class="pct">At 75th percentile of visits</p>
      <ul></ul>
      <div class="thresholds">
        <div>
          <span class="key good">&nbsp;</span>
          Good
          (&lt; <span class="goodValue"></span>)
        </div>
        <div>
          <span class="key fair">&nbsp;</span>
          Fair
        </div>
        <div>
          <span class="key poor">&nbsp;</span>
          Poor
          (&#8805; <span class="poorValue"></span>)
        </div>
      </div>
    </div>
  </div>
  `);

  #metrics = {
    "fcp": {
      name: "first_contentful_paint",
      title: "First Contentful Paint",
    },
    "lcp": {
      name: "largest_contentful_paint",
      title: "Largest Contentful Paint",
    },
    "inp": {
      name: "interaction_to_next_paint",
      title: "Interaction to Next Paint",
    },
    "cls": {
      name: "cumulative_layout_shift",
      title: "Cumulative Layout Shift",
      unitless: true,
    },
    "ttfb": {
      // TODO: Handle non-experimental?
      name: "experimental_time_to_first_byte",
      title: "Time to First byte",
    },
    // Not adding FID
  };

  #states = ["good", "fair", "poor"];

  #crux = null;
  renderCruxInto(container, metrics=["inp", "lcp", "cls"]) {
    if(this.#crux || !(this?.data?.crux)) { return; }
    container.appendChild(WPTTest.cruxTemplate.cloneNode(true));
    let ct = this.#crux = container.lastElementChild;
    let metricTemplate = qs(ct, ".metric");
    metricTemplate.remove();
    let cd = this.data.crux; 
    // let url = cd.key.url;
    for(let tla of metrics) {
      let v = this.#metrics[tla];
      if(!v){ continue; }

      /*
      if(tla === "rtt") {
        // TODO
      }
      if(tla === "traffic") {
        // TODO
      }
      */

      let md = cd.metrics[v.name];
      let m = metricTemplate.cloneNode(true);
      qs(m, ".title").textContent = 
          `${v.title} (${tla.toUpperCase()})`;
      let value = md.percentiles.p75;
      let formatted = value;
      let formattedGood = md.histogram[0].end;
      let formattedPoor = md.histogram[2].start;
      if(!v.unitless) {
        formatted = `${value / 1000}s`;
        formattedGood = `${formattedGood / 1000}s`;
        formattedPoor = `${formattedPoor / 1000}s`;
      }
      let judgement = "good";
      if(value > md.histogram[1].end) {
        judgement = "poor";
      } else if(value > md.histogram[0].end) {
        judgement = "fair";
      } 
      qs(m, ".value").textContent = `${formatted} (${judgement})`;
      // TODO: color the text
      // qs(m, ".value").classList.add(judgement);

      // TODO: put marker on the chart at correct location

      let list = qs(m, "ul");     
      this.#states.forEach((n, i) => {
        let pct = parseInt(md.histogram[i].density * 100) + "%";
        let li = document.createElement("li");
        li.textContent = pct;
        li.style.flexBasis = pct;
        li.classList.add(n);
        list.appendChild(li);
      });

      qs(m, ".goodValue").textContent = formattedGood;
      qs(m, ".poorValue").textContent = formattedPoor;

      ct.appendChild(m);
    }

    let fd = cd.collectionPeriod.firstDate;
    let ld = cd.collectionPeriod.lastDate;
    let formatOpts = { 
      year: "numeric", 
      month: "long", 
      day: "numeric"
    };
    let startDate = (new Date(`${fd.year}-${fd.month}-${fd.day}`))
                      .toLocaleDateString("en", formatOpts);
    let endDate = (new Date(`${ld.year}-${ld.month}-${ld.day}`))
                      .toLocaleDateString("en", formatOpts);
    // new ....toLocaleDateString("en", )
    let isMobile = (cd.key.formFactor == "PHONE");
    qs(ct, ".details").textContent = `Web Vitals data for Chrome ${ isMobile ? "mobile" : "desktop" } users from ${startDate} to ${endDate}`;
  }


  #setMediaDimensions(figure, media) {
      // TODO: wire up dimensions from:
      //
      // "gifImageData": {
      //   "format": "gif",
      //   "width": 520,
      //   "height": 680,
      //   ...
      //   "loop": 0,
      //   "background": { "r": 0, "g": 255, "b": 0 },
      //   "hasProfile": false,
      //   "hasAlpha": true,
      //   "autoOrient": { "width": 520, "height": 680 }
      // },
      // "gifImageAspectRatio": "520 / 680"
      if(!this.data) { return; }
      let id = this.data.gifImageData;
      figure.style.width = media.style.width = "100%";
      media.style.maxWidth = `${id.width}px`;
      media.style.aspectRatio = this.data.gifImageAspectRatio;
  }

  static videoTemplate = templateFor(`
  <figure part="video-figure">
    <video 
      controls
      preload="metadata"
      loading="lazy">
    </video>
    <figcaption></figcaption>
  </figure>
  `);

  #video = null;
  renderVideoInto(container) {
    if(this.#video || !this.data) { return; }
    container.appendChild(WPTTest.videoTemplate.cloneNode(true));
    let figure = this.#video = container.lastElementChild;
    let v = figure.querySelector("video");
    v.poster = this.#relativeImgURL("poster.png");
    v.src = this.#relativeImgURL("timeline.mp4");
    this.#setMediaDimensions(v, figure);
    // TODO: set captions and alt
  }

  #gif = null;
  renderGifInto(container) {
    if(this.#gif || !this.data) { return; }
    let figure = this.#gif = this.#setupFigure(container, "gif-figure");
    let gif = figure.querySelector("img");
    gif.src = this.#relativeImgURL("timeline.gif");
    this.#setMediaDimensions(gif, figure);
  }


  // TODO: lazy loading isn't working right in FF
  static imgTemplate = templateFor(`
    <td>
      <img loading="lazy" decoding="async">
      <div class="pct"></div>
    </td>
  `);

  getFrames(interval, frameCount) {
    let framesMeta = Array.from(this.data.filmstripFrames);
    let frames = [];

    let current = 0;

    let advanceTo = (cutoff=0) => {
      if(framesMeta[0].time < cutoff) {
        while(
          (framesMeta[0].time < cutoff) &&
          (framesMeta[1]) &&
          (framesMeta[1].time < cutoff)
        ) {
          framesMeta.shift();
        }
      }
      return framesMeta[0];
    };

    // TODO: allow for configuration of other sorts of end frames, e.g.
    // `visualComplete`, `fullyLoaded`, etc.

    // Walk forward
    // while(current <= (this.data.visualComplete + interval)) {
    while(current <= (this.duration + interval)) {
      let i = this.getFilmstripImage(advanceTo(current));
      if(frames.length < 5) {
        i.querySelector("img").removeAttribute("loading");
      }
      frames.push(i);
      current += interval;
    }
    return frames;
  }

  getFilmstripImage(meta) {
    let fragment = WPTTest.imgTemplate.cloneNode(true);
    let i = fragment.querySelector("img");
    i.src = this.#relativeImgURL(meta.image);
    let d = fragment.querySelector("div");
    d.innerText = `${meta.VisuallyComplete}%`;
    return fragment.firstElementChild;
  }

}
customElements.define(WPTTest.tagName, WPTTest);

export default WPTFilmstrip;
