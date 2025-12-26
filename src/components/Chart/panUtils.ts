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
  onSeek: (index: number, delayMs?: number) => void;
  ignorePointerDown?: (e: PointerEvent) => boolean;
}

const SNAP_DURATION_MS = 1000;

export function createPanAndSeek(config: PanConfig) {
  const [manualOffset, setManualOffset] = createSignal(0);
  const [snapOffset, setSnapOffset] = createSignal<number | null>(null);
  const [isSnapping, setIsSnapping] = createSignal(false);
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
    setManualOffset(clamped);
    const idx = findNoteAtOffset(clamped);
    if (idx >= 0) {
      config.onSeek(idx);
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
    // If we have a snap offset, use it (for instant jump when starting playback)
    const snap = snapOffset();
    if (snap !== null) {
      return snap;
    }

    return config.isPlaying() ? config.scrollOffset() : manualOffset();
  });

  const scrollStyle = createMemo(() => {
    // When snap offset is active, use snap duration
    const snapping = isSnapping();
    const duration =
      !snapping && config.isPlaying() ? Math.max(120, config.currentNoteDurationMs()) : 0;

    // Snap animation: fast (100ms) ease-out
    if (snapping) {
      return {
        transform: `translateX(-${activeOffset()}px)`,
        transition: `transform ${SNAP_DURATION_MS}ms ease-out`,
      };
    }

    const easing = config.isPlaying() ? 'linear' : 'ease-out';

    return {
      transform: `translateX(-${activeOffset()}px)`,
      transition: duration > 0 ? `transform ${duration}ms ${easing}` : 'none',
    };
  });

  // Keep manual offset in sync when starting/stopping playback
  createEffect((prevPlaying: boolean | undefined) => {
    const isPlaying = config.isPlaying();
    const currentScrollOffset = config.scrollOffset();
    const currentManual = manualOffset();

    // When starting playback after manual scroll, snap to note start
    if (!prevPlaying && isPlaying) {
      // Find which note the user scrolled to
      const noteIdx = findNoteAtOffset(currentManual);

      if (noteIdx >= 0) {
        // Logic: Snap to the beginning of the NEXT note
        // unless we are very close to the start of the current note.
        let targetIdx = noteIdx + 1;
        const timelineItems = config.getTimeline().items;

        // If we are at the last note or past it, stay on the last note
        if (targetIdx >= timelineItems.length) {
          targetIdx = timelineItems.length > 0 ? timelineItems.length - 1 : 0;
        } else {
          // Check if we are close to the start of the current note (e.g. within 5px)
          const currentItem = timelineItems[noteIdx];
          const currentNoteStart = currentItem.x - config.playheadX;
          if (Math.abs(currentManual - currentNoteStart) < 5) {
            targetIdx = noteIdx;
          }
        }

        // Snap to the beginning of the target note
        const noteStartOffset = getNoteStartOffset(targetIdx);

        // Calculate the distance we need to snap
        const snapDistance = Math.abs(currentManual - noteStartOffset);

        // Only animate/wait if we actually need to move (> 5px threshold)
        const needsSnap = snapDistance > 5;

        if (needsSnap) {
          // Animate and delay playback
          config.onSeek(targetIdx, SNAP_DURATION_MS);
          setSnapOffset(noteStartOffset);
          setManualOffset(noteStartOffset);
          setIsSnapping(true);

          // After the snap animation, clear snap and let normal playback take over
          setTimeout(() => {
            setIsSnapping(false);
            setSnapOffset(null);
          }, SNAP_DURATION_MS);
        } else {
          // No snap needed - just seek immediately (no delay)
          config.onSeek(targetIdx);
          setManualOffset(noteStartOffset);
        }
      }
    }

    // When stopping playback, sync manual offset to current position
    if (prevPlaying && !isPlaying) {
      setManualOffset(currentScrollOffset);
      setSnapOffset(null); // Clear any pending snap
      setIsSnapping(false);
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
