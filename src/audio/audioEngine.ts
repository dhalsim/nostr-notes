import { settings, type InstrumentPreset } from '@lib/store';

import { BUILTIN_PRESETS } from './presets';

let audioCtx: AudioContext | null = null;

interface ActiveNote {
  oscs: OscillatorNode[];
  filter?: BiquadFilterNode;
  gain: GainNode;
  saturation?: WaveShaperNode;
}

const activeNotes: Record<string, ActiveNote> = {};

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

export function initAudio() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(console.error);
  }
}

function getFreq(note: string) {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = parseInt(note.slice(-1));
  const name = note.slice(0, -1);
  const idx = notes.indexOf(name);
  const midi = (octave + 1) * 12 + idx;

  return 440 * Math.pow(2, (midi - 69) / 12);
}

function getCurrentPreset(): InstrumentPreset {
  const allPresets = { ...BUILTIN_PRESETS, ...settings.customPresets };

  return allPresets[settings.currentPresetId] || BUILTIN_PRESETS['simple'];
}

function makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }

  return curve as Float32Array<ArrayBuffer>;
}

export function playNote(note: string) {
  if (activeNotes[note]) {
    return;
  }

  initAudio();
  const ctx = getAudioContext();
  const preset = getCurrentPreset();
  const freq = getFreq(note);
  const now = ctx.currentTime;

  // Create oscillators
  const oscs = preset.oscillators.map((oscConfig) => {
    const osc = ctx.createOscillator();
    osc.type = oscConfig.type;
    osc.frequency.value = freq;

    if (oscConfig.detune !== undefined) {
      osc.detune.value = oscConfig.detune;
    }

    return { osc, volume: oscConfig.volume || 1 };
  });

  // Create filter if enabled
  let filter: BiquadFilterNode | undefined;
  if (preset.filter.enabled) {
    filter = ctx.createBiquadFilter();
    filter.type = preset.filter.type;
    filter.frequency.value = preset.filter.frequency;
    filter.Q.value = preset.filter.Q;
  }

  // Create saturation if enabled
  let saturation: WaveShaperNode | undefined;
  if (preset.saturation.enabled) {
    saturation = ctx.createWaveShaper();
    saturation.curve = makeDistortionCurve(preset.saturation.amount);
    saturation.oversample = '4x';
  }

  // Create gain node
  const gain = ctx.createGain();
  gain.gain.value = 0;

  // Connect: oscs → filter → saturation → gain → destination
  const filterOrGain = filter || gain;
  const satOrGain = saturation ? saturation : gain;

  oscs.forEach(({ osc, volume }) => {
    const oscGain = ctx.createGain();
    oscGain.gain.value = volume;
    osc.connect(oscGain);
    oscGain.connect(filterOrGain);
  });

  if (filter) {
    filter.connect(satOrGain);
  }

  if (saturation) {
    saturation.connect(gain);
  }

  gain.connect(ctx.destination);

  // Apply amp envelope
  const { ampEnvelope } = preset;
  const vol = settings.volume;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(vol, now + ampEnvelope.attack);
  gain.gain.exponentialRampToValueAtTime(
    vol * ampEnvelope.sustain,
    now + ampEnvelope.attack + ampEnvelope.decay,
  );

  // Apply filter envelope if enabled
  if (filter && preset.filter.envelope) {
    const { envelope } = preset.filter;
    filter.frequency.setValueAtTime(preset.filter.frequency, now);
    filter.frequency.exponentialRampToValueAtTime(envelope.attackLevel, now + envelope.attack);
    filter.frequency.exponentialRampToValueAtTime(
      envelope.sustainLevel,
      now + envelope.attack + envelope.decay,
    );
  }

  // Start oscillators
  oscs.forEach(({ osc }) => osc.start(now));

  activeNotes[note] = { oscs: oscs.map((o) => o.osc), filter, gain, saturation };
}

export function stopNote(note: string) {
  const voice = activeNotes[note];
  if (!voice) {
    return;
  }

  const { oscs, gain } = voice;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const preset = getCurrentPreset();

  try {
    // Release envelope
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + preset.ampEnvelope.release);

    // Stop oscillators after release
    oscs.forEach((osc) => osc.stop(now + preset.ampEnvelope.release));
  } catch (e) {
    console.error(e);
  }

  delete activeNotes[note];
}
