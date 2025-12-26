import { For, createEffect, createMemo } from 'solid-js';

import { seek } from '@lib/audio/playbackEngine';
import { playback, setPlayback } from '@lib/playbackStore';
import { settings } from '@lib/store';
import { getNoteColor } from '@lib/utils/musicUtils';

import { createPanAndSeek } from './panUtils';
import { PlayheadControls } from './PlayheadControls';
import type { Melody, NoteEvent } from './index';

interface SheetChartProps {
  melody: Melody;
}

const SheetChart = (props: SheetChartProps) => {
  // Sheet View Constants (in viewBox units)
  const VIEWBOX_HEIGHT = 80;
  const STAFF_LINE_SPACING = 12;
  const NOTE_RADIUS = 6;
  const NOTE_SPACING = 50;
  const PLAYHEAD_X = 40; // Fixed playhead position from left
  const START_X = PLAYHEAD_X;
  const STAFF_LINE_COUNT = 5;
  const STAFF_BASE_Y = 52; // bottom line (E4), positioned to leave room for low notes

  // Helper to map note to Y position on staff
  const getStaffY = (note: string) => {
    const noteName = note.replace(/\d+/, '').replace('#', '');
    const octave = parseInt(note.match(/\d+/)?.[0] || '4');

    // Map notes to scale steps relative to C4
    const scale = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const idx = scale.indexOf(noteName);
    const globalStep = (octave - 4) * 7 + idx;

    // Reference: G4 is on the second line from bottom?
    // Treble Clef:
    // Bottom line is E4.
    // E4 -> step 2 (C4=0, D4=1, E4=2)

    const E4_Step = 2; // C=0, D=1, E=2
    const diff = globalStep - E4_Step;

    return STAFF_BASE_Y - diff * (STAFF_LINE_SPACING / 2);
  };

  // Precompute X positions based on duration (timeline)
  const timeline = createMemo(() => {
    let cursorX = START_X + 8;
    const computed = props.melody.notes.map((item) => {
      const x = cursorX;
      // Use proportional spacing: duration * spacing unit
      // This ensures constant scroll speed (pixels per beat is constant)
      const w = item.duration * NOTE_SPACING;
      cursorX += w;
      return { item, x, w };
    });

    return {
      items: computed,
      width: Math.max(600, cursorX + 200),
    };
  });
  const items = () => timeline().items;
  const svgWidth = () => timeline().width;

  const isSameNotes = (a: NoteEvent[], b: NoteEvent[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i].note !== b[i].note || a[i].duration !== b[i].duration) return false;
    }
    return true;
  };

  // Ensure playback store has the melody even before first play (needed for seek-on-scroll)
  createEffect(() => {
    const notes = props.melody.notes;
    if (!isSameNotes(notes, playback.melody)) {
      setPlayback('melody', notes);
      setPlayback('currentNoteIndex', -1);
      setPlayback('lastCompletedNoteIndex', -1);
    }
  });

  const currentNoteDurationMs = createMemo(() => {
    if (!playback.isPlaying) {
      return 0;
    }

    const idx = playback.currentNoteIndex;
    if (idx < 0 || idx >= props.melody.notes.length) {
      return 0;
    }

    const note = props.melody.notes[idx];
    const msPerBeat = 60000 / settings.tempo;
    return note.duration * msPerBeat;
  });

  // Calculate scroll offset to align current note with playhead
  const scrollOffset = createMemo(() => {
    const anchorIndex = playback.isPlaying ? playback.currentNoteIndex : playback.lastCompletedNoteIndex;
    if (anchorIndex < 0) {
      return 0;
    }

    const targetIndex = anchorIndex + 1;
    const timelineItems = timeline().items;;

    // If we're at the last note, we target the end of the timeline
    let targetX = 0;
    if (targetIndex < timelineItems.length) {
      targetX = timelineItems[targetIndex].x;
    } else if (timelineItems.length > 0) {
      // End of song: last note X + last note Width
      const last = timelineItems[timelineItems.length - 1];
      targetX = last.x + last.w;
    }

    const offset = targetX - PLAYHEAD_X;
    return Math.max(0, offset);
  });

  // Calculate measure lines
  const measureLines = createMemo(() => {
    if (!props.melody.ratio) return [];

    const [beatsPerMeasure, beatNoteValue] = props.melody.ratio;
    // Calculate measure duration in relative duration units (assuming 1 = quarter note)
    // Formula: beatsPerMeasure * (4 / beatNoteValue)
    // e.g. 4/4 -> 4 * (4/4) = 4 units
    // e.g. 6/8 -> 6 * (4/8) = 3 units (if 1 unit = quarter note)
    const measureDuration = beatsPerMeasure * (4 / beatNoteValue);
    
    // We need to cover the entire timeline width
    const width = svgWidth();
    const lines: number[] = [];
    
    // Calculate total duration to know how far to draw
    const totalDuration = props.melody.notes.reduce((acc, note) => acc + note.duration, 0);
    const totalMeasures = Math.ceil(totalDuration / measureDuration);

    for (let i = 1; i <= totalMeasures; i++) {
      // Each measure starts at START_X + cumulative duration * spacing
      const x = START_X + (i * measureDuration * NOTE_SPACING);
      if (x < width) {
        lines.push(x);
      }
    }
    
    return lines;
  });

  // Find the note index at a given offset (playhead position)
  const findNoteAtOffset = (offset: number): number => {
    const playheadPosition = offset + PLAYHEAD_X;
    const timelineItems = timeline().items;
    let foundIndex = -1;

    for (let i = 0; i < timelineItems.length; i++) {
      if (timelineItems[i].x <= playheadPosition) {
        foundIndex = i;
      } else {
        break;
      }
    }

    return foundIndex;
  };

  // Calculate max scroll offset
  const maxOffset = createMemo(() => {
    const timelineItems = timeline().items;
    if (timelineItems.length === 0) return 0;
    const last = timelineItems[timelineItems.length - 1];
    return Math.max(0, last.x + last.w - PLAYHEAD_X);
  });

  const {
    manualOffset,
    activeOffset,
    scrollStyle,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    setManualOffset,
  } = createPanAndSeek({
    playheadX: PLAYHEAD_X,
    gap: 0,
    getTimeline: timeline,
    scrollOffset,
    isPlaying: () => playback.isPlaying,
    currentNoteDurationMs,
    onSeek: seek,
    ignorePointerDown: (e) => !!(e.target instanceof HTMLElement && e.target.closest('button')),
  });

  // Attach wheel event listener with passive: false to allow preventDefault
  return (
    <div
      class="flex-1 min-w-max bg-white rounded-md shadow-inner p-1 relative overflow-hidden"
      onWheel={(e) => handleWheel(e)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{ 'touch-action': 'none' }}
    >
      {/* Playhead Controls */}
      <PlayheadControls
        x={PLAYHEAD_X}
        melodyNotes={props.melody.notes}
        onRewind={() => setManualOffset(0)}
      />

      {/* Scrollable content */}
      <div class="relative w-full h-full">
        <div class="h-full" style={{ width: `${svgWidth()}px`, ...scrollStyle() }}>
          <svg
            class="block h-full"
            viewBox={`0 0 ${svgWidth()} ${VIEWBOX_HEIGHT}`}
            width={`${svgWidth()}px`}
            height="100%"
            preserveAspectRatio="none"
          >
            {/* Staff Lines */}
            <For each={Array.from({ length: STAFF_LINE_COUNT }, (_, i) => i)}>
              {(i) => (
                <line
                  x1="0"
                  y1={STAFF_BASE_Y - i * STAFF_LINE_SPACING}
                  x2="100%"
                  y2={STAFF_BASE_Y - i * STAFF_LINE_SPACING}
                  stroke="#999"
                  stroke-width="1"
                />
              )}
            </For>

            {/* Measure Lines */}
            <For each={measureLines()}>
              {(x) => (
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2="100%"
                  stroke="#ccc"
                  stroke-width="2"
                  stroke-dasharray="4 4"
                />
              )}
            </For>

            {/* Notes */}
            <For each={items()}>
              {({ item, x }, index) => {
                const y = createMemo(() => getStaffY(item.note));
                const color = createMemo(() => getNoteColor(item.note, settings.noteColors));
                const isCurrentNote = () => playback.currentNoteIndex === index();
                const topLineY = STAFF_BASE_Y - (STAFF_LINE_COUNT - 1) * STAFF_LINE_SPACING;

                // Visual distinction for duration
                const isHollow = item.duration >= 2;
                const hasStem = item.duration < 4;

                const ledgerLines = createMemo(() => {
                  const yValue = y();
                  const lines: number[] = [];

                  if (yValue >= STAFF_BASE_Y + STAFF_LINE_SPACING) {
                    for (
                      let ly = STAFF_BASE_Y + STAFF_LINE_SPACING;
                      ly <= yValue;
                      ly += STAFF_LINE_SPACING
                    ) {
                      lines.push(ly);
                    }
                  }

                  if (yValue <= topLineY - STAFF_LINE_SPACING) {
                    for (
                      let ly = topLineY - STAFF_LINE_SPACING;
                      ly >= yValue;
                      ly -= STAFF_LINE_SPACING
                    ) {
                      lines.push(ly);
                    }
                  }

                  return lines;
                });

                return (
                  <g>
                    {/* Ledger lines */}
                    <For each={ledgerLines()}>
                      {(ly) => (
                        <line
                          x1={x - 10}
                          y1={ly}
                          x2={x + 10}
                          y2={ly}
                          stroke="#999"
                          stroke-width="1"
                        />
                      )}
                    </For>

                    {/* Stem (drawn before note head to appear behind) */}
                    {hasStem && (
                      <line
                        x1={x + NOTE_RADIUS}
                        y1={y()}
                        x2={x + NOTE_RADIUS}
                        y2={y() - 24}
                        stroke="#000"
                        stroke-width="1.5"
                      />
                    )}

                    {/* Note Head */}
                    <circle
                      cx={x}
                      cy={y()}
                      r={NOTE_RADIUS}
                      fill={isHollow ? '#fff' : color()}
                      stroke={isHollow ? color() : '#000'}
                      stroke-width={isHollow ? '2' : '1'}
                      class={isCurrentNote() ? 'brightness-125' : ''}
                    />
                  </g>
                );
              }}
            </For>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default SheetChart;
