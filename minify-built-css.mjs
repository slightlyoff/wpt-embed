import { transform } from "lightningcss";
import * as fs from "node:fs/promises";

let infile = "./dist/components/wpt-embed.js";
let outfile = "./dist/components/wpt-embed.js";

console.log(`
> Minifying CSS
`);

let builtSource = (await fs.readFile(infile)).toString();
let bsOrigLen = builtSource.length;

let stylesRe = /styles=(?<litFunc>[a-z]{1,3})\`(?<styleText>.*?)\`/smg;
let matches = builtSource.matchAll(stylesRe);
for(let x of matches) {
  let text = x.groups.styleText;
  let { code } = transform({
    code: Buffer.from(text),
    minify: true,
  });
  // console.log(code.toString());
  builtSource = builtSource.replace(text, code);
}
await fs.writeFile(outfile, builtSource);

let kb = (len) => {
  return (len / 1024).toFixed(1) + "KiB";
};

console.log(`> wrote ${outfile}`);
console.log(`⚡ ${kb(bsOrigLen)} -> ${kb(builtSource.length)} ⚡`);