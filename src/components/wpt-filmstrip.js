/**
 * TODO:
 *
 * - disable filmstrip view
 * - waterfall view & styling + :part()s
 * - video view
 * - image aspect ratios and content-visibility
 * - theme support
 * - filmstrip styling for timeline events:
 *    https://nooshu.com/blog/2019/10/02/how-to-read-a-wpt-waterfall-chart/#what-do-the-filmstrip-thumbnail-border-colours-signify
 * - expose as a webc plugin for 11ty
 * - options to display connection and device params
 * - options to embed video, timeline, and connections
 * - sync'd scroll for timeline and waterfall/connections
 * - "play" button?
 */

CSS.registerProperty({
  name: "--scroll-pct",
  syntax: "<percentage>",
  inherits: true,
  initialValue: "0%",
});

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
    "waterfall",
    "connections",
    "breakdown",
    "video",
    "gif",
  ];

  static styles = `
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
    @property --scroll-pct {
      syntax: "<percentage>";
      inherits: true;
      initial-value: 0%;
    }
    */

    * {
      box-sizing: border-box;
    }
    :host {
      timeline-scope: --filmstrip-scroller;

      --image-width: 100px;
      --progress-line-color: red;
      --progress-line-width: 2px;
    }

    /*
    :host {
      --no-change-border-color: transparent;
      --visual-change-border-color: yellow;
      --lcp-border-color: red;
    }
    */

    :host([debug]) {
      * {
        outline: 1px solid blue;
      }
    }

    table {
      border-collapse: collapse;
    }

    #scroll-container {
      overflow-x: auto;
      width: 100%;
      padding: 1em;
      display: flex;
      flex-direction: column;

      scroll-timeline-axis: x;
      scroll-timeline-name: --filmstrip-scroller;
    }
    :host([waterfall]),
    :host([connections]) {
      #scroll-container {
        border-left: var(--progress-line-width) solid var(--progress-line-color);
      }
    }

    #main-table {
      width: 100%;
      top: 0px;
      left: 0px;
      margin-right: calc(100%);
    }

    .filmstrip-row {
      margin-right: calc(100%);

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
      --image-width: 50px;
    }

    :host([size="medium"]) {
      --image-width: 50px;
    }

    :host([size="large"]) {
      --image-width: 200px;
    }

    .filmstrip-row img {
      width: var(--image-width, 100px);
      contain-intrinsic-width: var(--image-width, 100px);
      aspect-ratio: var(--aspect-ratio);
    }

    .filmstrip-meta {
      padding: 1em;
    }

    .hidden { display: none; }

    @keyframes scrollTransform {
      from {
        --scroll-pct: var(--line-pct-left, 24.6%);
      }
      to {
        --scroll-pct: 100%;
      }
    }

    /*
     * These images are all 1012px wide, with insets for legends, 
     * resource names, and utilization (at the bottom). For our 
     * following red line, we need to place it with offsets relative 
     * to how the image is scaled.
     */

    #waterfall,
    #connections {
      & figure {
        --natural-width: 1012px;
        --natural-height: 207px;
      }

      overflow-x: auto;
      width: 100%;

      & picture {
        width: 100%;
        max-width: 1012px;
        display: inline-block;
        position: relative;
        contain: content;
        margin: 0;
        padding: 0;
        border: 0;

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
        width: var(--progress-line-width);

        /* TODO: 
            really hate that we're animating left, but it's both simple to set up to be relative and can be set using the timeline very easily
        */
        left: var(--scroll-pct);
        top: var(--line-pct-top, 37px);
        bottom: var(--line-pct-bottom, 170px);

        background-color: var(--progress-line-color);
        opacity: 0.8;

        will-change: left;

        animation: scrollTransform linear;
        animation-timeline: --filmstrip-scroller;
      }
    }
  `;

  static template = templateFor(`
  <div id="scroll-container">
    <table id="main-table">
      <tbody>
        <tr id="timing">
        </tr>
      </tbody>
    </table>
  </div>
  <div id="waterfall" class="hidden"></div>
  <div id="connections" class="hidden"></div>
  <div id="breakdown" class="hidden"></div>
  <div id="gif" class="hidden"></div>
  <div id="video" class="hidden"></div>
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

  #attrToBool(value, attr) {
    if(typeof value === "string") {
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
  }

  #_waterfall = false;
  set waterfall(v) {
    this.#_waterfall = this.#attrToBool(v, "waterfall");
    // TODO
  }

  #_connections = false;
  set connections(v) {
    this.#_connections = this.#attrToBool(v, "connections");
    // TODO
  }

  #_breakdown = false;
  set breakdown(v) {
    this.#_breakdown = this.#attrToBool(v, "breakdown");
    // TODO
  }

  #_video = false;
  set video(v) {
    this.#_video = this.#attrToBool(v, "video");
    // TODO
  }

  #_gif = false;
  set gif(v) {
    this.#_gif = this.#attrToBool(v, "gif");
    // TODO
  }

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
    this.byId("timing").replaceChildren(...timings);

    this.#tests.forEach((t) => {
      t.renderTimelineInto(
        this.#_intervalMs,
        timings.length,
        this.byId("main-table").tBodies[0]
      );

      // TODO: DRY
      let c = this.byId("waterfall");
      this.#_matchHiddenState(this.#_waterfall, c);
      if(this.#_waterfall) { t.renderWaterfallInto(c); }

      c = this.byId("connections");
      this.#_matchHiddenState(this.#_connections, c); 
      if(this.#_connections) { t.renderConnectionsInto(c); }

      c = this.byId("breakdown");
      this.#_matchHiddenState(this.#_breakdown, c); 
      if(this.#_breakdown) { t.renderBreakdownInto(c); }

      c = this.byId("video");
      this.#_matchHiddenState(this.#_video, c); 
      if(this.#_video) { t.renderVideoInto(c); }

      c = this.byId("gif");
      this.#_matchHiddenState(this.#_gif, c); 
      if(this.#_gif) { t.renderGifInto(c); }
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
    "timeline",
    "timeline-video",
    "aspect-ratio",
  ];

  static tagName = "wpt-test";
  get tagName() { return this.constructor.tagName; }

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

  get duration() {
    return this?.data?.visualComplete || 0;
  }

  async updateTimeline(url) {
    if( (!url) || (url === this.#_timeline)) { return; }

    this.#_timeline = url;
    // Fetch and parse
    let r = await fetch(url);
    this.data  = await r.json();
    this.#maybeNotify();
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
  extract() {
    if(this.#fragStart) {
      if(this.#extracted) { return this.#extracted; }
      let r = new Range();
      r.setStartBefore(this.#fragStart);
      r.setEndAfter(this.#fragEnd);
      this.#extracted = r.extractContents();
      r.detach();
      return this.#extracted;
    }
  }

  disconnectedCallback() {
    this.extract();
  }

  renderTimelineInto(interval=100, frameCount, container) {
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
    f.querySelector(".test-link").setAttribute("href", this.data.summary);
    f.querySelector(".meta").setAttribute("colspan", frameCount);
    f.querySelector(".label").innerText = this.label || this.data.url;
    let frames = this.getFrames(interval, frameCount);
    let r = f.querySelector(".filmstrip-row");
    r.replaceChildren(...frames);
    r.style.setProperty("--aspect-ratio", this.data.filmstripImageAspectRatio);
    container.append(f);
    this.#extracted = null;
  }

  #_timelineURL = null;
  #relativeImgURL(path) {
    if(!this.#_timelineURL) {
      this.#_timelineURL = new URL(this.#_timeline, window.location);
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

  #setupFigure(container) {
    container.appendChild(WPTTest.figureTemplate.cloneNode(true));
    let figure = container.lastElementChild;
    let img = figure.querySelector("img");
    img.addEventListener("load", (e) => {
      let nw = img.naturalWidth;
      let nh = img.naturalHeight;
      // FF still doesn't support attributeStyleMap...*sigh*
      // figure.attributeStyleMap.set("--natural-width", `${nw}px`);
      // figure.attributeStyleMap.set("--natural-height", `${nh}px`);

      figure.style.setProperty("--natural-width", `${nw}px`);
      figure.style.setProperty("--natural-height", `${nh}px`);

      // CSS calc() can't convert to percentages, so we do it here instead
      figure.style.setProperty("--line-pct-top", `${(37 / nh).toFixed(5) * 100 }%`);
      figure.style.setProperty("--line-pct-left", `${(250 / nw).toFixed(5) * 100 }%`);
      figure.style.setProperty("--initial-line-pct-left", `${(250 / nw).toFixed(5) * 100 }%`);
      figure.style.setProperty("--initial-area-pct", `${100 - ((250 / nw).toFixed(5) * 100) }%`);
      figure.style.setProperty("--line-pct-bottom", `${(170/ nh).toFixed(5) * 100 }%`);
    });
    return figure;
  }

  #waterfall = null;
  renderWaterfallInto(container) {
    if(!this.#waterfall) {
      this.#waterfall = this.#setupFigure(container);
    } else {
      // Ensure order
      container.appendChild(this.#waterfall);
    }
    if(this.data) {
      let w = this.#waterfall;
      w.querySelector("a").href = this.data.summary;
      w.querySelector("img").src = this.#relativeImgURL(this.data.waterfall);
      // TODO: fixup innerHTML use
      w.querySelector("figcaption").innerHTML = `${this.data.testUrl} tested from ${this.data.from}; ${this.data.view == "firstView" ? "first" : "repeat" } view`;
    }
  }


  #connections = null;
  renderConnectionsInto(container) {
    if(!this.#connections) {
      this.#connections = this.#setupFigure(container);
    } else {
      container.appendChild(this.#connections);
    }
    if(this.data) {
      let w = this.#connections;
      w.querySelector("a").href = this.data.summary;
      w.querySelector("img").src = this.#relativeImgURL(this.data.connectionView);
      w.querySelector("figcaption").textContent = `Connections and utilization. ${this.data.view == "firstView" ? "First" : "Repeat" } view, ${(this.data.bwDown / 1000).toFixed(1)}/${(this.data.bwUp / 1000).toFixed(1)}Mbps, ${this.data.latency}ms RTT.`;
    }
  }

  #breakdown = null;
  renderBreakdownInto(container) {
    // console.log("renderBreakdownInto:", container);
    // console.log(container);
    if(!this.#breakdown) {
      // Build the breakdown table and chart
    }
  }

  #video = null;
  renderVideoInto(container) {
    // console.log("renderVideoInto:", container);
    // console.log(container);
    if(!this.#video) {
      // Build the video
    }
  }

  #gif = null;
  renderGifInto(container) {
    // console.log("renderGifInto:", container);
    // console.log(container);
    if(!this.#gif) {
      // Build the gif
    }
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
    while(current <= (this.data.visualComplete + interval)) {
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

  constructor() {
    super();
  }

}
customElements.define(WPTTest.tagName, WPTTest);

export default WPTFilmstrip;
