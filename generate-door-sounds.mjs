// Original synthesized Halloween effects. No game samples or recorded voices.
// Regenerate with: node generate-door-sounds.mjs
import { writeFile } from 'node:fs/promises';
const rate = 22050, seconds = 2.3;
const sine = (frequency, time) => Math.sin(2 * Math.PI * frequency * time);
for (const creature of ['zombie', 'witch', 'ghost']) {
  const samples = new Float64Array(Math.round(rate * seconds));
  let phase = 0, seed = 7183;
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate, voiceTime = Math.max(0, t - .38);
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 4294967296 * 2 - 1;
    // A short, descending hinge creak before the creature answers.
    const creakEnvelope = t < .6 ? Math.sin(Math.PI * t / .6) ** 2 : 0;
    const creak = .17 * creakEnvelope * (sine(310 - 170 * t, t) + .4 * noise) * (.6 + .4 * sine(17, t));
    let voice = 0;
    const envelope = t > .38 ? Math.min(1, voiceTime / .12) * Math.min(1, (seconds - t) / .4) : 0;
    if (creature === 'zombie') {
      phase += 2 * Math.PI * (65 + 12 * sine(2.3, voiceTime)) / rate;
      voice = (Math.sin(phase) + .4 * Math.sin(3 * phase) + .2 * Math.sin(7 * phase) + .1 * noise) * (.6 + .4 * sine(3, voiceTime));
    } else if (creature === 'witch') {
      const pulse = Math.max(0, sine(4.6, voiceTime)) ** .65;
      phase += 2 * Math.PI * (330 + 130 * pulse + 25 * sine(8, voiceTime)) / rate;
      voice = pulse * (Math.sin(phase) + .35 * Math.sin(2 * phase) + .12 * Math.sin(5 * phase));
    } else {
      phase += 2 * Math.PI * (380 - 125 * voiceTime + 12 * sine(5, voiceTime)) / rate;
      voice = (.8 * Math.sin(phase) + .25 * Math.sin(2.006 * phase)) * (.75 + .25 * sine(1.8, voiceTime));
    }
    samples[i] = creak + .35 * envelope * voice;
  }
  const peak = Math.max(...samples.map(Math.abs));
  const wav = Buffer.alloc(44 + samples.length * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVE', 8);
  wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
  wav.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((value, i) => wav.writeInt16LE(Math.round(value / peak * 24000), 44 + i * 2));
  await writeFile(new URL(`door-${creature}.wav`, import.meta.url), wav);
}
