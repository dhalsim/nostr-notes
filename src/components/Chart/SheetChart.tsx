import { For, createMemo } from 'solid-js';

import { playback } from '@lib/playbackStore';
import { settings } from '@lib/store';
import { getNoteColor } from '@lib/utils/musicUtils';

import type { NoteEvent } from './index';

interface SheetChartProps {
  melody: NoteEvent[];
}

const SheetChart = (props: SheetChartProps) => {
  // Sheet View Constants (in viewBox units)
  const VIEWBOX_HEIGHT = 80;
  const STAFF_LINE_SPACING = 12;
  const NOTE_RADIUS = 6;
  const NOTE_SPACING = 50;
  const PLAYHEAD_X = 90; // Fixed playhead position from left
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
    let cursorX = START_X;
    const computed = props.melody.map((item) => {
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

  const currentNoteDurationMs = createMemo(() => {
    if (!playback.isPlaying) {
      return 0;
    }

    const idx = playback.currentNoteIndex;
    if (idx < 0 || idx >= props.melody.length) {
      return 0;
    }

    const note = props.melody[idx];
    const msPerBeat = 60000 / playback.tempo;
    return note.duration * msPerBeat;
  });

  // Calculate scroll offset to align current note with playhead
  const scrollOffset = createMemo(() => {
    const { currentNoteIndex, isPlaying } = playback;
    if (!isPlaying || currentNoteIndex < 0) {
      return 0;
    }

    // Target the NEXT note's position to slide smoothly across the current note's duration
    // This creates the effect of the current note sliding away from the playhead
    const targetIndex = currentNoteIndex + 1;
    const timelineItems = timeline().items;

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

  const scrollStyle = createMemo(() => {
    const duration = playback.isPlaying ? Math.max(120, currentNoteDurationMs()) : 200;
    const easing = playback.isPlaying ? 'linear' : 'ease-out';

    return {
      transform: `translateX(-${scrollOffset()}px)`,
      transition: `transform ${duration}ms ${easing}`,
    };
  });

  return (
    <div class="flex-1 min-w-max bg-white rounded-md shadow-inner p-1 relative overflow-hidden">
      {/* Playhead line - fixed position */}
      <div
        class="pointer-events-none absolute inset-y-3 w-0.5 bg-red-500 z-20"
        style={{ left: `${PLAYHEAD_X}px` }}
      >
        <div class="absolute -left-[1px] inset-y-0 w-1 bg-red-400/70 blur-sm" />
      </div>

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

            {/* Notes */}
            <For each={items()}>
              {({ item, x }, index) => {
                const y = createMemo(() => getStaffY(item.note));
                const color = createMemo(() => getNoteColor(item.note, settings.noteColors));
                const isCurrentNote = () => playback.currentNoteIndex === index();
                const topLineY = STAFF_BASE_Y - (STAFF_LINE_COUNT - 1) * STAFF_LINE_SPACING;
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
                    <circle
                      cx={x}
                      cy={y()}
                      r={NOTE_RADIUS}
                      fill={color()}
                      stroke="#000"
                      stroke-width="1"
                      class={isCurrentNote() ? 'brightness-125' : ''}
                    />
                    <line
                      x1={x + NOTE_RADIUS}
                      y1={y()}
                      x2={x + NOTE_RADIUS}
                      y2={y() - 18}
                      stroke="#000"
                      stroke-width="1.5"
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
