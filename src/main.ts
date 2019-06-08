import {
  init as pglInit,
  stickAngle,
  random,
  clearJustPressed,
  isJustPressed
} from "./pgl/main";
import * as view from "./pgl/view";
import * as text from "./pgl/text";
import * as terminal from "./pgl/terminal";
import {
  Actor,
  update as sgaUpdate,
  spawn,
  reset as sgaReset
} from "./pgl/simpleGameActor";
import { Vector } from "./pgl/vector";
import { playScale, play } from "./pgl/sound";
import { clamp } from "./pgl/math";

let score = -1;
let addScore: number;
let speed: number;
let ticks = 0;
type State = "title" | "inGame" | "gameOver";
let state: State;
let updateFunc = {
  title: updateTitle,
  inGame: updateInGame,
  gameOver: updateGameOver
};

function init() {
  text.defineSymbols(charPatterns, "A");
  initTitle();
}

function initTitle() {
  state = "title";
  terminal.clear();
  if (score >= 0) {
    printScore();
  }
  terminal.print("", 6, 4, {
    charAndColorPattern: `
SKI ZONE
rrr rrrr
`
  });
  ticks = 0;
}

function initInGame() {
  state = "inGame";
  score = 0;
  addScore = 1;
  sgaReset();
  spawn(player);
}

function initGameOver() {
  state = "gameOver";
  clearJustPressed();
  terminal.print("GAME OVER", 6, 10);
  ticks = 0;
}

function update() {
  view.clear();
  updateFunc[state]();
  terminal.draw();
  ticks++;
}

function updateTitle() {
  if (ticks === 30) {
    terminal.print("", 3, 7, {
      charAndColorPattern: `
[Arrow]
ygggggy
[WASD ]
ygggg y
[Slide] : Move
ygggggy b cccc
`
    });
  }
  if (ticks === 60) {
    terminal.print(
      `Go up on gate
to earn more score`,
      1,
      12
    );
  }
  if (isJustPressed) {
    initInGame();
  }
}

function updateInGame() {
  terminal.clear();
  speed = Math.sqrt(score) * 0.001 + 0.2;
  if (random.get() < (0.15 * Math.sqrt(speed * 5)) / 5) {
    spawn(gate);
  }
  sgaUpdate();
}

function updateGameOver() {
  if (ticks > 30 && isJustPressed) {
    initInGame();
  } else if (ticks > 300) {
    initTitle();
  }
}

function player(a: Actor) {
  a.setPriority(0.5);
  const pos = new Vector(11, 2);
  let rotationPattern = "k";
  let walkTicks = 0;
  let walkPattern = 0;
  a.addUpdater(() => {
    if (stickAngle >= 0) {
      pos.addAngle((stickAngle * Math.PI) / 4, speed).clamp(0, 20, 0, 20);
      if (stickAngle >= 7 || stickAngle <= 1) {
        rotationPattern = "k";
      }
      if (stickAngle >= 3 && stickAngle <= 5) {
        rotationPattern = "n";
      }
      walkTicks -= 3 * speed;
    } else {
      walkTicks -= speed;
    }
    if (walkTicks < 0) {
      walkTicks += 10;
      walkPattern = (walkPattern + 1) % 2;
      playScale(1, ".", 3.2 + walkPattern * 0.5);
    }
    const c = terminal.getCharAt(pos.x, pos.y).char;
    if (c === "-") {
      const asc = Math.floor(addScore);
      score += asc;
      playScale(0, ".)).", clamp(asc * 0.05, 0, 5) + 3);
      terminal.print(`+${asc}`, pos.x, pos.y - 1, { colorPattern: "y" });
      addScore += 1 + score * 0.001;
    } else if (c === "I") {
      playScale(0, ">.>.<.((.).((.).((.<.");
      printScore();
      terminal.print("X", pos.x, pos.y, { colorPattern: "r" });
      initGameOver();
      return;
    } else {
      addScore = clamp(addScore * 0.5, 1, 99999);
    }
    terminal.print(walkPattern === 0 ? "A" : "B", pos.x, pos.y, {
      rotationPattern,
      symbolPattern: "s"
    });
    printScore();
  });
}

function printScore() {
  terminal.print(`${score}`, 0, 0);
}

function gate(a: Actor) {
  const pos = new Vector(random.getInt(21 - 6), 21);
  playScale(1, ".(.))).", pos.x * 0.2 + 3);
  a.addUpdater(() => {
    pos.y -= speed;
    terminal.print("I-----I", pos.x, pos.y, { colorPattern: "pcccccp" });
    if (pos.y < 0) {
      a.remove();
    }
  });
}

const charPatterns = [
  `
  www
ww w w
 wwww
 w  w
ww  ww
`,
  `
  www
ww w w
 wwww
  ww
 w  w
 w  w
`
];

pglInit(init, update);
