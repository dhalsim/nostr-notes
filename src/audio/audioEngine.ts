import { settings } from '@lib/store';

let audioCtx: AudioContext | null = null;

interface ActiveNote {
  osc: OscillatorNode;
  gain: GainNode;
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

export function playNote(note: string) {
  if (activeNotes[note]) {
    return;
  }

  initAudio();
  const ctx = getAudioContext();

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = settings.waveform;
  osc.frequency.value = getFreq(note);

  const now = ctx.currentTime;
  const vol = settings.volume;

  // ADSR Envelope
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(vol, now + 0.01); // Attack
  gainNode.gain.exponentialRampToValueAtTime(vol * 0.6, now + 0.11); // Decay to Sustain

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);

  activeNotes[note] = { osc, gain: gainNode };
}

export function stopNote(note: string) {
  const voice = activeNotes[note];
  if (voice) {
    const { osc, gain } = voice;
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.stop(now + 0.5);
    } catch (e) {
      console.error(e);
    }

    delete activeNotes[note];
  }
}
