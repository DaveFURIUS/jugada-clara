import { parseInfo, buildResult, parsePosition } from "./chess.js";
export class StockfishEngine {
  constructor() {
    this.worker = null;
    this.mode = null;
    this.listeners = new Set();
    this.rejectors = new Set();
    this.active = false;
  }
  send(command) {
    this.worker.postMessage(command);
  }
  waitFor(predicate, timeout = 20000) {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        this.listeners.delete(listener);
        this.rejectors.delete(fail);
      };
      const fail = (error) => {
        cleanup();
        reject(error);
      };
      const listener = (line) => {
        if (predicate(line)) {
          cleanup();
          resolve(line);
        }
      };
      const timer = setTimeout(
        () =>
          fail(
            new Error(
              "El motor ha tardado demasiado. Vuelve a intentarlo o selecciona el motor ligero.",
            ),
          ),
        timeout,
      );
      this.listeners.add(listener);
      this.rejectors.add(fail);
    });
  }
  destroy() {
    this.worker?.terminate();
    this.worker = null;
    this.mode = null;
    this.active = false;
    for (const reject of [...this.rejectors])
      reject(new Error("El motor se ha reiniciado."));
    this.listeners.clear();
  }
  async load(mode) {
    if (this.worker && this.mode === mode) return;
    this.destroy();
    if (typeof WebAssembly === "undefined")
      throw new Error(
        "Este navegador no admite el motor. Abre la web en una versión reciente de Chrome, Firefox, Safari o Edge.",
      );
    const flavor = mode === "full" ? "single" : "lite-single";
    this.worker = new Worker(
      `${import.meta.env.BASE_URL}engine/stockfish-19-${flavor}.js`,
    );
    this.worker.onmessage = (event) => {
      for (const line of String(event.data).split("\n"))
        for (const listener of [...this.listeners]) listener(line);
    };
    this.worker.onerror = () => {
      for (const reject of [...this.rejectors])
        reject(
          new Error(
            "No se pudo cargar Stockfish. Revisa la conexión o prueba el motor ligero.",
          ),
        );
      this.worker?.terminate();
      this.worker = null;
      this.mode = null;
      this.active = false;
    };
    const boot = this.waitFor((line) => line === "uciok", 120000);
    this.send("uci");
    await boot;
    this.send("setoption name Hash value " + (mode === "full" ? 128 : 32));
    this.send("setoption name Skill Level value 20");
    this.send("setoption name UCI_LimitStrength value false");
    this.send("setoption name MultiPV value 1");
    const ready = this.waitFor((line) => line === "readyok");
    this.send("isready");
    await ready;
    this.mode = mode;
  }
  async analyze(fen, seconds, onInfo) {
    const turn = parsePosition(fen).turn();
    this.send("ucinewgame");
    const ready = this.waitFor((line) => line === "readyok");
    this.send("isready");
    await ready;
    let last = null,
      lastShown = 0;
    const listener = (line) => {
      const info = parseInfo(line, turn);
      if (info && !info.bound) {
        last = info;
        if (performance.now() - lastShown > 140) {
          onInfo(buildResult(fen, info));
          lastShown = performance.now();
        }
      }
    };
    this.listeners.add(listener);
    this.active = true;
    try {
      const bestPromise = this.waitFor(
        (line) => line.startsWith("bestmove "),
        (seconds + 15) * 1000,
      );
      this.send("position fen " + fen);
      this.send("go movetime " + Math.round(seconds * 1000));
      const best = (await bestPromise).split(" ")[1];
      if (!best || best === "(none)" || best === "0000")
        throw new Error("No hay una jugada legal disponible en esta posición.");
      if (!last || last.pv[0] !== best)
        last = { ...last, pv: [best], score: null };
      return buildResult(fen, last);
    } finally {
      this.listeners.delete(listener);
      this.active = false;
    }
  }
  stop() {
    if (this.active) this.send("stop");
  }
}
