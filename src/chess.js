import { Chess, validateFen } from "chess.js";
export const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export const MATE_FEN = "7k/8/5KQ1/8/8/8/8/8 w - - 0 1";
const names = {
  p: "peón",
  n: "caballo",
  b: "alfil",
  r: "torre",
  q: "dama",
  k: "rey",
};
export function parsePosition(input) {
  const fen = String(input).trim().replace(/\s+/g, " ");
  if (fen.split(" ").length !== 6 || fen.length > 200)
    throw new Error("Pega el FEN completo: debe contener sus seis campos.");
  const validation = validateFen(fen);
  if (!validation.ok)
    throw new Error(
      "El FEN no es válido. Comprueba las ocho filas, los reyes, el turno y los contadores.",
    );
  const board = new Chess(fen),
    turn = board.turn(),
    enemy = turn === "w" ? "b" : "w";
  const cells = board.board().flat().filter(Boolean);
  const enemyKing = cells.find((p) => p.type === "k" && p.color === enemy);
  if (board.isAttacked(enemyKing.square, turn))
    throw new Error(
      "La posición es ilegal: el rey del bando que no mueve está en jaque. Revisa el turno del FEN.",
    );
  const castling = fen.split(" ")[2];
  for (const [flag, king, rook, color] of [
    ["K", "e1", "h1", "w"],
    ["Q", "e1", "a1", "w"],
    ["k", "e8", "h8", "b"],
    ["q", "e8", "a8", "b"],
  ]) {
    if (
      castling.includes(flag) &&
      (board.get(king)?.type !== "k" ||
        board.get(king)?.color !== color ||
        board.get(rook)?.type !== "r" ||
        board.get(rook)?.color !== color)
    )
      throw new Error(
        "Los derechos de enroque no coinciden con la posición del rey y las torres.",
      );
  }
  return board;
}
export function moveObject(uci) {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    ...(uci[4] ? { promotion: uci[4] } : {}),
  };
}
export function explainMove(move) {
  if (move.isKingsideCastle())
    return (
      "Enroque corto: mueve el rey de " + move.from + " a " + move.to + "."
    );
  if (move.isQueensideCastle())
    return (
      "Enroque largo: mueve el rey de " + move.from + " a " + move.to + "."
    );
  const verb = move.isCapture() || move.isEnPassant() ? "Captura con" : "Mueve";
  let text = `${verb} ${move.piece === "q" ? "la dama" : "el " + names[move.piece]} de ${move.from} a ${move.to}.`;
  if (move.isEnPassant()) text += " Captura al paso.";
  if (move.promotion) text += " Promociona a " + names[move.promotion] + ".";
  if (move.san.endsWith("#")) text += " Jaque mate.";
  else if (move.san.endsWith("+")) text += " Da jaque.";
  return text;
}
export function terminalMessage(board) {
  if (board.isCheckmate())
    return `Jaque mate. Ganan las ${board.turn() === "w" ? "negras" : "blancas"}.`;
  if (board.isStalemate())
    return "Tablas por ahogado: no hay movimientos legales.";
  if (board.isInsufficientMaterial())
    return "Tablas por material insuficiente para dar mate.";
  if (Number(board.fen().split(" ")[4]) >= 150)
    return "Tablas por la regla de los 75 movimientos.";
  return null;
}
export function parseInfo(line, turn) {
  if (!line.startsWith("info ") || !/\spv\s/.test(line)) return null;
  const score = line.match(/\bscore (cp|mate) (-?\d+)/),
    pv = line.split(" pv ")[1]?.trim().split(/\s+/) || [];
  const integer = (key) =>
    Number(line.match(new RegExp("\\b" + key + " (\\d+)"))?.[1] || 0);
  return {
    depth: integer("depth"),
    nodes: integer("nodes"),
    nps: integer("nps"),
    elapsed: integer("time") / 1000,
    score: score
      ? { type: score[1], value: Number(score[2]) * (turn === "w" ? 1 : -1) }
      : null,
    pv,
    bound: /\b(lowerbound|upperbound)\b/.test(line),
  };
}
export function buildResult(fen, info) {
  const board = parsePosition(fen),
    pv = [];
  for (const uci of (info?.pv || []).slice(0, 14)) {
    try {
      const turn = board.turn(),
        number = board.moveNumber(),
        move = board.move(moveObject(uci));
      pv.push({
        uci,
        san: move.san,
        description: explainMove(move),
        fen: board.fen(),
        turn,
        number,
      });
    } catch {
      break;
    }
  }
  return {
    ...info,
    pv,
    move: pv[0]?.uci || null,
    san: pv[0]?.san || null,
    description: pv[0]?.description || "",
  };
}
export function scoreLabel(score) {
  if (!score) return { number: "—", text: "Aún sin evaluación", percent: 50 };
  if (score.type === "mate")
    return {
      number: (score.value < 0 ? "−" : "") + "M" + Math.abs(score.value),
      text: `Mate en ${Math.abs(score.value)} para ${score.value > 0 ? "blancas" : "negras"}`,
      percent: score.value > 0 ? 97 : 3,
    };
  const cp = score.value;
  return {
    number: (cp > 0 ? "+" : "") + (cp / 100).toFixed(2).replace(".", ","),
    text:
      Math.abs(cp) < 25
        ? "Posición equilibrada"
        : (Math.abs(cp) < 100 ? "Ligera ventaja de " : "Ventaja de ") +
          (cp > 0 ? "blancas" : "negras"),
    percent: Math.max(4, Math.min(96, 50 + 35 * Math.tanh(cp / 300))),
  };
}
