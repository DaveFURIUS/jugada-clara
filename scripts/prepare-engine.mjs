import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
const destination = new URL("../public/engine/", import.meta.url);
await mkdir(destination, { recursive: true });
for (const flavor of ["lite-single", "single"]) {
  for (const extension of ["js", "wasm"]) {
    const name = `stockfish-19-${flavor}.${extension}`;
    await copyFile(
      new URL(`../node_modules/stockfish/bin/${name}`, import.meta.url),
      new URL(name, destination),
    );
  }
}
await mkdir(new URL("../public/licenses/", import.meta.url), {
  recursive: true,
});
await writeFile(
  new URL("../public/licenses/stockfish.txt", import.meta.url),
  "Stockfish.js 19.0.0, Copyright 2026 Chess.com, LLC. GPL-3.0.\nUnmodified builds from npm stockfish@19.0.0.\nCorresponding source: https://github.com/nmrugg/stockfish.js/tree/v19.0.0\nDownload source: https://github.com/nmrugg/stockfish.js/archive/refs/tags/v19.0.0.tar.gz\nBuild instructions: https://github.com/nmrugg/stockfish.js/blob/v19.0.0/README.md\n\n" +
    (await readFile(new URL("../LICENSE", import.meta.url), "utf8")),
);
console.log("Stockfish 19 completo y ligero preparados.");
