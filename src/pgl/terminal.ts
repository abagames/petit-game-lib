import * as text from "./text";
import { range, wrap } from "./math";
import { Vector, VectorLike } from "./vector";

export let size = new Vector();
let charGrid: string[][];
let colorGrid: string[][];
let backgroundColorGrid: string[][];
let rotationGrid: string[][];
let symbolGrid: string[][];

export function init(_size: VectorLike) {
  size.set(_size);
  charGrid = range(size.x).map(() => range(size.y).map(() => undefined));
  colorGrid = range(size.x).map(() => range(size.y).map(() => undefined));
  backgroundColorGrid = range(size.x).map(() =>
    range(size.y).map(() => undefined)
  );
  rotationGrid = range(size.x).map(() => range(size.y).map(() => undefined));
  symbolGrid = range(size.x).map(() => range(size.y).map(() => undefined));
}

export function print(
  _str: string,
  x: number,
  y: number,
  options: text.Options = {}
) {
  const bx = x;
  let colorLines =
    options.colorPattern != null ? options.colorPattern.split("\n") : undefined;
  const backgroundColorLines =
    options.backgroundColorPattern != null
      ? options.backgroundColorPattern.split("\n")
      : undefined;
  const rotationLines =
    options.rotationPattern != null
      ? options.rotationPattern.split("\n")
      : undefined;
  const symbolLines =
    options.symbolPattern != null
      ? options.symbolPattern.split("\n")
      : undefined;
  let str = _str;
  if (options.charAndColorPattern != null) {
    const [_lines, _colorLines] = text.getColorLines(
      options.charAndColorPattern
    );
    str = _lines.join("\n");
    colorLines = _colorLines;
  }
  let lx = 0;
  let ly = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === "\n") {
      x = bx;
      y++;
      lx = 0;
      ly++;
      continue;
    }
    if (x < 0 || x >= size.x || y < 0 || y >= size.y) {
      x++;
      lx++;
      continue;
    }
    charGrid[x][y] = c;
    colorGrid[x][y] = text.getCharFromLines(colorLines, lx, ly);
    backgroundColorGrid[x][y] = text.getCharFromLines(
      backgroundColorLines,
      lx,
      ly
    );
    rotationGrid[x][y] = text.getCharFromLines(rotationLines, lx, ly);
    symbolGrid[x][y] = text.getCharFromLines(symbolLines, lx, ly);
    x++;
    lx++;
  }
}

export function getCharAt(_x: number, _y: number) {
  const x = wrap(_x, 0, size.x);
  const y = wrap(_y, 0, size.y);
  const char = charGrid[x][y];
  const cg = colorGrid[x][y];
  const bg = backgroundColorGrid[x][y];
  const rg = rotationGrid[x][y];
  const sg = symbolGrid[x][y];
  return { char, options: text.getCharOption(cg, bg, rg, sg) };
}

export function setCharAt(
  _x: number,
  _y: number,
  char: string,
  options?: text.CharOptions
) {
  const x = wrap(_x, 0, size.x);
  const y = wrap(_y, 0, size.y);
  charGrid[x][y] = char;
  if (options == null) {
    colorGrid[x][y] = backgroundColorGrid[x][y] = rotationGrid[x][
      y
    ] = undefined;
    return;
  }
  colorGrid[x][y] = options.color;
  backgroundColorGrid[x][y] = options.backgroundColor;
  if (options.angleIndex == null) {
    rotationGrid[x][y] = undefined;
  } else {
    let ri = options.angleIndex;
    if (options.isMirrorX) {
      ri |= 4;
    }
    if (options.isMirrorY) {
      ri |= 8;
    }
    rotationGrid[x][y] = text.rotationChars.charAt(ri);
  }
  symbolGrid[x][y] = options.isSymbol ? "s" : undefined;
}

export function draw() {
  for (let x = 0; x < size.x; x++) {
    for (let y = 0; y < size.y; y++) {
      const c = charGrid[x][y];
      if (c == null) {
        continue;
      }
      const cg = colorGrid[x][y];
      const bg = backgroundColorGrid[x][y];
      const rg = rotationGrid[x][y];
      const sg = symbolGrid[x][y];
      text.printChar(c, x * text.letterSize, y * text.letterSize, {
        ...text.getCharOption(cg, bg, rg, sg),
        ...{ scale: 1, alpha: 1 }
      });
    }
  }
}

export function clear() {
  for (let x = 0; x < size.x; x++) {
    for (let y = 0; y < size.y; y++) {
      charGrid[x][y] = colorGrid[x][y] = backgroundColorGrid[x][
        y
      ] = rotationGrid[x][y] = symbolGrid[x][y] = undefined;
    }
  }
}

export function getState() {
  return {
    charGrid: charGrid.map(l => [].concat(l)),
    colorGrid: colorGrid.map(l => [].concat(l)),
    backgroundColorGrid: backgroundColorGrid.map(l => [].concat(l)),
    rotationGrid: rotationGrid.map(l => [].concat(l)),
    symbolGrid: symbolGrid.map(l => [].concat(l))
  };
}

export function setState(state) {
  charGrid = state.charGrid.map(l => [].concat(l));
  colorGrid = state.colorGrid.map(l => [].concat(l));
  backgroundColorGrid = state.backgroundColorGrid.map(l => [].concat(l));
  rotationGrid = state.rotationGrid.map(l => [].concat(l));
  symbolGrid = state.symbolGrid.map(l => [].concat(l));
}
