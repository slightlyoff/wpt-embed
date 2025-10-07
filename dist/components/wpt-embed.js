let P=`
wpt-embed.js, 0.3.0
Copyright 2024-2025
Alex Russell -- infrequently.org
Released under the MIT license.

For documentation and source, visit:

  https://github.com/slightlyoff/wpt-embed
`,j=function(l,t){if(l?.length>1||t?.length>1)throw"`css` tag called with values";return l[0]};CSS.registerProperty({name:"--wpt-scroll-pct",syntax:"<percentage>",inherits:!0,initialValue:"0%"});let b=(l,t)=>{let e=typeof l;if(e==="boolean")return l;if(e==="string"){let i=l.toLowerCase();if(!l.length||i=="true"||i==t)return!0}return!1},M=(l,t,e)=>{let i=l.toLowerCase();return i===t||i==="true"?e:l.split(/\s+/)},h=(l,t)=>l.querySelector(t),A=l=>t=>h(l,t),R=new Map,B=(l,t)=>{let e=R.get(t);if(!e){try{e={type:"CSS",value:new CSSStyleSheet},e.value.replaceSync(t)}catch{e={type:"sheet",value:t}}R.set(t,e)}switch(e.type){case"sheet":let i=l.createElement("style");i.textContent=e.value,l.appendChild(i);break;case"CSS":l.adoptedStyleSheets=[...l.adoptedStyleSheets,e.value];break}},U=(()=>{let l=new Map;return t=>{let e=l.get(t);return e||(e=t.replace(/(-)+([a-z]?)/g,(i,s,a,r)=>{let n=i[i.length-1];return r?n==="-"?"":n.toUpperCase():n}),l.set(t,e),e)}})(),y=l=>{let t=document.createElement("template");return t.innerHTML=l,t.content},q=(l=0)=>{if(!l||l<1)return Math.round(l)+" kB";let t=Math.round(l)+"",e=[],i=t.length;for(;i>3;)e.unshift(t.slice(-3)),t=t.slice(0,i-3),i=t.length;return e.unshift(t),e.join(",")+" kB"};class d extends HTMLElement{static observedAttributes=["aspect-ratio","size","interval","filmstrip","waterfall","connections","breakdown","compare","crux","video","gif","end","order"];static styles=j`h1,h2,h3,h4,p,figure,blockquote,dl,dd{margin-block:0}h1,h2,h3,h4{text-wrap:balance}*{box-sizing:border-box}:host{timeline-scope:--wpt-embed-scroller;--wpt-image-width:var(--image-width,100px);--wpt-progress-line-color:transparent;--wpt-progress-line-width:0px;@supports (animation-timeline:scroll()) and (animation-range:0% 100%){--wpt-progress-line-color:red;--wpt-progress-line-width:2px}--wpt-section-padding:1rem 0}:host([debug]){& *{outline:1px solid #00f}outline:2px dotted red}:host{flex-direction:column;display:flex}:host>div{width:100%;margin:var(--wpt-section-padding);justify-content:center;gap:1rem;display:flex}caption,figcaption{text-align:center;margin:.25em 0}table{border-collapse:collapse}figure{margin:0;padding:0}#filmstrip{scrollbar-gutter:stable;scroll-timeline-axis:x;scroll-timeline-name:--wpt-embed-scroller;display:block;position:relative;overflow-x:auto}:host([waterfall]),:host([connections]){& #filmstrip{border-left:var(--wpt-progress-line-width)solid var(--wpt-progress-line-color)}& #filmstrip.hidden{display:none}}#main-table{width:100%;margin-right:100%;top:0;left:0}.filmstrip-row{width:100%;& img{content-visibility:auto;outline:1px solid #000;margin-inline:2px}& .pct{text-align:center}& .visualChange>img{outline:var(--wpt-visual-change-outline,2px solid #ffc233)}& .lcp>img{outline:var(--wpt-lcp-outline,2px solid red)}& .layoutShift.visualChange>img{outline:var(--wpt-layout-shift-visual-change-outline,2px dotted #ffc233)}& .layoutShift.lcp>img{outline:var(--wpt-layout-shift-lcp-outline,2px dotted red)}}.meta{text-align:left}.labels{padding:.5rem;display:inline-block;position:sticky;top:0;left:0}#timing td{text-align:center}:host([size=small]){--wpt-image-width:50px}:host([size=medium]){--wpt-image-width:100px}:host([size=large]){--wpt-image-width:200px}.filmstrip-row img{width:var(--wpt-image-width,100px);contain-intrinsic-width:var(--wpt-image-width,100px);aspect-ratio:var(--wpt-aspect-ratio)}.filmstrip-meta{padding:1em}:host>div.hidden{margin:0;padding:0;display:none}@keyframes scrollTransform{0%{--wpt-scroll-pct:0%}to{--wpt-scroll-pct:100%}}#breakdown,#compare{&>table{border-collapse:collapse;border:1px solid #ddd;width:100%;min-width:20rem;max-width:35rem;margin:0;&>caption{caption-side:bottom}& td,& th{padding:.5em .35em}&>thead{text-align:center;color:var(--wpt-breakdown-even-color,inherit);background-color:#dcdcdc}&>tbody{&>tr{border-bottom:1px solid #ddd}&>tr:nth-of-type(2n){color:var(--wpt-breakdown-even-color,inherit);background-color:#f3f3f3}& th{text-align:left}& td{text-align:right}}}}#crux{--good:var(--wpt-crux-good,#0cce6b);--fair:var(--wpt-crux-fair,#ffa400);--poor:var(--wpt-crux-poor,#ff4e42);flex-direction:column;font-size:.8rem;&>.crux{width:100%;&>.metric{width:100%;margin:2em 0;& .title{opacity:.7}& .value{margin:.2em 0;font-size:2em;font-weight:900;line-height:1}& .pct{margin:.2em 0}& .good{background-color:var(--good);color:#fff}& .fair{background-color:var(--fair)}& .poor{color:#fff;background-color:var(--poor)}& .value{background-color:inherit;&.good{color:var(--good)}&.fair{color:var(--fair)}&.poor{color:var(--poor)}}&>ul{width:100%;padding:0;list-style:none;display:flex;&>li{text-indent:.8em;line-height:2.2}}&>.thresholds{display:flex;&>div{padding:.2em .8em;&>.key{width:1.5em;display:inline-block}}}}}}#waterfall,#connections{align-items:inherit;--wpt-start-stop:.24;width:100%;overflow-x:auto;& picture{contain:content;--es-tl:var(--wpt-test-length);--es-lt:var(--wpt-longest-test,1);--wpt-end-stop:calc(var(--es-tl)/var(--es-lt)*100%);border:0;width:100%;max-width:1012px;margin:0;padding:0;display:inline-block;position:relative;&>img{width:100%;max-width:1012px}}& picture:after{content:"";z-index:1;width:var(--wpt-progress-line-width);left:var(--wpt-scroll-pct);top:var(--wpt-line-pct-top,37px);bottom:var(--wpt-line-pct-bottom,170px);background-color:var(--wpt-progress-line-color);opacity:.8;will-change:left;animation:scrollTransform linear(0,var(--wpt-start-stop)0%,1 var(--wpt-end-stop)90%);animation-timeline:--wpt-embed-scroller;display:block;position:absolute}}#gif,#video,#breakdown,#compare{flex-wrap:wrap}`;static template=y(`
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
  <div id="compare" part="compare" class="hidden"></div>
  <div id="crux" part="crux" class="hidden"></div>
  <div id="gif" part="gif" class="hidden"></div>
  <div id="video" part="video" class="hidden"></div>
  `);static tagName="wpt-embed";get tagName(){return this.constructor.tagName}constructor(){super();let t=this.attachShadow({mode:"open"})}attributeChangedCallback(t,e,i){if(d.observedAttributes.includes(t)&&e!==i){let s=U(t);this[s]=i}}#t=100;#n="100";#e=1;set interval(t){let e=this.#t;typeof t=="number"&&(t=t.toString());let i;switch(t){case"16":case"16ms":case"60fps":this.#t=16,this.#e=3;break;case"1000":case"1000ms":case"1s":this.#t=1e3,this.#e=0;break;case"5000":case"5000ms":case"5s":this.#t=5e3,this.#e=0;break;case"500":case"500ms":case"0.5s":this.#t=500,this.#e=1;break;case"100":case"100ms":case"0.1s":default:this.#t=100,this.#e=1;break}this.#t!==e&&this.updateTests()}get interval(){return this.#n}getTimingFor(t=0){let e=document.createElement("td"),i=document.createElement("span"),s=Math.trunc(t/1e3),a=Math.abs(s?1e3*s-t:t),r=s+"";return this.#e&&(r+="."+(a+"").padEnd("0",this.#e).substring(0,this.#e)),i.innerText=r,e.appendChild(i),e}#r=!0;set filmstrip(t){this.#r=b(t,"filmstrip")}get filmstrip(){return this.#r}#p=!1;set waterfall(t){this.#p=b(t,"waterfall")}get waterfall(){return this.#p}#d=!1;set connections(t){this.#d=b(t,"connections")}get connections(){return this.#d}#h=!1;set breakdown(t){this.#h=b(t,"breakdown")}get breakdown(){return this.#h}#a=[];set crux(t){this.#a=M(t,"crux",["inp","lcp","cls"])}get crux(){return this.#a}#f=!1;set video(t){this.#f=b(t,"video")}get video(){return this.#f}#g=!1;set gif(t){this.#g=b(t,"gif")}get gif(){return this.#g}#s=[];set order(t){this.#s=M(t,"order",[])}get order(){return this.#s}#u="full";#o={full:"fullyLoaded",visual:"visualComplete",onload:"loadEventEnd",lcp:"LargestContentfulPaint",fcp:"FirstContentfulPaint"};set end(t){this.#o[t]&&(this.#u=t==="end"?"full":t)}get end(){return this.#u}get longEnd(){return this.#o[this.#u]}connectedCallback(){this.wireElements()}get#c(){return Array.from(this.children).filter(t=>t.tagName==="wpt-test")}#l(t,e){typeof e=="string"&&(e=this.byId(e));let i=!0;return typeof t=="string"||Array.isArray(t)?i=!t.length:i=!t,e.classList[i?"add":"remove"]("hidden"),e}#m(t,e){let i=this.byId(t);this.#l(this[t],i),this[t]&&e.render(t,i)}static sections=["waterfall","connections","breakdown","crux","video","gif"];static sectionsUpper=d.sections.map(t=>t.charAt(0).toUpperCase()+t.substring(1));updateTests(){if(!this.#i)return;let t=this.#c;for(let r of t)if(!r.data)return;let e=t.map(r=>r.duration),i=Math.max(...e)+this.#t,s=[];for(let r=0;r<=i;r+=this.#t)s.push(this.getTimingFor(r));this.filmstrip&&this.byId("timing").replaceChildren(...s),this.#s.length&&this.shadowRoot.prepend(...this.#s.map(r=>this.byId(r)));var a=0;for(let r of this.#c){let n=r.duration||0;n>a&&(a=n)}this.style.setProperty("--wpt-longest-test",a),this.#c.forEach(r=>{this.filmstrip?r.renderFilmstripInto(this.#t,s.length,this.byId("main-table").tBodies[0]):(this.byId("main-table").classList.add("hidden"),this.byId("filmstrip").classList.add("hidden"));for(let n of d.sections)this.#m(n,r)})}#i=!1;byId(t){return this.shadowRoot.getElementById(t)}wireElements(){if(this.#i)return;this.#i=!0;let t=this.shadowRoot,e=(i,s,a)=>{let r=typeof a=="string"?this[a].bind(this):a;this.byId(i).addEventListener(s,r)};B(t,d.styles),t.appendChild(d.template.cloneNode(!0)),this.addEventListener("test-modified",this.updateTests)}}customElements.define(d.tagName,d),customElements.define("wpt-filmstrip",class extends d{});class c extends HTMLElement{static observedAttributes=["label","test","run","view","timeline","timeline-video","aspect-ratio","avif"];static tagName="wpt-test";get tagName(){return this.constructor.tagName}constructor(){super()}#t=!1;#n(){this.#t=!0,this.#e&&(this.dispatchEvent(new CustomEvent("test-modified",{bubbles:!0})),this.#t=!1)}#e=!1;connectedCallback(){this.parentNode&&this.parentNode?.tagName===d.tagName&&(this.#e=!0,this.#n(),this.#s())}data=null;#r="";set timeline(t){this.updateTimeline(t)}get timeline(){return this.#r}#p="";set label(t){this.#p=t,this.#n()}get label(){return this.#p}#d="";set test(t){t&&!t.endsWith("/")&&(t+="/"),this.#d=t,t&&this.#s()}#h="1";set run(t){this.#h=parseInt(t)+"",t&&this.#s()}#a="first";set view(t){t&&["first","repeat"].includes(t)&&(this.#a=t,this.#s())}get duration(){return this?.data?.[this?.parentNode?.longEnd]||0}#f=!1;set avif(t){this.#f=b(t,"avif")}get avif(){return this.#f}#g(){let t={config:null,directory:null},e=this.querySelector(':scope > script[type="text/json"]')||this.querySelector(':scope > script[type="application/json"]');if(!e)return t;let i=e.getAttribute("dir")||e.getAttribute("directory");return i?{config:JSON.parse(e.textContent),directory:i}:t}#s(){if(!this.#e)return;if(this.#d&&this.#h&&this.#a){let i=`${this.#d}runs/${this.#h}/${this.#a}View/timeline.json`;this.updateTimeline(i);return}let{config:t,directory:e}=this.#g();if(t){let i=`${e}${t.testName||t.id}/runs/${t.run}/${t.view}/timeline.json`;this.data=t,this.avif=this.data.optimizedImages,this.#r=i,this.#n()}}async updateTimeline(t){if(!(!t||t===this.#r)){this.#r=t;try{let e=await fetch(t);this.data=await e.json(),this.avif=this.data.optimizedImages,this.#n()}catch(e){console.error(e),this.data=null}}}#u=!1;attributeChangedCallback(t,e,i){if(this.#u=!0,c.observedAttributes.includes(t)&&e!==i){let s=U(t);this[s]=i,this.#n(s,i)}}static rowTemplate=y(`
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
  `);#o=null;#c=null;#l=null;extract(){if(this.#o){if(this.#l)return this.#l;let t=new Range;return t.setStartBefore(this.#o),t.setEndAfter(this.#c),this.#l=t.extractContents(),t.detach(),[this.#w,this.#b,this.#y,this.#k,this.#$,this.#S].forEach(e=>{e&&e.remove()}),this.#l}}disconnectedCallback(){this.extract()}renderFilmstripInto(t=100,e,i){if(!this.data)return;let s;if(this.#o&&(s=this.extract(),!this.#t)){i.append(s),this.#l=null;return}s=c.rowTemplate.cloneNode(!0);let a=Array.from(s.childNodes).filter(p=>p.nodeType===8);this.#o=a.shift(),this.#c=a.shift();let r=A(s);r(".test-link").setAttribute("href",this.data.summary),r(".meta").setAttribute("colspan",e),r(".label").innerText=this.label||this.data.url;let n=this.getFrames(t,e),o=r(".filmstrip-row");o.replaceChildren(...n),o.style.setProperty("--wpt-aspect-ratio",this.data.filmstripImageAspectRatio),i.append(s),this.#l=null}#m=null;#i(t){return this.#m||(this.#m=new URL(this.#r,window.location)),this.avif&&(t.endsWith(".png")||t.endsWith(".jpg"))&&(t=t.slice(0,-4)+".avif"),new URL(t,this.#m)}static figureTemplate=y(`
<figure>
  <a target="_blank">
    <picture>
      <img loading="lazy" decoding="async">
    </picture>
  </a>
  <figcaption></figcaption>
</figure>
  `);#v(t,e="",i="",s="",a="",r="",n=!1){t.appendChild(c.figureTemplate.cloneNode(!0));let o=t.lastElementChild,p=A(o);i&&o.setAttribute("part",i);let f=p("img");return e&&(f.src=e),f.alt=s,a&&(p("a").href=a),r&&(p("figcaption").textContent=r),n&&(f.addEventListener("load",L=>{let m=f.naturalWidth,u=f.naturalHeight;o.style.setProperty("--wpt-line-pct-top",`${(37/u).toFixed(5)*100}%`),o.style.setProperty("--wpt-start-stop",`${(250/m).toFixed(5)}`),o.style.setProperty("--wpt-line-pct-bottom",`${(170/u).toFixed(5)*100}%`)}),o.style.setProperty("--wpt-test-length",this?.data?.fullyLoaded)),o}#x="";get location(){if(!this.#x&&this.data){let t=new URL(this.data.testUrl);this.#x=`${t.host}${t.pathname=="/"?"":t.pathname}`}return this.#x}#C="";get summary(){if(this.#C&&this.data){let t=this.data.from.replaceAll("<b>","").replaceAll("</b>","").replace(" - ",` in ${this.data.mobile?"mobile":"desktop"} `).replace(" - "," on an ").replace(" - "," using an emulated ")+" connection";this.#C=`${this.location} tested from ${t}; ${this.#a} view`}return this.#C}static renderMethodMap=new Map(d.sections.map((t,e)=>[t,`render${d.sectionsUpper[e]}Into`]));render(t,e){if(e)return this[c.renderMethodMap.get(t)]?.(e)}#w=null;renderWaterfallInto(t){if(this.data){if(this?.parentNode?.end!="full"){console.error("'end' must be 'full' to display waterfall");return}this.#w?t.appendChild(this.#w):this.#w=this.#v(t,this.#i(this?.data?.waterfall),"waterfall-figure",`Resource waterfall chart for ${this.location}.`,this.data.summary,this.summary,!0)}}#b=null;renderConnectionsInto(t){if(this?.parentNode?.end!="full"){console.error("'end' must be 'full' to display connections");return}if(this.#b){t.appendChild(this.#b);return}this.#b=this.#v(t,this.#i(this.data.connectionView),"container-figure",`Network connections chart for ${this.location}.`,this.data.summary,`Connections and utilization. ${this.data.view=="firstView"?"First":"Repeat"} view, ${(this.data.bwDown/1e3).toFixed(1)}/${(this.data.bwUp/1e3).toFixed(1)}Mbps, ${this.data.latency}ms RTT.`,!0)}static breakdownTemplate=y(`
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
  `);#y=null;renderBreakdownInto(t){if(this.#y){t.appendChild(this.#y);return}if(!this?.data?.breakdown)return;delete this.data.breakdown.flash,t.appendChild(c.breakdownTemplate.cloneNode(!0));let e=this.#y=t.lastElementChild,i=h(e,"caption");i.textContent=`${this.location}, ${this.#a} view`;let s=h(e,"tbody > tr");s.remove();let a={bytes:0,bytesUncompressed:0,requests:0};for(let[r,n]of Object.entries(this.data.breakdown))n.bytes!==0&&(a.bytes+=n.bytes,a.bytesUncompressed+=n.bytesUncompressed,a.requests+=n.requests);this.data.breakdown.Total=a;for(let[r,n]of Object.entries(this.data.breakdown)){let o=s.cloneNode(!0);o.firstElementChild.textContent=r,o.children[1].textContent=q(n.bytes/1e3),o.children[2].textContent=q(n.bytesUncompressed/1e3),o.children[3].textContent=n.requests,e.tBodies[0].appendChild(o)}}static cruxTemplate=y(`
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
  `);#I={fcp:{name:"first_contentful_paint",title:"First Contentful Paint"},lcp:{name:"largest_contentful_paint",title:"Largest Contentful Paint"},inp:{name:"interaction_to_next_paint",title:"Interaction to Next Paint"},cls:{name:"cumulative_layout_shift",title:"Cumulative Layout Shift",unitless:!0},ttfb:{name:"experimental_time_to_first_byte",title:"Time to First byte"}};#E=["good","fair","poor"];#k=null;renderCruxInto(t,e=["inp","lcp","cls"]){if(this.#k||!this?.data?.crux)return;t.appendChild(c.cruxTemplate.cloneNode(!0));let i=this.#k=t.lastElementChild,s=h(i,".metric");s.remove();let a=this.data.crux;for(let N of e){let C=this.#I[N];if(!C)continue;let v=a.metrics[C.name],w=s.cloneNode(!0);h(w,".title").textContent=`${C.title} (${N.toUpperCase()})`;let k=v.percentiles.p75,T=k,I=v.histogram[0].end,E=v.histogram[2].start;C.unitless||(T=`${k/1e3}s`,I=`${I/1e3}s`,E=`${E/1e3}s`);let $="good";k>v.histogram[1].end?$="poor":k>v.histogram[0].end&&($="fair"),h(w,".value").textContent=`${T} (${$})`,h(w,".value").classList.add($);let z=h(w,"ul");this.#E.forEach((_,O)=>{let F=parseInt(v.histogram[O].density*100)+"%",S=document.createElement("li");S.textContent=F,S.style.flexBasis=F,S.classList.add(_),z.appendChild(S)}),h(w,".goodValue").textContent=I,h(w,".poorValue").textContent=E,i.appendChild(w)}let r=a.collectionPeriod.firstDate,n=a.collectionPeriod.lastDate,o={year:"numeric",month:"long",day:"numeric"},p=(r.month+"").padStart(2,"0"),f=(r.day+"").padStart(2,"0"),L=new Date(`${r.year}-${p}-${f}`).toLocaleDateString("en",o),m=(n.month+"").padStart(2,"0"),u=(n.day+"").padStart(2,"0"),g=new Date(`${n.year}-${m}-${u}`).toLocaleDateString("en",o),x=a.key.formFactor=="PHONE",D=new URL(this.data.crux.key.url).host;h(i,".details").textContent=`Web Vitals data for ${D}. Collected from Chrome ${x?"mobile":"desktop"} users, ${L} \u2013 ${g}.`}#L(t){if(!this.data)return;let e=this.data.gifImageData,i=t.querySelector("img,video");[t,i].forEach(s=>{s.style.width="100%",s.style.maxWidth=`${e.width}px`,s.aspectRatio=this.data.gifImageAspectRatio})}static videoTemplate=y(`
  <figure part="video-figure">
    <video controls preload="none">
    </video>
    <figcaption></figcaption>
  </figure>
  `);#$=null;renderVideoInto(t){if(this.#$||!this.data)return;t.appendChild(c.videoTemplate.cloneNode(!0));let e=this.#$=t.lastElementChild,i=e.querySelector("video");i.poster=this.#i("poster.png"),i.src=this.#i("timeline.mp4"),this.#L(e)}#S=null;renderGifInto(t){if(this.#S||!this.data)return;let e=this.#S=this.#v(t,this.#i("timeline.gif"),"gif-figure",`Loading ${this.location} took ${this.duration/1e3} seconds.`,this.data.summary);this.#L(e)}static imgTemplate=y(`
  <td>
    <img loading="lazy" decoding="async">
    <div class="pct"></div>
  </td>`);getFrames(t,e){let i=Array.from(this.data.filmstripFrames),s=[],a=0,r=Array.from(this.data?.lcps||[]),n=Array.from(this.data?.layoutShifts||[]),o=(u=0)=>{if(i[0].time<u)for(;i[0].time<u&&i[1]&&i[1].time<=u;)i.shift();return i[0]},p=r.shift(),f=n.shift(),L=null,m=null;for(;a<=this.duration+t;){let u=m;m=o(a);let g=this.getFilmstripImage(m),x=h(g,"img");s.length<5&&x.removeAttribute("loading"),u&&u!==m&&g.classList.add("visualChange"),p&&a>=p&&(p=r.shift(),g.classList.add("lcp")),f&&a>=f&&(f=n.shift(),g.classList.add("layoutShift")),x.alt=`${this.location} at ${a/1e3}s, ${m.VisuallyComplete}% loaded.`,s.push(g),a+=t}return s}getFilmstripImage(t){let i=c.imgTemplate.cloneNode(!0).children[0];return i.children[0].src=this.#i(t.image),i.children[1].textContent=`${t.VisuallyComplete}%`,i}}customElements.define(c.tagName,c);var H=d;window.WPTEmbed=d,window.WPTTest=c;export{H as default};
