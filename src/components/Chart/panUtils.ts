import type { Accessor } from 'solid-js';
import { createEffect, createMemo, createSignal } from 'solid-js';

interface TimelineItem {
  x: number;
  w: number;
}

interface TimelineData {
  items: TimelineItem[];
}

interface PanConfig {
  playheadX: number;
  gap?: number;
  getTimeline: Accessor<TimelineData>;
  scrollOffset: Accessor<number>;
  isPlaying: Accessor<boolean>;
  currentNoteDurationMs: Accessor<number>;
  getCurrentNoteIndex: Accessor<number>;
  getLastCompletedNoteIndex: Accessor<number>;
  onSeek: (index: number, delayMs?: number) => void;
  ignorePointerDown?: (e: PointerEvent) => boolean;
}

export function createPanAndSeek(config: PanConfig) {
  const [manualOffset, setManualOffset] = createSignal(0);
  let isDragging = false;
  let dragStartX = 0;
  let dragStartOffset = 0;

  const clampOffset = (val: number) => {
    const timelineItems = config.getTimeline().items;
    if (timelineItems.length === 0) {
      return 0;
    }
    const last = timelineItems[timelineItems.length - 1];
    const maxOffset = Math.max(0, last.x + last.w + (config.gap ?? 0) - config.playheadX);
    return Math.max(0, Math.min(maxOffset, val));
  };

  const findNoteAtOffset = (offset: number): number => {
    const playheadPos = offset + config.playheadX;
    const timelineItems = config.getTimeline().items;
    let found = -1;

    for (let i = 0; i < timelineItems.length; i++) {
      const { x, w } = timelineItems[i];
      // If the playhead is inside this note's span, snap to this note (start of note)
      if (playheadPos >= x && playheadPos < x + w) {
        found = i;
        break;
      }
      if (x <= playheadPos) {
        found = i;
      } else {
        break;
      }
    }

    return found;
  };

  const getNoteStartOffset = (noteIndex: number): number => {
    const timelineItems = config.getTimeline().items;

    if (noteIndex < 0 || noteIndex >= timelineItems.length) {
      return 0;
    }

    // Calculate offset so that the note's start aligns with the playhead
    const noteX = timelineItems[noteIndex].x;
    const offset = noteX - config.playheadX;

    return Math.max(0, offset);
  };

  const applyManualOffset = (offset: number) => {
    const clamped = clampOffset(offset);
    const idx = findNoteAtOffset(clamped);

    if (idx >= 0) {
      // Snap to the beginning of the note
      const noteStartOffset = getNoteStartOffset(idx);
      const snappedOffset = clampOffset(noteStartOffset);
      setManualOffset(snappedOffset);
      config.onSeek(idx);
    } else {
      // No note found, just set the offset as-is
      setManualOffset(clamped);
    }
  };

  const handleWheel = (e: WheelEvent) => {
    if (config.isPlaying()) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    applyManualOffset(manualOffset() + delta);
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (config.ignorePointerDown?.(e)) {
      return;
    }

    if (config.isPlaying()) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
    dragStartX = e.clientX;
    dragStartOffset = manualOffset();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging || config.isPlaying()) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    const delta = dragStartX - e.clientX;
    applyManualOffset(dragStartOffset + delta);
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (!isDragging) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    isDragging = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handlePointerCancel = (e: PointerEvent) => {
    if (!isDragging) {
      return;
    }

    isDragging = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const activeOffset = createMemo(() => {
    return config.isPlaying() ? config.scrollOffset() : manualOffset();
  });

  const scrollStyle = createMemo(() => {
    const duration = config.isPlaying() ? Math.max(120, config.currentNoteDurationMs()) : 0;
    const easing = config.isPlaying() ? 'linear' : 'ease-out';

    return {
      transform: `translateX(-${activeOffset()}px)`,
      transition: duration > 0 ? `transform ${duration}ms ${easing}` : 'none',
    };
  });

  // When stopping playback, sync manual offset to current scroll position
  // This ensures manual scrolling resumes from where playback left off
  createEffect((prevPlaying: boolean | undefined) => {
    const isPlaying = config.isPlaying();

    // When stopping playback, sync manual offset to current position
    if (prevPlaying && !isPlaying) {
      const currentIdx = config.getCurrentNoteIndex();
      const lastIdx = config.getLastCompletedNoteIndex();

      // If both indices are -1, we've reset to the beginning - reset manual offset to 0
      if (currentIdx === -1 && lastIdx === -1) {
        setManualOffset(0);
      } else {
        // Otherwise, sync to the current scroll position
        setManualOffset(config.scrollOffset());
      }
    }

    return isPlaying;
  });

  return {
    manualOffset,
    activeOffset,
    scrollStyle,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    setManualOffset,
  };
}
