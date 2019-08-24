import {
  init as pglInit,
  clearJustPressed,
  isJustPressed,
  random
} from "../pgl/main";
import * as view from "../pgl/view";
import * as text from "../pgl/text";
import * as terminal from "../pgl/terminal";
import {
  Actor,
  update as sgaUpdate,
  spawn,
  reset as sgaReset,
  pool
} from "../pgl/simpleGameActor";
import { Vector } from "../pgl/vector";
import { playScale, scales } from "../pgl/sound";
import { wrap, range, clamp, stableSort } from "../pgl/math";
import { Random } from "../pgl/random";

let ticks = 0;
type State = "title" | "inGame" | "gameOver";
let state: State;
let updateFunc = {
  title: updateTitle,
  inGame: updateInGame,
  gameOver: updateGameOver
};

pglInit(init, update, {
  isUsingVirtualPad: false
});

function init() {
  text.defineSymbols(charPatterns, "Y");
  //initTitle();
  initInGame();
}

function initTitle() {
  state = "title";
  ticks = 0;
  sgaReset();
}

type Level = {
  grid: string[][];
  ballPlaces: { pos: Vector; angle: number }[];
  time: number;
  score: number;
};

const ballMoveDuration = 10;
const ballStepDuration = 20;
const angleOffsets = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const levelSize = new Vector();
const levelOffset = new Vector();
let ballCount: number;
let levelTimeTarget: number;
let levels: Level[];
let currentLevel: Level;
let isGeneratingLevel: boolean;
let levelCount = 0;
let isSuccess: boolean;

function initInGame() {
  state = "inGame";
  startLevel();
}

function startLevel() {
  levelCount++;
  view.clear();
  terminal.clear();
  printLevelCount(true);
  terminal.draw();
  random.setSeed(levelCount * 12);
  levelSize.set(random.getInt(7, 15), random.getInt(7, 15));
  levelOffset
    .set(terminal.size)
    .sub(levelSize)
    .div(2)
    .floor();
  ballCount = clamp(
    random.getInt(Math.floor(1.8 + Math.sqrt(levelCount * 0.2))),
    1,
    5
  );
  levelTimeTarget = clamp(
    random.getInt(4, Math.floor(5 + Math.sqrt(levelCount * 5))),
    5,
    18
  );
  levels = [];
  isGeneratingLevel = true;
}

function update() {
  if (isGeneratingLevel) {
    tryToGenerateLevel();
    return;
  }
  view.clear();
  if (isJustPressed) {
    changeLevelChars();
  }
  terminal.draw();
  sgaUpdate();
  updateFunc[state]();
  time--;
  if (time > 0) {
    terminal.print(`TIME ${Math.floor(time / 20)} `, 0, 0);
  }
  if (time === 0) {
    isSuccess = checkGoal();
    terminal.print(isSuccess ? "SUCCESS" : "FAIL  ", 0, 0);
  } else if (time === -40) {
    if (isSuccess) {
      startLevel();
    } else {
      resetLevel(currentLevel);
    }
  }
  ticks++;
}

function changeLevelChars() {
  changingCharPoss.forEach(p => {
    const c = terminal.getCharAt(levelOffset.x + p.x, levelOffset.y + p.y);
    const sc = getLevelChar(c);
    const cc = levelChar[sc.changeTo];
    printLevelChar(cc, p.x, p.y);
  });
}

function tryToGenerateLevel() {
  sgaReset();
  terminal.clear();
  const level = generateLevel();
  if (level.time > 20) {
    level.score -= (level.time - 20) * 10;
  }
  if (level.ballPlaces.length === 0) {
    level.score -= 1000;
  }
  if (!checkLevel(level) || !checkLevel(level, true)) {
    level.score -= 100;
  }
  levels.push(level);
  if (levels.length === 60) {
    levels = stableSort(levels, (l1, l2) => l2.score - l1.score);
    currentLevel = levels[0];
    resetLevel(currentLevel);
    isGeneratingLevel = false;
  }
}

