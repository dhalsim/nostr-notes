import { createEffect } from 'solid-js';
import { createStore } from 'solid-js/store';

export type Waveform = 'triangle' | 'sine' | 'square' | 'sawtooth';

interface Settings {
  waveform: Waveform;
  volume: number;
  showNotes: boolean;
  showShortcuts: boolean;
  octaveCount: number; // 1 or 2
  baseOctave: number; // e.g., 3, 4, 5
}

const SETTINGS_VERSION = 1;
const STORAGE_KEY = 'solid-piano-settings';

const DEFAULT_SETTINGS: Settings = {
  waveform: 'triangle',
  volume: 0.5,
  showNotes: true,
  showShortcuts: true,
  octaveCount: 1,
  baseOctave: 4,
};

// Load from LocalStorage
const loadSettings = (): Settings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.version === SETTINGS_VERSION && parsed.data) {
        return { ...DEFAULT_SETTINGS, ...parsed.data };
      }
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
};

export const [settings, setSettings] = createStore<Settings>(loadSettings());

// Save to LocalStorage on change
createEffect(() => {
  const data = JSON.stringify({
    version: SETTINGS_VERSION,
    data: settings,
  });
  
  localStorage.setItem(STORAGE_KEY, data);
});
