import { For, createMemo } from 'solid-js';

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
  const START_X = 20;
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

  const svgWidth = createMemo(() => Math.max(600, props.melody.length * 50 + 50));

  return (
    <div class="flex-1 min-w-max bg-white rounded-md shadow-inner p-1 relative overflow-visible">
      <svg
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
        <For each={props.melody}>
          {(item, index) => {
            const x = createMemo(() => START_X + index() * 50);
            const y = createMemo(() => getStaffY(item.note));
            const color = createMemo(() => getNoteColor(item.note, settings.noteColors));
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
                      x1={x() - 10}
                      y1={ly}
                      x2={x() + 10}
                      y2={ly}
                      stroke="#999"
                      stroke-width="1"
                    />
                  )}
                </For>
                <circle
                  cx={x()}
                  cy={y()}
                  r={NOTE_RADIUS}
                  fill={color()}
                  stroke="#000"
                  stroke-width="1"
                />
                <line
                  x1={x() + NOTE_RADIUS}
                  y1={y()}
                  x2={x() + NOTE_RADIUS}
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
  );
};

export default SheetChart;
