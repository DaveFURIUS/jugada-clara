import test from "node:test";
import assert from "node:assert/strict";
import {
  START_FEN,
  MATE_FEN,
  parsePosition,
  parseInfo,
  buildResult,
  terminalMessage,
  scoreLabel,
} from "../src/chess.js";
test("FEN de chess.com y posición imposible", () => {
  assert.equal(parsePosition(START_FEN).moves().length, 20);
  assert.throws(() => parsePosition("8/8/8/8/8/8/4k3/4K3 w - - 0 1"));
  assert.throws(() => parsePosition("8/8/8/8/8/8/8/8 w"));
});
test("signo de evaluación consistente para negras", () => {
  const info = parseInfo(
    "info depth 20 score cp 93 nodes 12345 time 2000 pv e7e5",
    "b",
  );
  assert.equal(info.score.value, -93);
  assert.equal(info.elapsed, 2);
  assert.match(scoreLabel(info.score).text, /negras/);
});
test("mate y variante verificadas con reglas", () => {
  const result = buildResult(MATE_FEN, {
    pv: ["g6g7"],
    score: { type: "mate", value: 1 },
  });
  assert.equal(result.san, "Qg7#");
  assert.match(result.description, /Jaque mate/);
  assert.equal(
    terminalMessage(parsePosition(result.pv[0].fen)),
    "Jaque mate. Ganan las blancas.",
  );
});
test("enroque, promoción y captura al paso", () => {
  assert.match(
    buildResult("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1", { pv: ["e1g1"] })
      .description,
    /Enroque corto/,
  );
  assert.match(
    buildResult("7k/P7/8/8/8/8/8/7K w - - 0 1", { pv: ["a7a8q"] }).description,
    /Promociona a dama/,
  );
  assert.match(
    buildResult("7k/8/8/3pP3/8/8/8/7K w - d6 0 1", { pv: ["e5d6"] })
      .description,
    /Captura al paso/,
  );
});
test("ahogado sin jugada y enroque imposible rechazado", () => {
  assert.match(
    terminalMessage(parsePosition("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1")),
    /ahogado/,
  );
  assert.throws(() => parsePosition("7k/8/8/8/8/8/8/4K3 w K - 0 1"));
});
