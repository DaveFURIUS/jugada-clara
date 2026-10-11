import {
  START_FEN,
  MATE_FEN,
  parsePosition,
  terminalMessage,
  scoreLabel,
} from "./chess.js";
import { StockfishEngine } from "./engine.js";
const $ = (id) => document.getElementById(id),
  engine = new StockfishEngine();
const names = {
  p: "peón",
  n: "caballo",
  b: "alfil",
  r: "torre",
  q: "dama",
  k: "rey",
};
let originalFen = START_FEN,
  currentFen = START_FEN,
  flipped = false,
  result = null,
  selected = -1,
  previewPv = null,
  selectedSquare = null,
  legalTargets = [],
  moveHistory = [],
  pendingPromotion = null;
let busy = false,
  runId = 0,
  stopped = false,
  toastTimer = null;
const number = new Intl.NumberFormat("es-ES", {
  notation: "compact",
  maximumFractionDigits: 1,
});
function error(message) {
  $("error").textContent = message;
  $("error").hidden = !message;
}
function toast(message) {
  clearTimeout(toastTimer);
  $("toast").textContent = message;
  $("toast").hidden = false;
  toastTimer = setTimeout(() => ($("toast").hidden = true), 3000);
}
function setBusy(value) {
  busy = value;
  for (const id of ["fen", "analyze", "load", "example", "engine-mode"])
    $(id).disabled = value;
  document
    .querySelectorAll("[name=seconds]")
    .forEach((el) => (el.disabled = value));
  $("stop").hidden = !value;
  $("stop").disabled = false;
  $("analyze-label").textContent = value ? "Analizando…" : "Analizar posición";
  $("status").classList.toggle("active", value);
}
function progress(value) {
  const p = Math.min(100, Math.max(0, value));
  $("progress").firstElementChild.style.width = p + "%";
  $("progress").setAttribute("aria-valuenow", Math.round(p));
}
function reset() {
  result = null;
  selected = -1;
  previewPv = null;
  selectedSquare = null;
  legalTargets = [];
  $("san").textContent = "—";
  $("route").textContent = "Origen y destino";
  $("description").textContent = "Aquí verás qué pieza mover y a qué casilla.";
  $("score").textContent = "—";
  $("advantage").textContent = "Evaluación de la posición";
  $("depth").textContent = "—";
  $("nodes").textContent = "—";
  $("elapsed").textContent = "—";
  $("status").textContent = "Por analizar";
  $("progress-label").textContent = "Listo cuando tú lo estés";
  $("original").disabled = true;
  $("previous").disabled = true;
  $("next").disabled = true;
  $("variation").replaceChildren();
  const p = document.createElement("p");
  p.textContent =
    "Analiza una posición para explorar la línea que propone el motor.";
  $("variation").append(p);
  $("move-hint").textContent =
    "La flecha dorada marcará la jugada recomendada.";
  $("eval-fill").style.height = "50%";
  progress(0);
  error("");
  $("undo").disabled = !moveHistory.length;
}
function point(square) {
  const f = square.charCodeAt(0) - 97,
    r = Number(square[1]) - 1;
  return [(flipped ? 7 - f : f) * 100 + 50, (flipped ? r : 7 - r) * 100 + 50];
}
function drawBoard(fen, move = null) {
  currentFen = fen;
  const fields = fen.split(" "),
    pieces = {};
  fields[0].split("/").forEach((row, i) => {
    let f = 0;
    for (const c of row) {
      if (/[1-8]/.test(c)) f += Number(c);
      else {
        pieces[String.fromCharCode(97 + f) + (8 - i)] = c;
        f++;
      }
    }
  });
  const fragment = document.createDocumentFragment();
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < 8; col++) {
      const f = flipped ? 7 - col : col,
        r = flipped ? row + 1 : 8 - row,
        square = String.fromCharCode(97 + f) + r,
        cell = document.createElement("button");
      cell.className = "square" + ((f + r) % 2 ? " dark" : "");
      cell.type = "button";
      cell.dataset.square = square;
      cell.setAttribute(
        "aria-label",
        `${square}: ${pieces[square] ? names[pieces[square].toLowerCase()] + " " + (pieces[square] === pieces[square].toUpperCase() ? "blanco" : "negro") : "vacía"}`,
      );
      cell.setAttribute("aria-pressed", String(selectedSquare === square));
      if (selectedSquare === square) cell.classList.add("selected-square");
      if (legalTargets.includes(square)) cell.classList.add("legal-target");
      cell.draggable = Boolean(pieces[square]);
      if (move && (move.slice(0, 2) === square || move.slice(2, 4) === square))
        cell.classList.add("highlight");
      if (pieces[square]) {
        const s = pieces[square],
          white = s === s.toUpperCase(),
          img = document.createElement("img");
        img.src =
          import.meta.env.BASE_URL +
          "pieces/" +
          (white ? "w" : "b") +
          s.toLowerCase() +
          ".svg";
        img.className = "piece";
        img.alt =
          names[s.toLowerCase()] +
          " " +
          (white ? "blanco" : "negro") +
          " en " +
          square;
        img.draggable = false;
        img.width = 100;
        img.height = 100;
        cell.append(img);
      }
      if (col === 0) {
        const span = document.createElement("span");
        span.className = "coord rank";
        span.textContent = r;
        cell.append(span);
      }
      if (row === 7) {
        const span = document.createElement("span");
        span.className = "coord file";
        span.textContent = String.fromCharCode(97 + f);
        cell.append(span);
      }
      fragment.append(cell);
    }
  $("board").replaceChildren(fragment);
  $("arrows").replaceChildren();
  if (move) {
    const [x1, y1] = point(move.slice(0, 2)),
      [x2, y2] = point(move.slice(2, 4)),
      length = Math.hypot(x2 - x1, y2 - y1),
      ux = (x2 - x1) / length,
      uy = (y2 - y1) / length,
      ns = "http://www.w3.org/2000/svg";
    const line = document.createElementNS(ns, "line");
    Object.entries({
      x1,
      y1,
      x2: x2 - ux * 24,
      y2: y2 - uy * 24,
      stroke: "#edb55f",
      "stroke-width": 17,
      "stroke-linecap": "round",
    }).forEach(([k, v]) => line.setAttribute(k, v));
    const head = document.createElementNS(ns, "polygon");
    head.setAttribute(
      "points",
      `${x2},${y2} ${x2 - ux * 43 - uy * 24},${y2 - uy * 43 + ux * 24} ${x2 - ux * 43 + uy * 24},${y2 - uy * 43 - ux * 24}`,
    );
    head.setAttribute("fill", "#edb55f");
    $("arrows").append(line, head);
  }
  $("turn-label").textContent =
    fields[1] === "w" ? "Juegan blancas" : "Juegan negras";
  $("turn-disc").style.background = fields[1] === "w" ? "white" : "#203955";
  $("board").setAttribute(
    "aria-label",
    "Tablero. " +
      $("turn-label").textContent +
      (move ? ". Jugada: " + move.slice(0, 2) + " a " + move.slice(2, 4) : ""),
  );
  $("eval-fill").style.top = flipped ? "0" : "auto";
  $("eval-fill").style.bottom = flipped ? "auto" : "0";
}
function loadPosition() {
  const board = parsePosition($("fen").value);
  const fen = board.fen();
  if (fen !== originalFen) moveHistory = [];
  originalFen = fen;
  $("fen").value = fen;
  reset();
  drawBoard(originalFen);
  $("board-caption").textContent = board.isCheck()
    ? "El rey está en jaque"
    : "Tu posición";
  return board;
}
function renderVariation() {
  const pv = previewPv || result?.pv || [],
    fragment = document.createDocumentFragment();
  pv.forEach((move, index) => {
    const button = document.createElement("button");
    button.className = selected === index ? "selected" : "";
    button.setAttribute(
      "aria-label",
      `${move.number}${move.turn === "w" ? "." : "…"} ${move.san}. ${move.description}`,
    );
    button.setAttribute("aria-pressed", String(selected === index));
    const small = document.createElement("small");
    small.textContent = move.number + (move.turn === "w" ? "." : "…");
    button.append(small, document.createTextNode(move.san));
    button.onclick = () => selectPly(index);
    fragment.append(button);
  });
  $("variation").replaceChildren(fragment);
  $("previous").disabled = selected < 0;
  $("next").disabled = !pv.length || selected >= pv.length - 1;
}
function selectPly(index) {
  if (index < 0) {
    selected = -1;
    previewPv = null;
    drawBoard(originalFen, result?.move);
    $("board-caption").textContent = "Tu posición";
    $("move-hint").textContent = result?.description || "";
    $("original").disabled = true;
    renderVariation();
    return;
  }
  if (!previewPv) previewPv = result?.pv;
  const move = previewPv?.[index];
  if (!move) return;
  selected = index;
  drawBoard(move.fen, move.uci);
  $("board-caption").textContent =
    "Después de " + move.number + (move.turn === "w" ? ". " : "… ") + move.san;
  $("move-hint").textContent = move.description;
  $("original").disabled = false;
  renderVariation();
}
function renderResult(value, seconds) {
  result = value;
  if (value.move) {
    $("san").textContent = value.san;
    $("route").textContent =
      value.move.slice(0, 2) + " → " + value.move.slice(2, 4);
    $("description").textContent = value.description;
    if (selected < 0) {
      drawBoard(originalFen, value.move);
      $("move-hint").textContent = value.description;
      renderVariation();
    }
  }
  const score = scoreLabel(value.score);
  $("score").textContent = score.number;
  $("advantage").textContent = score.text;
  $("eval-fill").style.height = score.percent + "%";
  $("depth").textContent = value.depth || "—";
  $("nodes").textContent = number.format(value.nodes || 0);
  $("elapsed").textContent =
    (value.elapsed || 0).toFixed(1).replace(".", ",") + " s";
  progress(((value.elapsed || 0) / seconds) * 100);
  $("time-label").textContent =
    Math.min(Math.floor(value.elapsed || 0), seconds) + " / " + seconds + " s";
}
function cancelCurrentAnalysis() {
  ++runId;
  if (busy) {
    engine.destroy();
    setBusy(false);
  }
}
function hidePromotion() {
  $("promotion").hidden = true;
  pendingPromotion = null;
}
function commitMove(from, to, promotion) {
  const board = parsePosition(currentFen);
  let move;
  try {
    move = board.move({ from, to, ...(promotion ? { promotion } : {}) });
  } catch {
    return;
  }
  if (!move) return;
  cancelCurrentAnalysis();
  moveHistory.push(currentFen);
  originalFen = board.fen();
  $("fen").value = originalFen;
  hidePromotion();
  reset();
  drawBoard(originalFen, from + to);
  $("board-caption").textContent = "Has jugado " + move.san;
  $("move-hint").textContent =
    "Posición después de " + move.san + ". Calculando la mejor respuesta…";
  $("announcement").textContent =
    "Has jugado " + move.san + ". Nueva posición en análisis.";
  void analyzeCurrentPosition(board);
}
function chooseSquare(square) {
  if (pendingPromotion) return;
  const board = parsePosition(currentFen);
  const piece = board.get(square);
  if (selectedSquare && legalTargets.includes(square)) {
    const promotions = board
      .moves({ square: selectedSquare, verbose: true })
      .filter((move) => move.to === square && move.promotion);
    if (promotions.length) {
      pendingPromotion = { from: selectedSquare, to: square };
      $("promotion").hidden = false;
      $("promotion").querySelector("button").focus();
    } else commitMove(selectedSquare, square);
    return;
  }
  selectedSquare =
    piece?.color === board.turn() && selectedSquare !== square ? square : null;
  legalTargets = selectedSquare
    ? [
        ...new Set(
          board
            .moves({ square: selectedSquare, verbose: true })
            .map((move) => move.to),
        ),
      ]
    : [];
  drawBoard(
    currentFen,
    selected >= 0 ? previewPv?.[selected]?.uci : result?.move,
  );
  if (selectedSquare)
    $("move-hint").textContent =
      `Elige una casilla marcada para ${names[piece.type]} en ${square}.`;
}
$("board").addEventListener("click", (event) => {
  const square = event.target.closest(".square")?.dataset.square;
  if (square) chooseSquare(square);
});
$("board").addEventListener("dragstart", (event) => {
  const square = event.target.closest(".square")?.dataset.square;
  const board = parsePosition(currentFen);
  if (!square || board.get(square)?.color !== board.turn()) {
    event.preventDefault();
    return;
  }
  selectedSquare = square;
  legalTargets = [
    ...new Set(board.moves({ square, verbose: true }).map((move) => move.to)),
  ];
  $("board")
    .querySelectorAll(".square")
    .forEach((cell) => {
      cell.classList.toggle("selected-square", cell.dataset.square === square);
      cell.classList.toggle(
        "legal-target",
        legalTargets.includes(cell.dataset.square),
      );
    });
  event.dataTransfer.setData("text/plain", square);
  event.dataTransfer.effectAllowed = "move";
});
$("board").addEventListener("dragover", (event) => {
  if (event.target.closest(".square")?.classList.contains("legal-target"))
    event.preventDefault();
});
$("board").addEventListener("drop", (event) => {
  const square = event.target.closest(".square")?.dataset.square;
  const from = event.dataTransfer.getData("text/plain");
  if (square && from === selectedSquare && legalTargets.includes(square)) {
    event.preventDefault();
    chooseSquare(square);
  }
});
$("promotion")
  .querySelectorAll("[data-promotion]")
  .forEach((button) => {
    button.onclick = () => {
      if (pendingPromotion)
        commitMove(
          pendingPromotion.from,
          pendingPromotion.to,
          button.dataset.promotion,
        );
    };
  });
