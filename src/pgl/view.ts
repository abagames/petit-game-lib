import { Vector, VectorLike } from "./vector";

export const size = new Vector();
export let canvas: HTMLCanvasElement;
export let context: CanvasRenderingContext2D;

const bodyCss = `
-webkit-touch-callout: none;
-webkit-tap-highlight-color: black;
-webkit-user-select: none;
-moz-user-select: none;
-ms-user-select: none;
user-select: none;
background: #111;
color: white;
`;
const canvasCss = `
position: absolute;
left: 50%;
top: 50%;
transform: translate(-50%, -50%);
image-rendering: -moz-crisp-edges;
image-rendering: -webkit-optimize-contrast;
image-rendering: -o-crisp-edges;
image-rendering: pixelated;
`;
let background = document.createElement("img");

export function setSize(_size: VectorLike) {
  size.set(_size);
}

export function init() {
  document.body.style.cssText = bodyCss;
  canvas = document.createElement("canvas");
  canvas.width = size.x;
  canvas.height = size.y;
  canvas.style.cssText = canvasCss;
  const cs = 95;
  const cw = size.x >= size.y ? cs : (cs / size.y) * size.x;
  const ch = size.y >= size.x ? cs : (cs / size.x) * size.y;
  canvas.style.width = `${cw}vmin`;
  canvas.style.height = `${ch}vmin`;
  context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  document.body.appendChild(canvas);
}

export function clear() {
  context.fillStyle = "black";
  context.fillRect(0, 0, size.x, size.y);
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