function generateLevel() {
  const level: Level = {
    grid: range(levelSize.y).map(() => range(levelSize.x).map(() => "w")),
    ballPlaces: [],
    time: 0,
    score: 0
  };
  const gridScore = range(levelSize.y).map(() =>
    range(levelSize.x).map(() => 0)
  );
  const levelGrid = level.grid;
  const ballPlaces = level.ballPlaces;
  let points: { pos: Vector; angle: number }[] = [];
  let pathCount = (levelSize.x - 2) * (levelSize.y - 2) * random.get(0.3, 0.4);
  for (let i = 0; i < 99; i++) {
    if (pathCount <= 0) {
      break;
    }
    if (points.length === 0) {
      points.push({
        pos: new Vector(
          random.getInt(1, levelSize.x - 2),
          random.getInt(1, levelSize.y - 2)
        ),
        angle: random.getInt(4)
      });
    }
    const p = points.pop();
    pathCount -= generatePath(levelGrid, random, p.pos, p.angle, points);
  }
  points.map(p => {
    levelGrid[p.pos.y][p.pos.x] = " ";
  });
  let bc = ballCount;
  for (let i = 0; i < 99; i++) {
    const p = new Vector(
      random.getInt(1, levelSize.x - 1),
      random.getInt(1, levelSize.y - 1)
    );
    if (levelGrid[p.y][p.x] === " ") {
      let angle = random.getInt(4);
      let isSpace = false;
      for (let j = 0; j < 4; j++) {
        const ao = angleOffsets[angle];
        if (levelGrid[p.y + ao[1]][p.x + ao[0]] === " ") {
          isSpace = true;
          break;
        }
        angle = wrap(angle + 1, 0, 4);
      }
      if (!isSpace) {
        continue;
      }
      ballPlaces.push({ pos: p, angle });
      levelGrid[p.y][p.x] = "w";
      bc--;
      if (bc === 0) {
        break;
      }
    }
  }
  ballPlaces.forEach(bp => {
    levelGrid[bp.pos.y][bp.pos.x] = " ";
  });
  printLevel(levelGrid.map(l => l.join("")).join("\n"));
  ballPlaces.forEach(bp => {
    spawn(
      ball,
      levelOffset.x + bp.pos.x,
      levelOffset.y + bp.pos.y,
      bp.angle,
      false
    );
  });
  level.time = 0;
  for (let i = 0; i < 99; i++) {
    for (let j = 0; j < ballStepDuration; j++) {
      sgaUpdate();
    }
    level.time++;
    if (random.get() < 0.25) {
      changeLevelChars();
    }
    if (i < levelTimeTarget) {
      continue;
    }
    let isGoal = true;
    pool.get(ball).forEach((b: Ball) => {
      const lx = b.pos.x - levelOffset.x;
      const ly = b.pos.y - levelOffset.y;
      if (levelGrid[ly][lx] !== " ") {
        isGoal = false;
        gridScore[ly][lx] = 2;
      } else {
        gridScore[ly][lx] = 1;
      }
    });
    if (!isGoal) {
      continue;
    }
    pool.get(ball).forEach((b: Ball) => {
      const lx = b.pos.x - levelOffset.x;
      const ly = b.pos.y - levelOffset.y;
      levelGrid[ly][lx] = "G";
    });
    break;
  }
  gridScore.forEach(gsl =>
    gsl.forEach(gs => {
      level.score += gs;
    })
  );
  return level;
}

function checkLevel(level: Level, isChangingLevel = false) {
  resetLevel(level, false);
  if (isChangingLevel) {
    changeLevelChars();
  }
  for (let i = 0; i < level.time * ballStepDuration; i++) {
    sgaUpdate();
  }
  return !checkGoal();
}

function checkGoal() {
  let isGoal = true;
  pool.get(ball).forEach((b: Ball) => {
    const lc = b.getLevelChar(false);
    if (lc == null || lc.char !== "G") {
      isGoal = false;
    }
  });
  return isGoal;
}

let time: number;

function resetLevel(level: Level, isBallVisible = true) {
  sgaReset();
  printLevel(level.grid.map(l => l.join("")).join("\n"));
  level.ballPlaces.forEach(bp => {
    spawn(
      ball,
      levelOffset.x + bp.pos.x,
      levelOffset.y + bp.pos.y,
      bp.angle,
      isBallVisible
    );
  });
  time = level.time * ballStepDuration;
}

