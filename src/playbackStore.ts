import { createStore } from 'solid-js/store';

import type { NoteEvent } from './components/Chart';

export interface PlaybackState {
  isPlaying: boolean;
  currentNoteIndex: number; // -1 when stopped/not started
  tempo: number; // BPM
  melody: NoteEvent[];
}

const DEFAULT_PLAYBACK_STATE: PlaybackState = {
  isPlaying: false,
  currentNoteIndex: -1,
  tempo: 120,
  melody: [],
};

export const [playback, setPlayback] = createStore<PlaybackState>(DEFAULT_PLAYBACK_STATE);
