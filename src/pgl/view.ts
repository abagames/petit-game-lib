import * as keyboard from "./keyboard";
import * as pointer from "./pointer";
import * as text from "./text";
import * as sound from "./sound";
import { Vector } from "./vector";
import { wrap } from "./math";

export const size = 126;
export let canvas: HTMLCanvasElement;
export let context: CanvasRenderingContext2D;
export let stickAngle = 0;
let centerPos = new Vector(size / 2);
let offsetFromCenter = new Vector();
let lastFrameTime = 0;

const bodyCss = `
-webkit-touch-callout: none;
-webkit-tap-highlight-color: black;
-webkit-user-select: none;
-moz-user-select: none;
-ms-user-select: none;
user-select: none;
background: black;
color: white;
`;
const canvasCss = `
position: absolute;
left: 50%;
top: 50%;
transform: translate(-50%, -50%);
width: 95vmin;
height: 95vmin;
image-rendering: -moz-crisp-edges;
image-rendering: -webkit-optimize-contrast;
image-rendering: -o-crisp-edges;
image-rendering: pixelated;
`;
let _init: () => void;
let _update: () => void;
let background = document.createElement("img");

export function init(__init: () => void, __update: () => void) {
  _init = __init;
  _update = __update;
  window.addEventListener("load", onLoad);
}

export function clear() {
  context.fillStyle = "black";
  context.fillRect(0, 0, size, size);
}

export function rect(x: number, y: number, width: number, height: number) {
  context.fillRect(x, y, width, height);
}

export function saveAsBackground() {
  background.src = canvas.toDataURL();
}

export function drawBackground() {
  context.drawImage(background, 0, 0);
}

function onLoad() {
  document.body.style.cssText = bodyCss;
  canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  canvas.style.cssText = canvasCss;
  context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  document.body.appendChild(canvas);
  keyboard.init({ onKeyDown: sound.resumeAudioContext });
  pointer.init(canvas, new Vector(size), {
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
  _update();
  if (pointer.isPressed) {
    text.print("c", size / 2 - 2, size / 2 - 2, {
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
}