function generatePath(
  level: string[][],
  random: Random,
  pos: Vector,
  _angle: number,
  points
) {
  const angle = wrap(_angle, 0, 4);
  const ao = angleOffsets[angle];
  let isBreaking = false;
  let pathCount = 0;
  for (let i = 0; i < 99; i++) {
    pos.add({ x: ao[0], y: ao[1] });
    if (
      pos.x < 1 ||
      pos.x > levelSize.x - 2 ||
      pos.y < 1 ||
      pos.y > levelSize.y - 2
    ) {
      break;
    }
    let c = random.select("/\\/\\-|sNZnzw                    ".split(""));
    if (c === "/" || c === "\\") {
      points.push({ pos: new Vector(pos), angle: angle - 1 });
      points.push({ pos: new Vector(pos), angle: angle + 1 });
    } else if (c === "N" || c === "Z" || c === "n" || c === "z") {
      const b = { angle };
      levelChar[c].onHit(b);
      if (wrap(angle - b.angle, 0, 4) === 2) {
        c = " ";
        break;
      }
      points.push({ pos: new Vector(pos), angle: b.angle });
      isBreaking = true;
    } else if (c === "w") {
      isBreaking = true;
    }
    if (level[pos.y][pos.x] === "w") {
      pathCount++;
    }
    level[pos.y][pos.x] = c;
    if (isBreaking) {
      break;
    }
  }
  return pathCount;
}

let changingCharPoss: Vector[];

function printLevel(levelPattern: string) {
  changingCharPoss = [];
  terminal.clear();
  printLevelCount();
  levelPattern.split("\n").forEach((l, y) => {
    for (let x = 0; x < l.length; x++) {
      const c = l[x];
      const sc = levelChar[c];
      if (sc != null) {
        printLevelChar(sc, x, y);
        if (sc.changeTo != null) {
          changingCharPoss.push(new Vector(x, y));
        }
      }
    }
  });
}

function printLevelChar(sc, x, y) {
  let options = {} as any;
  if (sc.isSymbol) {
    options.symbolPattern = "s";
  }
  if (sc.angle != null) {
    options.rotationPattern = ["k", "l", "j", "h"][sc.angle];
  }
  terminal.print(sc.char, levelOffset.x + x, levelOffset.y + y, options);
}

function printLevelCount(isGenerating = false) {
  terminal.print(
    `LEVEL ${levelCount} ${isGenerating ? "GENERATING..." : ""}`,
    0,
    20
  );
}

function initGameOver() {
  state = "gameOver";
  clearJustPressed();
  ticks = 0;
}

interface Ball extends Actor {
  pos: Vector;
  angle: number;
  step: Function;
  stepBack: Function;
  stepIfNoWall: Function;
  getLevelChar: Function;
  removeLevelChar: Function;
  checkHit: Function;
  reflect: Function;
}

function ball(b: Ball, x: number, y: number, _angle: number, isVisible = true) {
  b.pos = new Vector(x, y);
  const pos = b.pos;
  const prevPos = new Vector(x, y);
  let ticks = -1;
  b.angle = _angle;
  b.step = () => {
    prevPos.set(pos);
    const ao = angleOffsets[b.angle];
    pos.add({ x: ao[0], y: ao[1] });
  };
  b.stepBack = () => {
    pos.set(prevPos);
  };
  b.stepIfNoWall = () => {
    b.step();
    const sc = b.getLevelChar();
    if (sc.char === "w") {
      b.stepBack();
    }
  };
  b.getLevelChar = (isCheckingBall = true) => {
    let c = terminal.getCharAt(pos.x, pos.y);
    if (isCheckingBall) {
      pool.get(ball).map((ab: Ball) => {
        if (b !== ab && pos.x === ab.pos.x && pos.y === ab.pos.y) {
          c.char = "b";
        }
      });
    }
    return getLevelChar(c);
  };
  b.removeLevelChar = () => {
    terminal.print(" ", pos.x, pos.y);
  };
  b.checkHit = (func = "onHit") => {
    const sc = b.getLevelChar();
    if (sc != null && sc[func] != null) {
      sc[func](b);
    }
  };
  b.reflect = () => {
    b.angle = wrap(b.angle + 2, 0, 4);
  };
  b.addUpdater(() => {
    ticks++;
    const t =
      !isVisible || time > 0 ? ticks % ballStepDuration : ballMoveDuration + 1;
    if (t === 0) {
      b.checkHit();
      b.step();
      b.checkHit("beforeHit");
      b.stepBack();
    } else if (t === ballMoveDuration) {
      b.step();
    }
    if (!isVisible) {
      return;
    }
    if (t < ballMoveDuration) {
      const ao = angleOffsets[b.angle];
      text.print(
        "c",
        (pos.x + (ao[0] * t) / ballMoveDuration) * 6,
        (pos.y + (ao[1] * t) / ballMoveDuration) * 6,
        { symbolPattern: "s" }
      );
    } else {
      text.print("c", pos.x * 6, pos.y * 6, { symbolPattern: "s" });
    }
  });
}

