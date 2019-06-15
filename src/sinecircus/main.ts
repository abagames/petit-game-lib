import {
  init as pglInit,
  random,
  clearJustPressed,
  isJustPressed
} from "../pgl/main";
import * as view from "../pgl/view";
import * as text from "../pgl/text";
import {
  Actor,
  update as sgaUpdate,
  spawn,
  reset as sgaReset,
  pool
} from "../pgl/simpleGameActor";
import { Vector } from "../pgl/vector";
import { playScale, scales } from "../pgl/sound";
import { clamp, wrap } from "../pgl/math";
import { stick } from "../pgl/keyboard";
import { move } from "../pgl/pointer";

let score = -1;
let speed: number;
let ticks = 0;
type State = "title" | "inGame" | "gameOver";
let state: State;
let updateFunc = {
  title: updateTitle,
  inGame: updateInGame,
  gameOver: updateGameOver
};
let vx = 0;
let fireAddTicks: number;
let backLines = [["", "", "", ""], ["", "", "", ""]];
let backX = 0;
let backCharIndex = 0;

pglInit(init, update, {
  viewSize: { x: 6 * 29, y: 6 * 15 },
  isUsingVirtualPad: false
});

function init() {
  text.defineSymbols(charPatterns, "A");
  initBackground();
  initTitle();
}

function initTitle() {
  state = "title";
  ticks = 0;
  vx = 0.3;
  sgaReset();
}

function initInGame() {
  state = "inGame";
  score = 0;
  fireAddTicks = 0;
  sgaReset();
  spawn(player);
}

function initGameOver() {
  state = "gameOver";
  clearJustPressed();
  ticks = 0;
}

function update() {
  drawBackground();
  sgaUpdate();
  updateFunc[state]();
  drawScore();
  ticks++;
}

function updateTitle() {
  text.print("SINE CIRCUS", 20, 20, { scale: 2 });
  if (ticks > 20) {
    text.print("", 10, 50, {
      charAndColorPattern: `
[Arrow][WASD][Slide]:
ycccccyyccccyycccccyg
          Move Sine Curve
    `
    });
  }
  if (isJustPressed) {
    initInGame();
  }
}

function updateInGame() {
  speed = Math.sqrt(score * 0.0008) + 1;
  addFire();
}

function updateGameOver() {
  addFire();
  text.print("GAME OVER", 30, 25, { scale: 2 });
  if (isJustPressed) {
    initInGame();
  } else if (ticks > 300) {
    initTitle();
  }
}

function player(a: Actor) {
  const angleInterval = (Math.PI * 15) / 180;
  const sinePointCount = 200;
  const sineYCenter = 50;
  const sineHeight = 30;
  const pos = new Vector();
  const px = 15;
  let isFalling = false;
  const fallPos = new Vector();
  let fallVy = 0;
  let angle = 0.2;
  let baseAngleVel = 0.03;
  let animTicks = 0;
  let animIndex = 0;
  let sineWidth = 3;
  a.addUpdater(() => {
    let sx = stick.x + move.x * 0.1;
    if (isFalling) {
      sx = 0;
    }
    sineWidth = clamp(sineWidth + sx * 0.3, 1, 5);
    let x = ((-angle % angleInterval) / angleInterval - 20) * sineWidth + px;
    let a =
      Math.floor(angle / angleInterval) * angleInterval + angleInterval * -20;
    for (let i = 0; i < sinePointCount; i++) {
      const y = Math.sin(a) * sineHeight + sineYCenter;
      text.print(".", x - 4, y - 3);
      x += sineWidth;
      a += angleInterval;
    }
    pos.y = Math.sin(angle) * sineHeight + sineYCenter - 5;
    pos.x = px + Math.cos(angle) * 2;
    if (!isFalling) {
      text.print(animIndex % 2 === 0 ? "A" : "B", pos.x - 3, pos.y - 3, {
        symbolPattern: "s"
      });
    } else {
      fallPos.x++;
      fallPos.y += fallVy;
      fallVy += 0.2;
      text.print("A", fallPos.x - 3, fallPos.y - 3, {
        symbolPattern: "s",
        rotationPattern: "o"
      });
      if (state === "inGame" && fallPos.x >= 50) {
        initGameOver();
      }
    }
    text.print("c", pos.x - 3, pos.y - 3 + 5, {
      symbolPattern: "s",
      colorPattern: "c"
    });
    let avv = (Math.cos(angle) * 0.004) / sineWidth;
    if (sineWidth === 1 && avv < 0) {
      avv *= 2;
    }
    baseAngleVel = clamp(baseAngleVel + avv, 0.03, 1);
    const av = baseAngleVel * speed;
    vx = av * sineWidth * 3.8;
    const pa = wrap(angle, 0, Math.PI * 2);
    angle = wrap(angle + av, 0, Math.PI * 2);
    if (isFalling) {
      return;
    }
    animTicks -= av * 3;
    if (animTicks < 0) {
      animTicks++;
      animIndex++;
      playScale(2, ".", 8 - pos.y * 0.1);
    }
    if (pa < (Math.PI * 3) / 2 && angle >= (Math.PI * 3) / 2) {
      let sc = (av - 0.03) * 200 + 1;
      sc = Math.floor(Math.sqrt(sc * sc));
      addScore(sc, pos);
      playScale(0, ".>.(.>.(.", clamp(4 + sc * 0.1, 4, 7));
    }
    pool.get(fire).forEach((a: Actor & { pos: Vector }) => {
      if (a.pos.distanceTo(pos) < 4) {
        isFalling = true;
        fallPos.set(pos);
        fallVy = -3;
        playScale(1, ".>.<).(((.(((.(.(.", 6, scales.minorPentatonic);
      }
    });
  });
}

