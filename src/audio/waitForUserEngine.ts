import type { Melody, NoteEvent } from '@lib/components/Chart';
import { playback, setPlayback } from '@lib/playbackStore';
import { settings } from '@lib/store';

import { playNote, stopNote } from './audioEngine';
import { checkNoteMatch } from './noteMatcher';
import { userInputTracker } from './userInputTracker';
import { getNoteDurationMs } from './utils';

let currentlyPlayingNote: string | null = null;
let inputCheckInterval: ReturnType<typeof setInterval> | null = null;
let lastCheckedEventCount = 0;
let noteDurationTimeout: ReturnType<typeof setTimeout> | null = null;

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
 * Check for user input and advance if correct note is played
 */
function checkUserInput(): void {
  const { melody, isPlaying, expectedNoteIndex } = playback;

  // Stop if not playing
  if (!isPlaying) {
    return;
  }

  // Stop if reached end
  if (expectedNoteIndex >= melody.length) {
    stop();
    return;
  }

  const expectedNote = melody[expectedNoteIndex];
  const expectedNoteName = expectedNote.note;

  // Check if we're waiting for duration (current note is set and matches expected)
  const isWaitingForDuration = playback.currentNoteIndex === expectedNoteIndex;

  if (isWaitingForDuration) {
    // Check if the key is still pressed
    if (!userInputTracker.isNotePressed(expectedNoteName)) {
      // Key was released before duration elapsed - reset and wait for them to press again
      if (noteDurationTimeout) {
        clearTimeout(noteDurationTimeout);
        noteDurationTimeout = null;
      }
      // Stop the note that was playing
      if (currentlyPlayingNote) {
        stopNote(currentlyPlayingNote);
        currentlyPlayingNote = null;
      }
      // Reset current note index so it doesn't show as playing
      setPlayback('currentNoteIndex', expectedNoteIndex - 1);
      return; // Wait for them to press the key again
    }

    // Get press time from the latest event (which should still be active)
    const latestEvent = userInputTracker.getLatestEventForNote(expectedNoteName);
    if (!latestEvent || latestEvent.releaseTime !== null) {
      // Shouldn't happen if isNotePressed is true, but handle it
      setPlayback('currentNoteIndex', expectedNoteIndex - 1);
      return;
    }

    const pressTime = latestEvent.pressTime;
    const durationMs = getNoteDurationMs(expectedNote.duration, settings.tempo);
    const elapsed = Date.now() - pressTime;

    if (elapsed >= durationMs) {
      // Duration has elapsed and key is still pressed, advance to next note
      if (noteDurationTimeout) {
        clearTimeout(noteDurationTimeout);
        noteDurationTimeout = null;
      }
      advanceToNextNote();
      return;
    }
    // Still waiting for duration, don't check for new events yet
    return;
  }

  // Get total event count to see if we have new events
  const currentEventCount = userInputTracker.getTotalEventCount();

  if (currentEventCount <= lastCheckedEventCount) {
    return; // No new events
  }

  // We have new events - get all events and check the new ones
  const allEvents = userInputTracker.getEventsInWindow(0, Date.now());
  const newEvents = allEvents.slice(lastCheckedEventCount);

  // Update the count we've checked
  lastCheckedEventCount = currentEventCount;

  // Check all new events - if any match the expected note, start duration tracking
  for (const newEvent of newEvents) {
    if (checkNoteMatch(expectedNoteName, newEvent.note)) {
      // Correct note! Start duration tracking
      const durationMs = getNoteDurationMs(expectedNote.duration, settings.tempo);

      // Set a timeout as a backup to advance if checkUserInput stops being called
      // Calculate when the timeout should fire based on when the note was pressed
      const timeUntilAdvance = durationMs - (Date.now() - newEvent.pressTime);
      if (timeUntilAdvance > 0) {
        noteDurationTimeout = setTimeout(() => {
          // Double-check that we're still waiting for this note and it's still pressed
          if (
            playback.currentNoteIndex === expectedNoteIndex &&
            userInputTracker.isNotePressed(expectedNoteName)
          ) {
            noteDurationTimeout = null;
            advanceToNextNote();
          }
        }, timeUntilAdvance);
      }

      // Update current note index immediately so it shows as playing
      setPlayback('currentNoteIndex', expectedNoteIndex);
      playNote(expectedNoteName);
      currentlyPlayingNote = expectedNoteName;

      return; // Found correct note, wait for duration
    }
  }
}

/**
 * Advance to the next note in the melody
 */
