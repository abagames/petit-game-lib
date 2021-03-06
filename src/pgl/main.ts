import * as view from "./view";
import * as keyboard from "./keyboard";
import * as pointer from "./pointer";
import * as text from "./text";
import * as sound from "./sound";
import * as terminal from "./terminal";
import { wrap } from "./math";
import { Vector, VectorLike } from "./vector";
import { Random } from "./random";

export type Options = {
  viewSize?: VectorLike;
  isUsingVirtualPad?: boolean;
};

export let stickAngle = 0;
export let isPressed = false;
export let isJustPressed = false;
export const random = new Random();
let centerPos = new Vector();
let offsetFromCenter = new Vector();
let lastFrameTime = 0;
let _init: () => void;
let _update: () => void;
const defaultOptions: Options = {
  viewSize: { x: 126, y: 126 },
  isUsingVirtualPad: true
};
let options: Options;
let ticks = 0;

export function init(
  __init: () => void,
  __update: () => void,
  _options?: Options
) {
  _init = __init;
  _update = __update;
  options = { ...defaultOptions, ..._options };
  view.setSize(options.viewSize);
  centerPos.set(view.size.x / 2, view.size.y / 2);
  const terminalSize = {
    x: Math.ceil(view.size.x / text.letterSize),
    y: Math.ceil(view.size.y / text.letterSize)
  };
  terminal.init(terminalSize);
  window.addEventListener("load", onLoad);
}

export function clearJustPressed() {
  keyboard.clearJustPressed();
  pointer.clearJustPressed();
}

function onLoad() {
  view.init();
  keyboard.init({
    onKeyDown: sound.resumeAudioContext,
    isUsingStickKeysAsButton: true
  });
  pointer.init(view.canvas, view.size, {
    onPointerDownOrUp: sound.resumeAudioContext
  });
  text.init();
  _init();
  update();
}

function update() {
  requestAnimationFrame(update);
  const now = window.performance.now();
  const timeSinceLast = now - lastFrameTime;
  if (timeSinceLast < 1000 / 60 - 5) {
    return;
  }
  lastFrameTime = now;
  sound.update();
  stickAngle = -1;
  keyboard.update();
  if (keyboard.stickAngle >= 0) {
    stickAngle = keyboard.stickAngle;
  }
  pointer.update();
  if (pointer.isPressed) {
    if (pointer.isJustPressed) {
      pointer.setTargetPos(centerPos);
    }
    offsetFromCenter.set(pointer.targetPos).sub(centerPos);
    if (offsetFromCenter.length > 10) {
      const oa = offsetFromCenter.getAngle() / (Math.PI / 4);
      stickAngle = wrap(Math.round(oa), 0, 8);
    }
  }
  isPressed = keyboard.isPressed || pointer.isPressed;
  isJustPressed = keyboard.isJustPressed || pointer.isJustPressed;
  _update();
  view.update();
  if (options.isUsingVirtualPad && pointer.isPressed) {
    text.print("c", view.size.x / 2 - 2, view.size.y / 2 - 2, {
      colorPattern: "b",
      backgroundColorPattern: "t",
      symbolPattern: "s",
      alpha: 0.5
    });
    let cc = "c";
    let rc = "k";
    if (stickAngle >= 0) {
      cc = stickAngle % 2 === 0 ? "a" : "z";
      rc = "kljh".charAt(Math.floor(stickAngle / 2));
    }
    text.print(cc, pointer.targetPos.x - 2, pointer.targetPos.y - 2, {
      colorPattern: "g",
      backgroundColorPattern: "t",
      symbolPattern: "s",
      rotationPattern: rc,
      alpha: 0.5
    });
  }
  ticks++;
  if (ticks === 10) {
    text.enableCache();
  }
}
