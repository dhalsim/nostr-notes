import type { Melody, NoteEvent } from '@lib/components/Chart';
import { playback, setPlayback } from '@lib/playbackStore';
import { settings } from '@lib/store';

import { playNote, stopNote } from './audioEngine';
import {
  calculateTimingError,
  checkDurationMatch,
  checkNoteMatch,
  createError,
  ERROR_TYPES,
} from './noteMatcher';
import { userInputTracker } from './userInputTracker';

let playbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
let currentlyPlayingNote: string | null = null;
let noteStartTime: number | null = null;
let expectedNoteStartTime: number | null = null;

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
 * Calculates the duration of a note in milliseconds based on tempo
 */
function getNoteDurationMs(duration: number, tempo: number): number {
  const msPerBeat = 60000 / tempo;
  return duration * msPerBeat;
}

/**
 * Check user input against expected note and record errors
 */
function checkNoteErrors(noteIndex: number, expectedNote: NoteEvent, noteStartTime: number): void {
  const noteEndTime = Date.now();
  const expectedDuration = getNoteDurationMs(expectedNote.duration, settings.tempo);

  // Find user input events during this note's time window
  const userEvents = userInputTracker.getEventsInWindow(noteStartTime, noteEndTime);

  if (userEvents.length === 0) {
    // User didn't play anything - missed note
    setPlayback('errors', [
      ...playback.errors,
      createError(ERROR_TYPES.MISSED_NOTE, noteIndex, {
        expectedNote: expectedNote.note,
      }),
    ]);
    return;
  }

  // Find the event that matches the expected note (if any)
  const matchingEvent = userEvents.find((event) => checkNoteMatch(expectedNote.note, event.note));

  if (!matchingEvent) {
    // User played wrong note(s)
    const wrongNote = userEvents[0].note;
    setPlayback('errors', [
      ...playback.errors,
      createError(ERROR_TYPES.WRONG_NOTE, noteIndex, {
        expectedNote: expectedNote.note,
        actualNote: wrongNote,
      }),
    ]);
    return;
  }

  // Check timing
  const timingError = calculateTimingError(noteStartTime, matchingEvent.pressTime);
  const timingTolerance = 100; // ms

  if (timingError < -timingTolerance) {
    // Too early
    setPlayback('errors', [
      ...playback.errors,
      createError(ERROR_TYPES.TOO_EARLY, noteIndex, {
        expectedNote: expectedNote.note,
        actualNote: matchingEvent.note,
        timingError: Math.abs(timingError),
      }),
    ]);
  } else if (timingError > timingTolerance) {
    // Too late
    setPlayback('errors', [
      ...playback.errors,
      createError(ERROR_TYPES.TOO_LATE, noteIndex, {
        expectedNote: expectedNote.note,
        actualNote: matchingEvent.note,
        timingError,
      }),
    ]);
  }

  // Check duration if note was released
  if (matchingEvent.releaseTime !== null) {
    const actualDuration = matchingEvent.releaseTime - matchingEvent.pressTime;
    const durationTolerance = 150; // ms

    if (!checkDurationMatch(expectedDuration, actualDuration, durationTolerance)) {
      const durationError = actualDuration - expectedDuration;
      setPlayback('errors', [
        ...playback.errors,
        createError(ERROR_TYPES.WRONG_DURATION, noteIndex, {
          expectedNote: expectedNote.note,
          actualNote: matchingEvent.note,
          durationError: Math.abs(durationError),
        }),
      ]);
    }
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

  // Check errors for the previous note if we just finished one
  if (noteIndex > 0 && noteStartTime !== null && expectedNoteStartTime !== null) {
    const prevNote = melody[noteIndex - 1];
    checkNoteErrors(noteIndex - 1, prevNote, expectedNoteStartTime);
  }

  // Stop if reached end
  if (noteIndex >= melody.length) {
    // Check errors for the last note
    if (noteStartTime !== null && expectedNoteStartTime !== null) {
      const lastNote = melody[melody.length - 1];
      checkNoteErrors(melody.length - 1, lastNote, expectedNoteStartTime);
    }
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

  // Record when this note should start
  expectedNoteStartTime = Date.now();
  noteStartTime = expectedNoteStartTime;

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
    setPlayback('errors', []);
    userInputTracker.clear();
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

  noteStartTime = null;
  expectedNoteStartTime = null;
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

  noteStartTime = null;
  expectedNoteStartTime = null;
  userInputTracker.clear();
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

  noteStartTime = null;
  expectedNoteStartTime = null;

  // Resume if was playing
  if (wasPlaying && clampedIndex >= 0) {
    scheduleNextNote(clampedIndex);
  }
}
