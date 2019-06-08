import { init as pglInit, stickAngle } from "./pgl/main";
import * as view from "./pgl/view";
import * as text from "./pgl/text";
import * as terminal from "./pgl/terminal";
import { Actor, update as sgaUpdate, spawn } from "./pgl/simpleGameActor";
import { Vector } from "./pgl/vector";

function init() {
  text.defineSymbols(charPatterns, "A");
  spawn(player);
  terminal.print("I-----I", 1, 1, { colorPattern: "pcccccp" });
}

function player(a: Actor) {
  const pos = new Vector(60);
  let rotationPattern = "k";
  let walkTicks = 0;
  let walkPattern = 0;
  a.addUpdater(() => {
    if (stickAngle >= 0) {
      pos.addAngle((stickAngle * Math.PI) / 4, 1);
      if (stickAngle >= 7 || stickAngle <= 1) {
        rotationPattern = "k";
      }
      if (stickAngle >= 3 && stickAngle <= 5) {
        rotationPattern = "n";
      }
      walkTicks -= 3;
    } else {
      walkTicks--;
    }
    if (walkTicks < 0) {
      walkTicks += 30;
      walkPattern = (walkPattern + 1) % 2;
    }
    text.print(walkPattern === 0 ? "A" : "B", pos.x, pos.y, {
      rotationPattern,
      symbolPattern: "s"
    });
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

function update() {
  view.clear();
  sgaUpdate();
  terminal.draw();
}

pglInit(init, update);
