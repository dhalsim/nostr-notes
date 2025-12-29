import type { Melody, NoteEvent } from '@lib/components/Chart';
import { playback, setPlayback } from '@lib/playbackStore';
import { setSettings, settings } from '@lib/store';
import { adjustBaseOctaveForNote } from '@lib/utils/musicUtils';

import { playNote, stopNote } from '../audioEngine';
import { getNoteDurationMs } from '../utils';

let playbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
let currentlyPlayingNote: string | null = null;

function isSameMelody(a: NoteEvent[], b: NoteEvent[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i += 1) {
    if (a[i].note !== b[i].note || a[i].duration !== b[i].duration) {
      return false;
    }
  }

  return true;
}

/**
 * Initialize the engine with a melody (without starting playback)
 */
export function init(melody?: Melody | NoteEvent[]): void {
  const melodyNotes = Array.isArray(melody) ? melody : melody?.notes;
  if (melodyNotes && !isSameMelody(melodyNotes, playback.melody)) {
    setPlayback('melody', melodyNotes);
    setPlayback('currentNoteIndex', -1);
    setPlayback('lastCompletedNoteIndex', -1);
  }
}

/**
 * Schedules and plays notes sequentially
 */
function scheduleNextNote(noteIndex: number): void {
  const { melody, isPlaying, startAfterTs } = playback;
  const { tempo } = settings;

  // Stop if not playing
  if (!isPlaying) {
    return;
  }

  // If we have a delayed start, wait until the target timestamp before playing
  if (startAfterTs) {
    const now = Date.now();
    const remaining = startAfterTs - now;

    if (remaining > 0) {
      playbackTimeoutId = setTimeout(() => {
        scheduleNextNote(noteIndex);
      }, remaining);

      return;
    }
    // Delay elapsed, clear it
    setPlayback('startAfterTs', null);
  }

  // Stop if reached end
  if (noteIndex >= melody.length) {
    // Reset to beginning (stop() already resets indices to -1)
    stop();

    return;
  }

  const note = melody[noteIndex];

  // Stop the previous note if any
  if (currentlyPlayingNote) {
    stopNote(currentlyPlayingNote);
  }

  // Update current note index in store
  setPlayback('currentNoteIndex', noteIndex);

  // Adjust baseOctave to make the current note visible
  const optimalBaseOctave = adjustBaseOctaveForNote(
    note.note,
    settings.baseOctave,
    settings.octaveCount,
  );

  if (optimalBaseOctave !== settings.baseOctave) {
    setSettings('baseOctave', optimalBaseOctave);
  }

  // Play the current note
  playNote(note.note);
  currentlyPlayingNote = note.note;

  // Schedule the next note
  const durationMs = getNoteDurationMs(note.duration, tempo);

  playbackTimeoutId = setTimeout(() => {
    setPlayback('lastCompletedNoteIndex', noteIndex);
    scheduleNextNote(noteIndex + 1);
  }, durationMs);
}

/**
 * Start or resume playback
 */
export function play(input?: Melody | NoteEvent[]): void {
  const melodyNotes = Array.isArray(input) ? input : input?.notes;

  // If melody is provided, set it. Only reset if it's truly a new melody.
  if (melodyNotes && !isSameMelody(melodyNotes, playback.melody)) {
    setPlayback('melody', melodyNotes);
    setPlayback('currentNoteIndex', -1);
    setPlayback('lastCompletedNoteIndex', -1);
  }

  // Don't start if no melody
  if (playback.melody.length === 0) {
    return;
  }

  // Clear any pending delayed start unless explicitly set via seek
  setPlayback('startAfterTs', null);

  setPlayback('isPlaying', true);

  // Start from the note right after the last completed one (or beginning)
  const startIndex = playback.lastCompletedNoteIndex < 0 ? 0 : playback.lastCompletedNoteIndex + 1;
  scheduleNextNote(startIndex);
}

/**
 * Pause playback at current position
 */
export function pause(): void {
  setPlayback('isPlaying', false);

  if (playbackTimeoutId) {
    clearTimeout(playbackTimeoutId);
    playbackTimeoutId = null;
  }

  if (currentlyPlayingNote) {
    stopNote(currentlyPlayingNote);
    currentlyPlayingNote = null;
  }
}

/**
 * Stop playback and reset to beginning
 */
export function stop(): void {
  setPlayback('currentNoteIndex', -1);
  setPlayback('lastCompletedNoteIndex', -1);
  setPlayback('isPlaying', false);

  if (playbackTimeoutId) {
    clearTimeout(playbackTimeoutId);
    playbackTimeoutId = null;
  }

  if (currentlyPlayingNote) {
    stopNote(currentlyPlayingNote);
    currentlyPlayingNote = null;
  }
}

/**
 * Toggle between play and pause
 */
export function toggle(melody?: Melody | NoteEvent[]): void {
  if (playback.isPlaying) {
    pause();
  } else {
    play(melody);
  }
}

/**
 * Set the tempo (BPM)
 */
export function setTempo(tempo: number): void {
  setSettings('tempo', Math.max(20, Math.min(300, tempo)));
}

/**
 * Seek to a specific note index
 */
export function seek(noteIndex: number, delayMs: number = 0): void {
  const wasPlaying = playback.isPlaying;

  // Stop current playback
  if (playbackTimeoutId) {
    clearTimeout(playbackTimeoutId);
    playbackTimeoutId = null;
  }

  if (currentlyPlayingNote) {
    stopNote(currentlyPlayingNote);
    currentlyPlayingNote = null;
  }

  // Set the new position
  const clampedIndex = Math.max(-1, Math.min(noteIndex, playback.melody.length - 1));
  setPlayback('currentNoteIndex', clampedIndex);
  setPlayback('lastCompletedNoteIndex', Math.max(-1, clampedIndex - 1));
  setPlayback('startAfterTs', delayMs > 0 ? Date.now() + delayMs : null);

  // Resume if was playing
  if (wasPlaying && clampedIndex >= 0) {
    scheduleNextNote(clampedIndex);
  }
}
