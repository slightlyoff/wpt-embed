/**
 * TODO:
 * 
 * - refactor to support multiple, ordered <wpt-trace> 
 *   element children for comparative trace support
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

class WPTEmbedFilmstrip extends HTMLElement {

  // TODO: content-visibility and lazy loading for long filmstrips
  static styles = `
    * {
      box-sizing: border-box;
    }

    :host([debug]) {
      * {
        outline: 1px solid blue;
      }
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

    #filmstrip-row {
      & img {
        border: 1px solid black;

      }

      & .pct {
        text-align: center;
      }
    }

    #meta {
      text-align: left;
    }

    #labels {
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
      #filmstrip-row img {
        width: 50px;
      }
    }

    :host([size="medium"]) {
      #filmstrip-row img {
        width: 100px;
      }
    }

    :host([size="large"]) {
      #filmstrip-row img {
        width: 200px;
      }
    }

    #filmstrip-meta {
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
            <tr id="meta-row">
              <td id="meta">
                <div id="labels">
                  <a id="test-link" target="_new">
                    <span id="test-name"></span>
                  </a>
                </div>
              </td>
            </tr>
            <tr id="filmstrip-row">
            </td>
          </tbody>
        </table>
      </div>
    </template>`);
    return document.body.lastElementChild.content;
  })();

  static observedAttributes = [
    "test-id",
    "timeline-url",
    "timeline-video",
    "aspect-ratio",
    // "size",
    "test-name",
    "interval",
  ];

  constructor() {
    super();
    let shadow = this.attachShadow({ mode: "open" });
  }

  // #timingFormat = Intl.NumberFormat("en-US", {
  //   style: "unit",
  //   unit: "second",
  //   minimumFractionDigits: 1
  // });
  #_tf = Intl.NumberFormat("en-US", { minimumFractionDigits: 1 });
  #_intervalMs = 100;
  #_interval = "100";
  set interval(i) { 
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
      case "500":
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
    }
    this.#_tf = Intl.NumberFormat("en-US", { minimumFractionDigits: mfd });
    this.buildFilmstrip(); 
  }
  get interval()  { return this.#_interval; }

  #_timelineUrl = "";
  set timelineUrl(i) { this.updateTimeline(i); }
  get timelineUrl()  { return this.#_timelineUrl; }

  #_timelineData = null;
  async updateTimeline(url) {
    if( (!url) || (url === this.#_timelineUrl)) { return; }

    this.#_timelineUrl = url; 
    // Fetch and parse
    let r = await fetch(url);
    this.#_timelineData = await r.json();
    this.buildFilmstrip();
  }

  getFilmstripImage(meta) {
    let timelineSrc = new URL(this.#_timelineUrl, window.location);
    let src = new URL(meta.image, timelineSrc);
    let td  = this.shadowRoot.createElement("td");
    let i = this.shadowRoot.createElement("img");
    i.loading = "lazy";
    i.decodeing = "asyn";
    i.src = src.toString();
    td.appendChild(i);
    let d = this.shadowRoot.createElement("div");
    d.className = "pct";
    d.innerText = `${meta.VisuallyComplete}%`;
    td.appendChild(d);
    return td;
  }

  getTimingFor(ms=0) {
    let td  = this.shadowRoot.createElement("td");
    let s = this.shadowRoot.createElement("span");
    td.appendChild(s);
    s.innerText = this.#_tf.format(ms / 1000)+"s";
    return td;
  }

  buildFilmstrip() {
    if(!this.#_timelineData) { return; }
    let framesMeta = Array.from(this.#_timelineData.filmstripFrames);
    let timings = [];
    let frames = [];
    let end = this.#_timelineData.visualComplete;
    let current = 0;
    let currentMeta = framesMeta.shift();
    let nextMeta = framesMeta.shift();
    if(!currentMeta) { return; }
    while(current <= end) {
      // TODO: handle cases where initial frame isn't at 0
      if(current > nextMeta.time) {
        currentMeta = nextMeta;
        nextMeta = framesMeta.shift();
        frames.push(this.getFilmstripImage(currentMeta));
      } else if(!frames.length) {
        frames.push(this.getFilmstripImage(currentMeta));
      } else {
        // Make a clone, update text as appropriate
        let c = frames.at(-1).cloneNode(true);
        // TODO: update text
        frames.push(c);
      }
      timings.push(this.getTimingFor(current));
      current += this.#_intervalMs;
    }
    this.byId("test-link").setAttribute("href", this.#_timelineData.summary);
    this.byId("meta").setAttribute("colspan", frames.length);
    this.byId("test-name").innerText = this.#_timelineData.url;
    this.byId("filmstrip-row").replaceChildren(...frames);
    this.byId("timing").replaceChildren(...timings);
  }

  #_testId = "";
  set testId(i) { this.#_testId = i; }
  get testId()  { return this.#_testId; }

  #_timelineVideo = "";
  set timelineVideo(i) { this.#_timelineVideo = i; }
  get timelineVideo()  { return this.#_timelineVideo; }

  #_aspectRatio = "";
  set aspectRatio(i) { this.#_aspectRatio = i; }
  get aspectRatio()  { return this.#_aspectRatio; }

  /*
  #_size = "small";
  set size(i) { this.#_size = i; }
  get size()  { return this.#_size; }
  */

  attributeChangedCallback(name, oldValue, newValue) {
    if(
      WPTEmbedFilmstrip.observedAttributes.includes(name) &&
      oldValue !== newValue
    ) {
      this[toCamelCase(name)] = newValue;
    }
  }

  connectedCallback() {
    this.wireElements();
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

    addStyles(sr, WPTEmbedFilmstrip.styles);

    sr.appendChild(WPTEmbedFilmstrip.template.cloneNode(true));
  }
}
customElements.define("wpt-embed-filmstrip", WPTEmbedFilmstrip);

export default WPTEmbedFilmstrip;