/**
 * TODO:
 *
 * - pie charts in breakdown
 * - CPU and interactive charts
 * - Highlight low compression ratios and large payloads
 * - theme support
 * - legend for timeline event colors:
 *    https://nooshu.com/blog/2019/10/02/how-to-read-a-wpt-waterfall-chart/#what-do-the-filmstrip-thumbnail-border-colours-signify
 * - expose as a webc plugin for 11ty
 * - options to display connection and device params
 * - "play" button?
 * - data sharing back-plane
 */
let ver = `
wpt-embed.js, 0.2.17
Copyright 2024-2025
Alex Russell -- infrequently.org
Licensed under the MIT license.
`;

// For lit syntax highlighting
let css = function(strs, subs) {
 if (strs?.length > 1 || subs?.length > 1) {
  throw "`css` tag called with values"; 
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
  let _c = new Map(); // Cache
  return (s) => {
    let _s = _c.get(s); // TODO: benchmark
    if (_s) { return _s; }
    _s = s.replace(/(-)+([a-z]?)/g, (m, g0, g1, offset) => {
      let c = m[m.length-1];
      if(!offset) { return c; }
      return (c === "-") ? "" : c.toUpperCase();
    });
    _c.set(s, _s);
    return _s;
  };
})();

let templateFor = (str) => {
  // No caching because this is only called by statics
  let t = document.createElement("template");
  t.innerHTML = str;
  return t.content;
};

// This is a lot of alloc, but it's cheaper than Intl init
let kbFormat = (kb=0) => {
  if(!kb || kb < 1) { return Math.round(kb) + " kB"; }
  let kbs = Math.round(kb) + "";
  let segments = [];
  let len = kbs.length;
  while(len > 3) {
    segments.unshift(kbs.slice(-3));
    kbs = kbs.slice(0, len - 3);
    len = kbs.length;
  }
  segments.unshift(kbs);
  let ret = segments.join(",") + " kB";
  return ret;
};

class WPTEmbed extends HTMLElement {

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
    "order",
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

  * {
    box-sizing: border-box;
  }

  :host {
    timeline-scope: --wpt-embed-scroller;

    --wpt-image-width: var(--image-width, 100px);
    --wpt-progress-line-color: transparent;
    --wpt-progress-line-width: 0px;

    @supports ((animation-timeline: scroll()) and (animation-range: 0% 100%)) {
      --wpt-progress-line-color: red;
      --wpt-progress-line-width: 2px;
    }

    --wpt-section-padding: 1rem 0;

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
  
  #filmstrip {
    overflow-x: auto;
    display: block;
    position: relative;
    scrollbar-gutter: stable;

    scroll-timeline-axis: x;
    scroll-timeline-name: --wpt-embed-scroller;
  }