function addFire() {
  fireAddTicks -= vx;
  if (fireAddTicks < 0) {
    fireAddTicks += random.get(80, 120);
    const n = random.getInt(2, 4);
    let y = random.get(15, 90 - n * 5);
    for (let i = 0; i < n; i++) {
      spawn(fire, y);
      y += 5;
    }
  }
}

function fire(a: Actor & { pos: Vector }, y) {
  a.pos = new Vector(6 * 30, y);
  a.addUpdater(() => {
    a.pos.x -= vx;
    text.print("t", a.pos.x - 3, a.pos.y - 3, {
      symbolPattern: "s",
      colorPattern: "r"
    });
    text.print("'", a.pos.x - 4, a.pos.y, { colorPattern: "y" });
    if (a.pos.x < -6) {
      a.remove();
    }
  });
}

function initBackground() {
  const green = text.rgbObjects[10];
  const context = view.context;
  context.fillStyle = `rgb(${green.r},${green.g},${green.b})`;
  context.fillRect(0, 6 * 3, 6 * 29, 6 * 12);
  const blue = text.rgbObjects[12];
  context.fillStyle = `rgb(${blue.r},${blue.g},${blue.b})`;
  context.fillRect(0, 0, 6 * 29, 6 * 3);
  let y = 6 * 3;
  let iy = 5;
  for (;;) {
    context.fillRect(0, Math.floor(y), 6 * 29, 1);
    y += iy;
    iy *= 1.5;
    if (y > 6 * 29) {
      break;
    }
  }
  view.saveAsBackground();
  for (let x = 0; x < 30; x++) {
    addBackgroundChar(x);
  }
}

function addBackgroundChar(x) {
  const c = getBackgroundLineChar();
  backLines[0][0] += c.c;
  backLines[0][1] += "p";
  backLines[0][2] += c.r;
  backLines[0][3] += "s";
  backLines[1][0] += "u";
  backLines[1][1] += "r";
  backLines[1][2] += x % 2 === 0 ? "k" : "n";
  backLines[1][3] += "s";
}

function getBackgroundLineChar() {
  const r = random.getInt(5);
  return { c: [" ", " ", "d", "f", "f"][r], r: r === 4 ? "9" : "o" };
}

function drawBackground() {
  view.drawBackground();
  for (let i = 0; i < 2; i++) {
    text.print(backLines[i][0], backX, 6 + i * 6, {
      colorPattern: backLines[i][1],
      rotationPattern: backLines[i][2],
      symbolPattern: backLines[i][3]
    });
  }
  backX -= vx / 2;
  if (backX <= -6) {
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 4; j++) {
        backLines[i][j] = backLines[i][j].substr(1);
      }
    }
    addBackgroundChar(backCharIndex);
    backX += 6;
    backCharIndex++;
  }
}

function addScore(sc, pos) {
  score += sc;
  spawn(addingScore, pos, sc);
}

function addingScore(a: Actor, _pos, sc) {
  let pos = new Vector(_pos);
  pos.x -= 10;
  let ticks = 40;
  let vy = -1;
  a.addUpdater(() => {
    pos.y += vy;
    vy *= 0.9;
    text.print(`+${sc}`, pos.x, pos.y);
    ticks--;
    if (ticks < 0) {
      a.remove();
    }
  });
}

function drawScore() {
  if (score >= 0) {
    text.print(`${score}`, 0, 0);
  }
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
