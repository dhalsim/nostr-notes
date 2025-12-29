import type { UserInputEvent } from '@lib/playbackStore';

class UserInputTracker {
  private events: UserInputEvent[] = [];
  private activePresses: Map<string, number> = new Map(); // note -> pressTime

  /**
   * Record a key press event
   */
  recordPress(note: string, timestamp: number = Date.now()): void {
    // If already pressed, ignore (prevent duplicates)
    if (this.activePresses.has(note)) {
      return;
    }

    this.activePresses.set(note, timestamp);
    this.events.push({
      note,
      pressTime: timestamp,
      releaseTime: null,
    });
  }

  /**
   * Record a key release event
   */
  recordRelease(note: string, timestamp: number = Date.now()): void {
    const pressTime = this.activePresses.get(note);
    if (!pressTime) {
      return; // No matching press found
    }

    this.activePresses.delete(note);

    // Find the most recent event for this note that hasn't been released
    for (let i = this.events.length - 1; i >= 0; i--) {
      const event = this.events[i];
      if (event.note === note && event.releaseTime === null) {
        event.releaseTime = timestamp;
        return;
      }
    }
  }

  /**
   * Get all events within a time window
   */
  getEventsInWindow(startTime: number, endTime: number): UserInputEvent[] {
    return this.events.filter(
      (event) => event.pressTime >= startTime && event.pressTime <= endTime,
    );
  }

  /**
   * Get the most recent event for any octave of a note (octave-agnostic)
   */
  getLatestEventForNoteAnyOctave(note: string): UserInputEvent | null {
    // Extract note name without octave
    const noteName = note.replace(/-?\d+$/, '');

    for (let i = this.events.length - 1; i >= 0; i--) {
      const eventNoteName = this.events[i].note.replace(/-?\d+$/, '');
      if (eventNoteName.toLowerCase() === noteName.toLowerCase()) {
        return this.events[i];
      }
    }
    return null;
  }

  /**
   * Get all events for a specific note
   */
  getEventsForNote(note: string): UserInputEvent[] {
    return this.events.filter((event) => event.note === note);
  }

  /**
   * Get the most recent event (any note)
   */
  getLatestEvent(): UserInputEvent | null {
    return this.events.length > 0 ? this.events[this.events.length - 1] : null;
  }

  /**
   * Clear all tracked events
   */
  clear(): void {
    this.events = [];
    this.activePresses.clear();
  }

  /**
   * Get all currently active (pressed but not released) notes
   */
  getActiveNotes(): string[] {
    return Array.from(this.activePresses.keys());
  }

  /**
   * Check if a note is currently pressed
   */
  isNotePressed(note: string): boolean {
    return this.activePresses.has(note);
  }

  /**
   * Check if any octave of a note is currently pressed (octave-agnostic)
   */
  isNotePressedAnyOctave(note: string): boolean {
    // Extract note name without octave (e.g., "C4" -> "C", "F#5" -> "F#")
    const noteName = note.replace(/-?\d+$/, '');

    // Check if any pressed note matches this note name (any octave)
    for (const pressedNote of this.activePresses.keys()) {
      const pressedNoteName = pressedNote.replace(/-?\d+$/, '');
      if (pressedNoteName.toLowerCase() === noteName.toLowerCase()) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get total number of events
   */
  getTotalEventCount(): number {
    return this.events.length;
  }
}

// Singleton instance
export const userInputTracker = new UserInputTracker();