  /* TODO: elide when there's no filmstrip */
  :host([waterfall]),
  :host([connections]) {
    #filmstrip {
      border-left: var(--wpt-progress-line-width) solid var(--wpt-progress-line-color);
    }
    #filmstrip.hidden { display: none; }
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
      margin-inline: 2px;
      outline: 1px solid black;
      content-visibility: auto;
    }

    & .pct {
      text-align: center;
    }

    & .visualChange > img {
      outline: var(
        --wpt-visual-change-outline,
        2px solid #ffc233
      );
    }

    & .lcp > img {
      outline: var(--wpt-lcp-outline, 2px solid #ff0000);
    }

    & .layoutShift.visualChange > img {
      outline: var(
        --wpt-layout-shift-visual-change-outline, 
        2px dotted #ffc233
      );
    }
    & .layoutShift.lcp > img {
      outline: var(
        --wpt-layout-shift-lcp-outline, 
        2px dotted #ff0000
      );
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
    --wpt-image-width: 100px;
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
    font-size: 0.8rem;

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

        --good: var(--wpt-crux-good, rgb(12, 206, 107));
        --fair: var(--wpt-crux-fair, rgb(255, 164, 0));
        --poor: var(--wpt-crux-poor, rgb(255, 78, 66));

        /* TODO: themes & contrast */
        & .good {
          background-color: var(--good);
          color: white;
        }
        & .fair {
          background-color: var(--fair);
        }
        & .poor {
          background-color: var(--poor);
          color: white;
        }

        & .value {
          background-color: inherit;
          &.good { color: var(--good); }
          &.fair { color: var(--fair); }
          &.poor { color: var(--poor); }
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
      left: var(--wpt-scroll-pct);
      top: var(--wpt-line-pct-top, 37px);
      bottom: var(--wpt-line-pct-bottom, 170px);

      background-color: var(--wpt-progress-line-color);
      opacity: 0.8;

      will-change: left;

      animation: scrollTransform linear(0, var(--wpt-start-stop) 0%, 1 var(--wpt-end-stop) 90%);
      animation-timeline: --wpt-embed-scroller;
    }
  }

  /**************
    * 
    * Misc
    * 
    ***/
  #gif,
  #video,
  #breakdown {
    flex-wrap: wrap;
  }
  `;

  static template = templateFor(`
  <div id="filmstrip" part="filmstrip">
    <table id="main-table">
      <tbody>
        <tr id="timing"></tr>
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

  static tagName = "wpt-embed";
  get tagName() { return this.constructor.tagName; }

  constructor() {
    super();
    let shadow = this.attachShadow({ mode: "open" });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if(
      WPTEmbed.observedAttributes.includes(name) &&
      oldValue !== newValue
    ) {
      let n = toCamelCase(name);
      this[n] = newValue;
    }
  }

  // FIXME(slightlyoff): Intl is very slow to initialize
  // #_tf = Intl.NumberFormat("en-US", {
  //   minimumFractionDigits: 1
  // });
  #_intervalMs = 100;
  #_interval = "100";
  #_mfd = 1;
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
        this.#_mfd = 3;
        break;
      case "1000":
      case "1000ms":
      case "1s":
        this.#_intervalMs = 1000;
        this.#_mfd = 0;
        break;
      case "5000":
      case "5000ms":
      case "5s":
        this.#_intervalMs = 5000;
        this.#_mfd = 0;
        break;
      case "500":
      case "500ms":
      case "0.5s":
        this.#_intervalMs = 500;
        this.#_mfd = 1;
        break;
      case "100":
      case "100ms":
      case "0.1s":
      default:
        this.#_intervalMs = 100;
        this.#_mfd = 1;
        break;
    }
    // this.#_tf = Intl.NumberFormat("en-US", { 
    //   minimumFractionDigits: this.#_mfd 
    // });
    if (this.#_intervalMs !== oldIntervalMS) {
      this.updateTests();
    }
  }
  get interval() { return this.#_interval; }
  // TODO: caching
  getTimingFor(ms=0) {
    let td = document.createElement("td");
    let s = document.createElement("span");
    // Build format string
    let int = Math.trunc(ms / 1000);
    let rem = Math.abs(int ? ((1000 * int) - ms) : ms);
    let num = int+"";
    if(this.#_mfd) {
      num += "." + (rem + "").padEnd("0", this.#_mfd).substring(0, this.#_mfd);
    } 
    s.innerText = num;
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
  set connections(v) { this.#connections = attrToBool(v, "connections"); }
  get connections() { return this.#connections; }

  #breakdown = false;
  set breakdown(v) { this.#breakdown = attrToBool(v, "breakdown"); }
  get breakdown() { return this.#breakdown; }

  #crux = [];
  set crux(v) {
    this.#crux = attrToList(v, "crux", ["inp", "lcp", "cls"]);
  }
  get crux() { return this.#crux; }

  #video = false;
  set video(v) { this.#video = attrToBool(v, "video"); }
  get video() { return this.#video; }

  #gif = false;
  set gif(v) { this.#gif = attrToBool(v, "gif"); }
  get gif() { return this.#gif; }

  #order = [];
  set order(v) { this.#order = attrToList(v, "order", []); }
  get order() { return this.#order; }

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
    let hidden = true;
    if((typeof value === "string") || Array.isArray(value)) {
      hidden = !(value.length);
    } else {
      hidden = !(value);
    }
    el.classList[ hidden ? "add" : "remove" ]("hidden");
    return el;
  }

  updateTests() {
    if(!this.#wired) { return; }
    let tests = this.#tests;
    // Avoid rendering if we don't have all the data
    for(let x of tests) { if(!x.data) return; }
    // Get the maximum duration
    let durations = tests.map((t) => { return t.duration; })
    let end = Math.max(...durations) + this.#_intervalMs;
    let timings = [];
    for(let x=0; x <= end; x+=this.#_intervalMs) {
      timings.push(this.getTimingFor(x));
    }
    if(this.filmstrip) {
      this.byId("timing").replaceChildren(...timings);
    }

    if(this.#order.length) {
      this.shadowRoot.prepend(
        ...(this.#order.map((id) => this.byId(id)))
      );
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
        this.byId("filmstrip").classList.add("hidden");
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

    addStyles(sr, WPTEmbed.styles);

    sr.appendChild(WPTEmbed.template.cloneNode(true));

    this.addEventListener("test-modified", this.updateTests);
  }
}
customElements.define(WPTEmbed.tagName, WPTEmbed);
// Support for <= 0.2.10 where <wpt-embed> was named <wpt-filmstrip>
customElements.define("wpt-filmstrip", (class WPTFilmstrip extends WPTEmbed {}));

/**
 * Does not render its own Shadow DOM due to the <table> based layout,
 * but owns data for a single timeline, loads it, and notifies the parent when
 * re-rendering is required. Must be nested inside a <wpt-embed>.
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
      this.#dirty = false;
    }
  }

  #connected = false;
  connectedCallback() {
    if(this.parentNode &&
       this.parentNode?.tagName === WPTEmbed.tagName) {
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
      let test = `${dir}${cfg.testName || cfg.id}/runs/${cfg.run}/${cfg.view}/timeline.json`;
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

  #attributesSet = false;
  attributeChangedCallback(name, oldValue, newValue) {
    this.#attributesSet = true;
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

  // TODO: should decoding be async? What about lazy loading?
  static figureTemplate = templateFor(`
<figure>
  <a target="_blank">
    <picture>
      <img loading="lazy" decoding="async">
    </picture>
  </a>
  <figcaption></figcaption>
</figure>
  `);

  #setupFigure(container, 
               src="", 
               name="", 
               alt="", 
               target="", 
               caption="",
               timeline=false) {
    container.appendChild(WPTTest.figureTemplate.cloneNode(true));
    let fig = container.lastElementChild;
    let fqs = eqs(fig);
    if(name) { 
      fig.setAttribute("part", name);
    }
    let img = fqs("img");
    if(src) { img.src = src; }
    img.alt = alt;
    if(target) { fqs("a").href = target; }
    if(caption) { fqs("figcaption").textContent = caption ; }
    if(timeline) {
      img.addEventListener("load", (e) => {
        let nw = img.naturalWidth;
        let nh = img.naturalHeight;

        // CSS calc() can't convert to percentages, so we do it here instead
        fig.style.setProperty("--wpt-line-pct-top", `${(37 / nh).toFixed(5) * 100 }%`);

        fig.style.setProperty("--wpt-start-stop", `${(250 / nw).toFixed(5)}`);

        fig.style.setProperty("--wpt-line-pct-bottom", `${(170/ nh).toFixed(5) * 100 }%`);
      });
      fig.style.setProperty(
        "--wpt-test-length",
        this?.data?.fullyLoaded
      );
    }
    return fig;
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
    if(!this.data) { return; }
    if(this?.parentNode?.end != "full") {
      console.error("'end' must be 'full' to display waterfall");
      return;
    }
    if(!this.#waterfall) {
      this.#waterfall = this.#setupFigure(
        container, 
        this.#relativeImgURL(this?.data?.waterfall),
        "waterfall-figure",
        `Resource waterfall chart for ${this.location}.`,
        this.data.summary,
        this.summary,
        true
      );
    } else {
      // Ensure order
      container.appendChild(this.#waterfall);
    }
  }

  #connections = null;
  renderConnectionsInto(container) {
    if(this?.parentNode?.end != "full") {
      console.error("'end' must be 'full' to display connections");
      return;
    }
    if(this.#connections) {
      container.appendChild(this.#connections);
      return;
    }
    this.#connections = this.#setupFigure(
      container, 
      this.#relativeImgURL(this.data.connectionView),
      "container-figure",
      `Network connections chart for ${this.location}.`,
      this.data.summary,
      `Connections and utilization. ${this.data.view == "firstView" ? "First" : "Repeat" } view, ${(this.data.bwDown / 1000).toFixed(1)}/${(this.data.bwUp / 1000).toFixed(1)}Mbps, ${this.data.latency}ms RTT.`,
      true
    );
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
      r.children[1].textContent = kbFormat(v.bytes / 1000);
      r.children[2].textContent = kbFormat(v.bytesUncompressed / 1000);
      r.children[3].textContent = v["requests"];
      bdt.tBodies[0].appendChild(r);
    }
  }

  static cruxTemplate = templateFor(`
<div class="crux">
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
      qs(m, ".value").classList.add(judgement);

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
    let fdm = (fd.month + "").padStart(2, "0");
    let fdd = (fd.day+ "").padStart(2, "0");
    // FIXME(slightlyoff): toLocaleDateString is slow to init
    let startDate = (new Date(`${fd.year}-${fdm}-${fdd}`))
                      .toLocaleDateString("en", formatOpts);
    let ldm = (ld.month + "").padStart(2, "0");
    let ldd = (ld.day+ "").padStart(2, "0");
    let endDate = (new Date(`${ld.year}-${ldm}-${ldd}`))
                      .toLocaleDateString("en", formatOpts);
    // new ....toLocaleDateString("en", )
    let isMobile = (cd.key.formFactor == "PHONE");
    let host = (new URL(this.data.crux.key.url)).host;
    qs(ct, ".details").textContent = `Web Vitals data for ${ host }. Collected from Chrome ${ isMobile ? "mobile" : "desktop" } users, ${startDate} – ${endDate}.`;
  }


  #setMediaDimensions(figure) {
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
      let m = figure.querySelector("img,video");
      [figure, m].forEach((el) => {
        el.style.width = "100%";
        el.style.maxWidth = `${id.width}px`;
        el.aspectRatio = this.data.gifImageAspectRatio;
      });
  }

  static videoTemplate = templateFor(`
  <figure part="video-figure">
    <video controls preload="none">
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
    this.#setMediaDimensions(figure);
    // TODO: set captions and alt
  }

  #gif = null;
  renderGifInto(container) {
    if(this.#gif || !this.data) { return; }
    let figure = this.#gif = this.#setupFigure(
      container, 
      this.#relativeImgURL("timeline.gif"),
      "gif-figure",
      `Loading ${this.location} took ${this.duration / 1000} seconds.`
    );
    this.#setMediaDimensions(figure);
  }


  // TODO: lazy loading isn't working right in FF
  static imgTemplate = templateFor(`
  <td>
    <img loading="lazy" decoding="async">
    <div class="pct"></div>
  </td>`);

  getFrames(interval, frameCount) {
    let framesMeta = Array.from(this.data.filmstripFrames);
    let frames = [];

    let current = 0;

    let LCPs  = Array.from(this.data?.lcps || []);
    let LSs = Array.from(this.data?.layoutShifts || []);

    let advanceTo = (cutoff=0) => {
      if(framesMeta[0].time < cutoff) {
        while(
          (framesMeta[0].time < cutoff) &&
          (framesMeta[1]) &&
          (framesMeta[1].time <= cutoff)
        ) {
          framesMeta.shift();
        }
      }
      return framesMeta[0];
    };

    let nextLCP = LCPs.shift();
    let nextLS = LSs.shift();
    // Walk forward
    let lastMeta = null;
    let thisMeta = null;
    while(current <= (this.duration + interval)) {
      let lastMeta = thisMeta;
      thisMeta = advanceTo(current);
      let r = this.getFilmstripImage(thisMeta);
      let img = qs(r, "img");
      if(frames.length < 5) {
        img.removeAttribute("loading");
      }
      if(lastMeta && (lastMeta !== thisMeta)) {
        r.classList.add("visualChange");
      }
      if(nextLCP && current >= nextLCP) {
        nextLCP = LCPs.shift();
        r.classList.add("lcp");
      }
      if(nextLS && current >= nextLS) {
        nextLS = LSs.shift();
        r.classList.add("layoutShift");
      }
      img.alt = `${this.location} at ${current/1000}s, ${thisMeta.VisuallyComplete}% loaded.`; 
      frames.push(r);
      current += interval;
    }
    return frames;
  }

  getFilmstripImage(meta) {
    let fragment = WPTTest.imgTemplate.cloneNode(true);
    let td = fragment.children[0];
    td.children[0].src = this.#relativeImgURL(meta.image);
    td.children[1].textContent = `${meta.VisuallyComplete}%`;
    return td;
  }

}
customElements.define(WPTTest.tagName, WPTTest);

export default WPTEmbed;
