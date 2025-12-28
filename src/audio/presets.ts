import type { InstrumentPreset } from '@lib/store';

export const BUILTIN_PRESETS: Record<string, InstrumentPreset> = {
  simple: {
    id: 'simple',
    name: 'Simple',
    oscillators: [{ type: 'triangle' }],
    filter: {
      enabled: false,
      type: 'lowpass',
      frequency: 1000,
      Q: 1,
      envelope: {
        attack: 0,
        decay: 0,
        sustain: 1,
        release: 0,
        attackLevel: 1000,
        sustainLevel: 1000,
      },
    },
    ampEnvelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.6,
      release: 0.5,
    },
    saturation: {
      enabled: false,
      amount: 0,
    },
  },
  'bass-keyboard': {
    id: 'bass-keyboard',
    name: 'Bass Keyboard',
    oscillators: [
      { type: 'sawtooth', detune: 0, volume: 0.5 },
      { type: 'sawtooth', detune: 10, volume: 0.5 }, // slightly detuned for fatness
    ],
    filter: {
      enabled: true,
      type: 'lowpass',
      frequency: 300,
      Q: 8,
      envelope: {
        attack: 0.01,
        decay: 0.05,
        sustain: 0.25,
        release: 0.3,
        attackLevel: 900, // filter opens quickly
        sustainLevel: 250, // then closes
      },
    },
    ampEnvelope: {
      attack: 0.01,
      decay: 0.15,
      sustain: 0.4,
      release: 0.2,
    },
    saturation: {
      enabled: true,
      amount: 30, // subtle distortion
    },
  },
  'soft-piano': {
    id: 'soft-piano',
    name: 'Soft Piano',
    oscillators: [{ type: 'sine' }],
    filter: {
      enabled: true,
      type: 'lowpass',
      frequency: 2000,
      Q: 2,
      envelope: {
        attack: 0.05,
        decay: 0.3,
        sustain: 0.3,
        release: 0.5,
        attackLevel: 4000,
        sustainLevel: 1500,
      },
    },
    ampEnvelope: {
      attack: 0.02,
      decay: 0.2,
      sustain: 0.3,
      release: 0.8,
    },
    saturation: {
      enabled: false,
      amount: 0,
    },
  },
};
