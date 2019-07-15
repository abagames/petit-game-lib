import {
  init as pglInit,
  random,
  clearJustPressed,
  isJustPressed
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
import { clamp, wrap } from "../pgl/math";

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

function initInGame() {
  state = "inGame";
  sgaReset();
  terminal.clear();
  initStage(
    String.raw`
wwwwwwww
wwwwZsNw
wwww w w
w   / zw
wwww www
wwww-www
wwwwGwww
wwwwwwww
`
  );
  spawn(ball, 1, 4, 0);
}

let changingCharPoss: Vector[];

function initStage(stagePattern: string) {
  changingCharPoss = [];
  terminal.clear();
  stagePattern.split("\n").forEach((l, y) => {
    for (let x = 0; x < l.length; x++) {
      const c = l[x];
      const sc = stageChar[c];
      if (sc != null) {
        printStageChar(sc, x, y);
        if (sc.changeTo != null) {
          changingCharPoss.push(new Vector(x, y));
        }
      }
    }
  });
}

function printStageChar(sc, x, y) {
  let options = {} as any;
  if (sc.isSymbol) {
    options.symbolPattern = "s";
  }
  if (sc.angle != null) {
    options.rotationPattern = ["k", "l", "j", "h"][sc.angle];
  }
  terminal.print(sc.char, x, y, options);
}

function initGameOver() {
  state = "gameOver";
  clearJustPressed();
  ticks = 0;
}

function update() {
  view.clear();
  if (isJustPressed) {
    changingCharPoss.forEach(p => {
      const c = terminal.getCharAt(p.x, p.y);
      const sc = getStageChar(c);
      const cc = stageChar[sc.changeTo];
      printStageChar(cc, p.x, p.y);
    });
  }
  terminal.draw();
  sgaUpdate();
  updateFunc[state]();
  ticks++;
}

const angleOffsets = [[1, 0], [0, 1], [-1, 0], [0, -1]];

interface Ball extends Actor {
  angle: number;
  step: Function;
  stepBack: Function;
  stepIfNoWall: Function;
  getStageChar: Function;
  removeStage: Function;
  checkHit: Function;
  reflect: Function;
}

function ball(b: Ball, x: number, y: number, _angle: number) {
  const pos = new Vector(x, y);
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
    const sc = b.getStageChar();
    if (sc.char === "w") {
      b.stepBack();
    }
  };
  b.getStageChar = () => {
    const c = terminal.getCharAt(pos.x, pos.y);
    return getStageChar(c);
  };
  b.removeStage = () => {
    terminal.print(" ", pos.x, pos.y);
  };
  b.checkHit = (func = "onHit") => {
    const sc = b.getStageChar();
    if (sc != null && sc[func] != null) {
      sc[func](b);
    }
  };
  b.reflect = () => {
    b.angle = wrap(b.angle + 2, 0, 4);
  };
  b.addUpdater(() => {
    ticks++;
    const moveDuration = 10;
    const stepDuration = 30;
    const t = ticks % stepDuration;
    if (t === 0) {
      b.checkHit();
      b.step();
      b.checkHit("beforeHit");
      b.stepBack();
    } else if (t === moveDuration) {
      b.step();
    }
    if (t < moveDuration) {
      const ao = angleOffsets[b.angle];
      text.print(
        "c",
        (pos.x + (ao[0] * t) / moveDuration) * 6,
        (pos.y + (ao[1] * t) / moveDuration) * 6,
        { symbolPattern: "s" }
      );
    } else {
      text.print("c", pos.x * 6, pos.y * 6, { symbolPattern: "s" });
    }
  });
}

function getStageChar(tc: { char: string; options: text.CharOptions }) {
  let result;
  Object.keys(stageChar).forEach(k => {
    const sc = stageChar[k];
    const ai = sc.angle == null ? 0 : sc.angle;
    if (tc.char === sc.char && tc.options.angleIndex == ai) {
      result = sc;
    }
  });
  return result;
}

const stageChar = {
  w: {
    char: "w",
    isSymbol: true,
    beforeHit: b => {
      b.reflect();
      b.stepBack();
      b.checkHit();
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
      b.removeStage();
      b.reflect();
      b.stepBack();
      b.checkHit();
    }
  },
  G: {
    char: "G"
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