function getLevelChar(tc: { char: string; options: text.CharOptions }) {
  let result;
  Object.keys(levelChar).forEach(k => {
    const sc = levelChar[k];
    const ai = sc.angle == null ? 0 : sc.angle;
    if (tc.char === sc.char && tc.options.angleIndex == ai) {
      result = sc;
    }
  });
  return result;
}

const levelChar = {
  w: {
    char: "w",
    isSymbol: true,
    beforeHit: b => {
      b.reflect();
      b.stepBack();
      b.checkHit();
    },
    onHit: b => {
      b.reflect();
    }
  },
  "/": {
    char: "/",
    onHit: b => {
      b.angle = [3, 2, 1, 0][b.angle];
    },
    changeTo: "\\"
  },
  "\\": {
    char: "\\",
    onHit: b => {
      b.angle = [1, 0, 3, 2][b.angle];
    },
    changeTo: "/"
  },
  "|": {
    char: "e",
    isSymbol: true,
    onHit: b => {
      if (b.angle % 2 === 0) {
        b.reflect();
      }
    },
    changeTo: "-"
  },
  "-": {
    char: "e",
    isSymbol: true,
    angle: 1,
    onHit: b => {
      if (b.angle % 2 === 1) {
        b.reflect();
      }
    },
    changeTo: "|"
  },
  Z: {
    char: "Z",
    isSymbol: true,
    onHit: b => {
      b.angle = [2, 3, 1, 0][b.angle];
    }
  },
  N: {
    char: "Y",
    isSymbol: true,
    onHit: b => {
      b.angle = [1, 3, 0, 2][b.angle];
    }
  },
  z: {
    char: "Z",
    isSymbol: true,
    angle: 2,
    onHit: b => {
      b.angle = [3, 2, 0, 1][b.angle];
    }
  },
  n: {
    char: "Y",
    isSymbol: true,
    angle: 2,
    onHit: b => {
      b.angle = [2, 0, 3, 1][b.angle];
    }
  },
  s: {
    char: "s",
    isSymbol: true,
    beforeHit: b => {
      b.removeLevelChar();
      b.reflect();
      b.stepBack();
      b.checkHit();
    }
  },
  G: {
    char: "G"
  },
  b: {
    char: "b",
    beforeHit: b => {
      b.reflect();
      b.stepBack();
      b.checkHit();
    },
    onHit: b => {
      b.reflect();
    }
  }
};

function updateTitle() {
  text.print("MAZTIC", 25, 25, { scale: 2 });
  if (ticks > 20) {
    text.print("", 5, 60, {
      charAndColorPattern: `
[Z][Click][Touch]
ycyycccccyycccccy
  Change Direction
[Hold down]
ygggggggggy
  Retry
    `
    });
  }
  if (isJustPressed) {
    initInGame();
  }
}

function updateInGame() {}

function updateGameOver() {
  text.print("GAME OVER", 30, 25, { scale: 2 });
  if (isJustPressed) {
    initInGame();
  } else if (ticks > 300) {
    initTitle();
  }
}

const charPatterns = [
  `
w w w 
 w w w
  w w
   w w
    w
     w
`,
  `
w w w 
 w w
w w
 w
w

`
];