$("cancel-promotion").onclick = () => {
  hidePromotion();
  $("board").querySelector(`[data-square="${selectedSquare}"]`)?.focus();
};
$("promotion").addEventListener("keydown", (event) => {
  if (event.key === "Escape") $("cancel-promotion").click();
});
async function analyzeCurrentPosition(board) {
  const terminal = terminalMessage(board);
  if (terminal) {
    $("san").textContent = "Fin";
    $("route").textContent = "Sin jugada pendiente";
    $("description").textContent = terminal;
    $("status").textContent = "Partida terminada";
    $("move-hint").textContent = terminal;
    $("announcement").textContent = terminal;
    return;
  }
  const id = ++runId,
    seconds = Number(document.querySelector("[name=seconds]:checked").value),
    mode = $("engine-mode").value;
  stopped = false;
  setBusy(true);
  $("status").textContent = "Cargando motor";
  $("progress-label").textContent =
    mode === "full"
      ? "Cargando Stockfish completo (99 MB)…"
      : "Cargando Stockfish ligero…";
  $("time-label").textContent = "";
  try {
    await engine.load(mode);
    if (id !== runId) return;
    $("status").textContent = "Provisional";
    $("progress-label").textContent = "Buscando la mejor continuación…";
    const final = await engine.analyze(originalFen, seconds, (value) => {
      if (id === runId) renderResult(value, seconds);
    });
    if (id !== runId) return;
    renderResult(final, seconds);
    $("status").textContent = stopped ? "Detenido" : "Análisis completo";
    $("progress-label").textContent = stopped
      ? "Resultado al detener el cálculo"
      : "Búsqueda completada";
    $("time-label").textContent =
      (final.elapsed || 0).toFixed(1).replace(".", ",") + " s";
    if (!stopped) progress(100);
    $("announcement").textContent =
      (stopped ? "Análisis detenido. " : "Análisis completo. ") +
      final.description;
  } catch (e) {
    if (id === runId) {
      error(e.message);
      $("status").textContent = "No se pudo analizar";
      $("progress-label").textContent = "Vuelve a intentarlo";
      engine.destroy();
    }
  } finally {
    if (id === runId) setBusy(false);
  }
}
$("position-form").onsubmit = async (event) => {
  event.preventDefault();
  if (busy) return;
  try {
    await analyzeCurrentPosition(loadPosition());
  } catch (e) {
    error(e.message);
  }
};
$("stop").onclick = () => {
  stopped = true;
  if (engine.active) {
    engine.stop();
    $("stop").disabled = true;
    $("status").textContent = "Deteniendo";
  } else {
    ++runId;
    engine.destroy();
    setBusy(false);
    $("status").textContent = "Cancelado";
    $("progress-label").textContent = "Carga cancelada";
  }
};
$("load").onclick = () => {
  try {
    loadPosition();
  } catch (e) {
    error(e.message);
  }
};
$("example").onclick = () => {
  $("fen").value = MATE_FEN;
  loadPosition();
  $("board-caption").textContent = "Ejemplo: mate en una";
};
$("flip").onclick = () => {
  flipped = !flipped;
  drawBoard(
    currentFen,
    selected >= 0 ? previewPv?.[selected]?.uci : result?.move,
  );
};
$("original").onclick = () => selectPly(-1);
$("undo").onclick = () => {
  const fen = moveHistory.pop();
  if (!fen) return;
  cancelCurrentAnalysis();
  hidePromotion();
  originalFen = fen;
  $("fen").value = fen;
  reset();
  drawBoard(fen);
  $("board-caption").textContent = "Jugada deshecha";
  $("move-hint").textContent =
    "Posición anterior recuperada. Calculando de nuevo…";
  void analyzeCurrentPosition(parsePosition(fen));
};
$("previous").onclick = () => selectPly(selected - 1);
$("next").onclick = () => selectPly(selected + 1);
$("copy-fen").onclick = async () => {
  try {
    await navigator.clipboard.writeText(currentFen);
    toast("FEN del tablero copiado.");
  } catch {
    toast("No se pudo copiar. Puedes seleccionar el FEN del campo de texto.");
  }
};
$("fen").addEventListener("input", () => {
  moveHistory = [];
  reset();
  drawBoard(originalFen);
  $("board-caption").textContent = "FEN modificado: actualiza el tablero";
});
$("fen").addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    $("position-form").requestSubmit();
  }
});
$("engine-mode").onchange = () => {
  $("engine-help").textContent =
    $("engine-mode").value === "full"
      ? "Primera carga: unos 99 MB. Red neuronal completa, un hilo de cálculo."
      : "Primera carga: unos 2 MB. Más rápido de cargar, menos potente que el completo.";
};
document.querySelectorAll("[name=seconds]").forEach(
  (el) =>
    (el.onchange = () => {
      if (!busy) $("time-label").textContent = el.value + " s";
    }),
);
window.addEventListener("pagehide", () => engine.destroy());
$("source-link").href =
  import.meta.env.VITE_REPO_URL || "https://github.com/DaveFURIUS/jugada-clara";
$("source-link").hidden = false;
$("fen").value = START_FEN;
drawBoard(START_FEN);
