/**
 * TODO:
 * 
 * - :part() and theme support
 * - filmstrip styling for timeline events:
 *    https://nooshu.com/blog/2019/10/02/how-to-read-a-wpt-waterfall-chart/#what-do-the-filmstrip-thumbnail-border-colours-signify
 * - expose as a webc plugin for 11ty
 * - options to display connection and device params
 * - options to embed video, timeline, and connections
 * - sync'd scroll for timeline and connections
 * - "play" button?
 */

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

class WPTTestRenderer {

  testElement = null;

  get data() {
    return this?.testElement?.data;
  }

}

class WPTFilmstrip extends HTMLElement {

  static observedAttributes = [
    "aspect-ratio",
    "size",
    "interval",
  ];

  static styles = `
    * {
      box-sizing: border-box;
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

    #container {
      overflow-x: auto;
      width: 100%;
      padding: 1em;
    }

    #main-table {
      position: sticky;
      width: 100%;
      top: 0px;
      left: 0px;
      padding-right: 100%;
    }

    .filmstrip-row {
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
      .filmstrip-row img {
        width: 50px;
        contain-intrinsic-width: 50px;
      }
    }

    :host([size="medium"]) {
      .filmstrip-row img {
        width: 100px;
        contain-intrinsic-width: 100px;
      }
    }

    :host([size="large"]) {
      .filmstrip-row img {
        width: 200px;
        contain-intrinsic-width: 200px;
      }
    }

    .filmstrip-meta {
      padding: 1em;
    }
  `;

  static template = (() => {
    document.body.insertAdjacentHTML("beforeend", `
    <template>
      <div id="container">
        <table id="main-table">
          <tbody>
            <tr id="timing">
            </tr>
          </tbody>
        </table>
      </div>
    </template>`);
    return document.body.lastElementChild.content;
  })();

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

  connectedCallback() {
    this.wireElements();
  }

  get #tests() {
    // TODO: cache
    return Array.from(this.children).filter((e) => {
      return e.tagName === "wpt-test";
    });
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
      t.renderInto(
        this.#_intervalMs, 
        timings.length, 
        this.byId("main-table").tBodies[0]
      );
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
 * Does not renders its own Shadow DOM due to the <table> based layout, 
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
    "size",
    "test-name",
    "interval",
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

  static rowTemplate = (() => {
    document.body.insertAdjacentHTML("beforeend", `
    <template>
      <!-- start -->
      <tr class="meta-row">
        <td class="meta">
          <div class="labels">
            <a class="test-link" target="_new">
              <span class="test-name"></span>
            </a>
          </div>
        </td>
      </tr>
      <tr class="filmstrip-row">
      </tr>
      <!-- end -->
    </template>`);
    return document.body.lastElementChild.content;
  })();

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

  renderInto(interval=100, frameCount, container) {
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
    f.querySelector(".test-name").innerText = this.data.url;
    let frames = this.getFrames(interval, frameCount);
    f.querySelector(".filmstrip-row").replaceChildren(...frames);
    container.append(f);
    this.#extracted = null;
  }

  static imgTemplate = (() => {
    // TODO: lazy loading isn't working right in FF
    document.body.insertAdjacentHTML("beforeend", `
    <template>
      <td>
        <img loading="lazy" decoding="async">
        <div class="pct"></div>
      </td>
    </template>`);
    return document.body.lastElementChild.content;
  })();

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
      frames.push(this.getFilmstripImage(advanceTo(current)));
      current += interval;
    }
    return frames;
  }

  getFilmstripImage(meta) {
    let fragment = WPTTest.imgTemplate.cloneNode(true);
    let i = fragment.querySelector("img");
    let timelineSrc = new URL(this.#_timeline, window.location);
    let src = new URL(meta.image, timelineSrc);
    i.src = src.toString();
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
