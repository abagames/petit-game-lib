import Tone from "tone";
import MMLIterator from "mml-iterator";
import { range } from "./math";

export const synths = [
  new Tone.Synth(getSynthParams("pulse")).chain(
    new Tone.Volume(-32),
    Tone.Master
  ),
  new Tone.Synth(getSynthParams("square")).chain(
    new Tone.Volume(-32),
    Tone.Master
  ),
  new Tone.Synth(getSynthParams("triangle")).chain(
    new Tone.Volume(-16),
    Tone.Master
  ),
  new Tone.NoiseSynth().chain(new Tone.Volume(-16), Tone.Master)
];
export const scales = {
  majorPentatonic: ["c", "d", "e", "g", "a"],
  minorPentatonic: ["c", "e-", "f", "g", "b-"]
};
const mmls: string[] = range(4).map(() => undefined);
const parts: Tone.Part[] = range(4).map(() => undefined);
const tempo = 200;
const defaultOctave = 4;
const defaultLength = 32;
const isSimultaneousSoundEnabled = true;

Tone.Transport.start();

export function play(synthNumber: number, mml: string) {
  if (mmls[synthNumber] != null && mml.length < mmls[synthNumber].length) {
    return;
  }
  mmls[synthNumber] = mml;
}

export function playScale(
  synthNumber: number,
  mml: string,
  baseOctave = defaultOctave,
  scale = scales.majorPentatonic
) {
  const sl = scale.length;
  let sn = Math.floor(baseOctave * sl);
  let o: number;
  let po = -1;
  let convertedMml = "";
  for (let i = 0; i < mml.length; i++) {
    o = Math.floor(sn / sl);
    if (po !== o) {
      convertedMml += `o${o}`;
      po = o;
    }
    const c = mml.charAt(i);
    if (c === ".") {
      convertedMml += scale[Math.floor(sn % sl)];
    } else if (c === ")") {
      sn++;
    } else if (c === "(") {
      sn--;
    } else if (c === ">") {
      sn += sl;
    } else if (c === "<") {
      sn -= sl;
    } else {
      convertedMml += c;
    }
  }
  play(synthNumber, convertedMml);
}

export function update() {
  mmls.forEach((mml, i) => {
    if (mml == null) {
      return;
    }
    if (!isSimultaneousSoundEnabled && parts[i] != null) {
      parts[i].stop();
    }
    parts[i] = getPart(
      synths[i],
      `t${tempo} o${defaultOctave} l${defaultLength} ${mml}`,
      i === 3
    );
    parts[i].start(0.1);
    mmls[i] = undefined;
  });
}

function getPart(synth, mml: string, isNoise: boolean) {
  const notes: any[] = Array.from(new MMLIterator(mml)).filter(
    (n: any) => n.type === "note"
  );
  if (isNoise) {
    return new Tone.Part(
      (time, value) => {
        synth.triggerAttackRelease(value.duration, time);
      },
      notes.map(n => {
        return { time: `+${n.time}`, duration: n.duration };
      })
    );
  } else {
    return new Tone.Part(
      (time, value) => {
        synth.triggerAttackRelease(value.freq, value.duration, time);
      },
      notes.map(n => {
        return {
          time: `+${n.time}`,
          duration: n.duration,
          freq: midiNoteNumberToFrequency(n.noteNumber)
        };
      })
    );
  }
}

export function resumeAudioContext() {
  if (Tone.context.state === "suspended") {
    Tone.context.resume();
  }
}

function getSynthParams(type: string) {
  return {
    oscillator: {
      type
    }
  };
}

function midiNoteNumberToFrequency(d) {
  const a = 440;
  return a * Math.pow(2, (d - 69) / 12);
}
