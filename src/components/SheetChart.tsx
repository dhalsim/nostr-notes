import { For, createMemo } from 'solid-js';

import { settings } from '@lib/store';
import { getNoteColor, getSolfege } from '@lib/utils/musicUtils';

import type { NoteEvent } from './Chart/index';

interface SheetChartProps {
  melody: NoteEvent[];
}

const SheetChart = (props: SheetChartProps) => {
  // Sheet View Constants
  const STAFF_LINE_SPACING = 10;
  const NOTE_RADIUS = 6;
  const START_X = 20;

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

    // If spacing is 10, half-spacing is 5.
    // E4 is at some Y. F4 is Y - 5.
    const baseY = 80; // Arbitrary base for E4 (bottom line)
    return baseY - diff * (STAFF_LINE_SPACING / 2);
  };

  const svgWidth = createMemo(() => Math.max(600, props.melody.length * 50 + 50));

  return (
    <div class="h-[120px] min-w-max bg-white rounded-lg shadow-inner p-4 relative overflow-visible">
      <svg height="100%" width={`${svgWidth()}px`}>
        {/* Staff Lines */}
        {/* We draw 5 lines. Base Y is bottom line E4 at 80. */}
        {/* 80, 70, 60, 50, 40 */}
        <For each={[0, 1, 2, 3, 4]}>
          {(i) => (
            <line
              x1="0"
              y1={80 - i * STAFF_LINE_SPACING}
              x2="100%"
              y2={80 - i * STAFF_LINE_SPACING}
              stroke="#999"
              stroke-width="1"
            />
          )}
        </For>

        {/* Notes */}
        <For each={props.melody}>
          {(item, index) => {
            const x = createMemo(() => Number(START_X) + index() * 50);
            const y = createMemo(() => getStaffY(item.note));
            const color = createMemo(() => getNoteColor(item.note, settings.noteColors));

            // Ledger lines?
            // If Y > 80 (below E4) or Y < 40 (above F5)
            // C4 is 80 + 10 = 90. Needs line at 90.
            // A5 is 40 - 10 = 30. Needs line at 30.

            const showLedgerLine = createMemo(() => y() >= 90 || y() <= 30); // Rough check

            return (
              <g>
                {showLedgerLine() && (
                  <line
                    x1={x() - 10}
                    y1={y()}
                    x2={x() + 10}
                    y2={y()}
                    stroke="#999"
                    stroke-width="1"
                  />
                )}
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
                  y2={y() - 25}
                  stroke="#000"
                  stroke-width="1.5"
                />
                {/* Note Name Label below staff? */}
                <text x={x()} y={110} font-size="10" text-anchor="middle" fill="#666">
                  {getSolfege(item.note)}
                </text>
              </g>
            );
          }}
        </For>
      </svg>
    </div>
  );
};

export default SheetChart;