function advanceToNextNote(): void {
  const { melody, expectedNoteIndex } = playback;

  // Stop the previous note if any
  if (currentlyPlayingNote) {
    stopNote(currentlyPlayingNote);
  }

  const currentNote = melody[expectedNoteIndex];

  // Update indices
  const newIndex = expectedNoteIndex + 1;
  setPlayback('currentNoteIndex', expectedNoteIndex);
  setPlayback('lastCompletedNoteIndex', expectedNoteIndex);
  setPlayback('expectedNoteIndex', newIndex);

  // Update next note to play for piano highlighting
  if (newIndex < melody.length) {
    setPlayback('nextNoteToPlay', melody[newIndex].note);
  } else {
    setPlayback('nextNoteToPlay', null);
  }

  // Stop the note (user already played it, we just played it for visual feedback)
  if (currentlyPlayingNote) {
    stopNote(currentlyPlayingNote);
    currentlyPlayingNote = null;
  }

  // Check if we've reached the end
  if (newIndex >= melody.length) {
    // Wait for the duration of the last note before stopping
    const durationMs = getNoteDurationMs(currentNote.duration, settings.tempo);
    setTimeout(() => {
      stop();
    }, durationMs);
  }
}

/**
 * Start checking for user input
 */
function startInputChecking(): void {
  if (inputCheckInterval) {
    return; // Already checking
  }

  // Check for user input every 50ms
  inputCheckInterval = setInterval(() => {
    checkUserInput();
  }, 50);
}

/**
 * Stop checking for user input
 */
function stopInputChecking(): void {
  if (inputCheckInterval) {
    clearInterval(inputCheckInterval);
    inputCheckInterval = null;
  }
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
    setPlayback('expectedNoteIndex', -1);
    setPlayback('errors', []);
    userInputTracker.clear();
  }

  // Don't start if no melody
  if (playback.melody.length === 0) {
    return;
  }

  setPlayback('isPlaying', true);

  // Start from the note right after the last completed one (or beginning)
  const startIndex = playback.lastCompletedNoteIndex < 0 ? 0 : playback.lastCompletedNoteIndex + 1;
  setPlayback('expectedNoteIndex', startIndex);
  // Reset event tracking - get current count so we only process new events
  // If we're starting from the beginning (startIndex === 0), we want to process the event
  // that triggered this play() call, so we set it to count - 1
  // Otherwise, we set it to current count to ignore previous events
  const currentCount = userInputTracker.getTotalEventCount();
  if (startIndex === 0 && currentCount > 0) {
    // Starting from beginning - allow processing the event that triggered play
    lastCheckedEventCount = currentCount - 1;
  } else {
    // Resuming or starting fresh - ignore all previous events
    lastCheckedEventCount = currentCount;
  }

  // Set next note to play for piano highlighting
  if (startIndex < playback.melody.length) {
    setPlayback('nextNoteToPlay', playback.melody[startIndex].note);
  } else {
    setPlayback('nextNoteToPlay', null);
  }

  // Start checking for user input
  startInputChecking();
}

/**
 * Pause playback at current position
 */
export function pause(): void {
  setPlayback('isPlaying', false);
  stopInputChecking();

  // Clear duration tracking timeout
  if (noteDurationTimeout) {
    clearTimeout(noteDurationTimeout);
    noteDurationTimeout = null;
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
  setPlayback('expectedNoteIndex', -1);
  setPlayback('isPlaying', false);
  setPlayback('nextNoteToPlay', null);

  stopInputChecking();

  // Clear duration tracking timeout
  if (noteDurationTimeout) {
    clearTimeout(noteDurationTimeout);
    noteDurationTimeout = null;
  }

  if (currentlyPlayingNote) {
    stopNote(currentlyPlayingNote);
    currentlyPlayingNote = null;
  }

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
export function seek(noteIndex: number, _delayMs: number = 0): void {
  const wasPlaying = playback.isPlaying;

  // Stop current playback
  stopInputChecking();

  if (currentlyPlayingNote) {
    stopNote(currentlyPlayingNote);
    currentlyPlayingNote = null;
  }

  // Set the new position
  const clampedIndex = Math.max(-1, Math.min(noteIndex, playback.melody.length - 1));
  setPlayback('currentNoteIndex', clampedIndex);
  setPlayback('lastCompletedNoteIndex', Math.max(-1, clampedIndex - 1));
  setPlayback('expectedNoteIndex', clampedIndex >= 0 ? clampedIndex : -1);

  // Update next note to play
  if (clampedIndex >= 0 && clampedIndex < playback.melody.length) {
    setPlayback('nextNoteToPlay', playback.melody[clampedIndex].note);
  } else {
    setPlayback('nextNoteToPlay', null);
  }

  // Resume if was playing
  if (wasPlaying && clampedIndex >= 0) {
    startInputChecking();
  }
}
