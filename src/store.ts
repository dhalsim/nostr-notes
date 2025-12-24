import { createStore } from "solid-js/store";

export type Waveform = 'triangle' | 'sine' | 'square' | 'sawtooth';

interface Settings {
  waveform: Waveform;
  volume: number;
  showNotes: boolean;
  showShortcuts: boolean;
}

export const [settings, setSettings] = createStore<Settings>({
  waveform: 'triangle',
  volume: 0.5,
  showNotes: true,
  showShortcuts: true,
});
