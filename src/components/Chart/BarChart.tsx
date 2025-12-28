import { For, Show, createEffect, createMemo } from 'solid-js';

import { seek } from '@lib/audio/playback/router';
import { playback, setPlayback } from '@lib/playbackStore';
import { settings } from '@lib/store';
import { getNoteColor, getNoteContrastColor, getSolfege } from '@lib/utils/musicUtils';

import { createPanAndSeek } from './panUtils';
import { PlayheadControls } from './PlayheadControls';

import type { Melody, NoteEvent } from './index';

interface BarChartProps {
  melody: Melody;
}

const BarChart = (props: BarChartProps) => {
  const BAR_WIDTH_UNIT = 60; // px per duration unit
  const BAR_GAP = 6;
  const BAR_HEIGHT = 10;
  const PLAYHEAD_X = 40; // Fixed playhead position from left

  // Staff-like grid constants (in viewBox units)
  const VIEWBOX_HEIGHT = 80;
  const STAFF_LINE_SPACING = 12;
  const STAFF_BASE_Y = 52; // bottom line (E4), positioned to leave room for low notes
  const STAFF_LINE_COUNT = 5;
  const START_X = PLAYHEAD_X;

  const getStaffY = (note: string) => {
    const noteName = note.replace(/\d+/, '').replace('#', '');
    const octave = parseInt(note.match(/\d+/)?.[0] || '4');

    // Map notes to scale steps relative to C4
    const scale = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const idx = scale.indexOf(noteName);
    const globalStep = (octave - 4) * 7 + idx;

    // Treble clef reference used in SheetChart: bottom line is E4.
    const E4_Step = 2; // C=0, D=1, E=2
    const diff = globalStep - E4_Step;

    // Each diatonic step is a half-line (line/space), so spacing/2.
    return STAFF_BASE_Y - diff * (STAFF_LINE_SPACING / 2);
  };

  // Precompute X positions based on duration (timeline), not index.
  const timeline = createMemo(() => {
    let cursorX = START_X;
    const computed = props.melody.notes.map((item) => {
      const x = cursorX;
      // Use grid-based width: occupy the full slot minus gap
      const w = item.duration * BAR_WIDTH_UNIT - BAR_GAP;
      cursorX += item.duration * BAR_WIDTH_UNIT;
      return { item, x, w };
    });

    return {
      items: computed,
      width: Math.max(600, cursorX + 200), // Extra padding for scroll
    };
  });

  const items = () => timeline().items;
  const svgWidth = () => timeline().width;

  const isSameNotes = (a: NoteEvent[], b: NoteEvent[]) => {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i += 1) {
      if (a[i].note !== b[i].note || a[i].duration !== b[i].duration) {
        return false;
      }
    }
    return true;
  };

  // Hydrate playback melody so seek works before play
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
    const anchorIndex = playback.isPlaying
      ? playback.currentNoteIndex
      : playback.lastCompletedNoteIndex;
    if (anchorIndex < 0) {
      return 0;
    }

    const targetIndex = anchorIndex + 1;
    const timelineItems = timeline().items;

    // If we're at the last note, we target the end of the timeline
    let targetX = 0;
    if (targetIndex < timelineItems.length) {
      targetX = timelineItems[targetIndex].x;
    } else if (timelineItems.length > 0) {
      // End of song: last note X + last note Width + Gap
      // Or just next slot
      const last = timelineItems[timelineItems.length - 1];
      targetX = last.x + last.w + BAR_GAP;
    }

    const offset = targetX - PLAYHEAD_X;
    return Math.max(0, offset);
  });

  // Calculate measure lines
  const measureLines = createMemo(() => {
    if (!props.melody.ratio) {
      return [];
    }

    const [beatsPerMeasure, beatNoteValue] = props.melody.ratio;
    const measureDuration = beatsPerMeasure * (4 / beatNoteValue);

    const width = svgWidth();
    const lines: number[] = [];
    const totalDuration = props.melody.notes.reduce((acc, note) => acc + note.duration, 0);
    const totalMeasures = Math.ceil(totalDuration / measureDuration);

    for (let i = 1; i <= totalMeasures; i++) {
      const x = START_X + i * measureDuration * BAR_WIDTH_UNIT;
      if (x < width) {
        lines.push(x);
      }
    }
    return lines;
  });

  const {
    scrollStyle,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    setManualOffset,
  } = createPanAndSeek({
    playheadX: PLAYHEAD_X,
    gap: BAR_GAP,
    getTimeline: timeline,
    scrollOffset,
    isPlaying: () => playback.isPlaying,
    currentNoteDurationMs,
    getCurrentNoteIndex: () => playback.currentNoteIndex,
    getLastCompletedNoteIndex: () => playback.lastCompletedNoteIndex,
    onSeek: seek,
    ignorePointerDown: (e) => !!(e.target instanceof HTMLElement && e.target.closest('button')),
  });

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
            {/* 5 staff lines (grid rows) */}
            <For each={Array.from({ length: STAFF_LINE_COUNT }, (_, i) => i)}>
              {(i) => (
                <line
                  x1="0"
                  y1={STAFF_BASE_Y - i * STAFF_LINE_SPACING}
                  x2="100%"
                  y2={STAFF_BASE_Y - i * STAFF_LINE_SPACING}
                  stroke="#c7c7c7"
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

            {/* Bars positioned by pitch (high on top) */}
            <For each={items()}>
              {({ item, x, w }, index) => {
                const yCenter = createMemo(() => getStaffY(item.note));
                const y = createMemo(() => yCenter() - BAR_HEIGHT / 2);
                const color = createMemo(() => getNoteColor(item.note, settings.noteColors));
                const contrastColor = createMemo(() =>
                  getNoteContrastColor(item.note, settings.contrastColors),
                );
                const label = createMemo(() => getSolfege(item.note));
                const isCurrentNote = () => playback.currentNoteIndex === index();
                const noteErrors = createMemo(() =>
                  playback.errors.filter((error) => error.noteIndex === index()),
                );

                const topLineY = STAFF_BASE_Y - (STAFF_LINE_COUNT - 1) * STAFF_LINE_SPACING;
                const ledgerLines = createMemo(() => {
                  const current = yCenter();
                  const lines: number[] = [];

                  if (current >= STAFF_BASE_Y + STAFF_LINE_SPACING) {
                    for (
                      let ly = STAFF_BASE_Y + STAFF_LINE_SPACING;
                      ly <= current;
                      ly += STAFF_LINE_SPACING
                    ) {
                      lines.push(ly);
                    }
                  }

                  if (current <= topLineY - STAFF_LINE_SPACING) {
                    for (
                      let ly = topLineY - STAFF_LINE_SPACING;
                      ly >= current;
                      ly -= STAFF_LINE_SPACING
                    ) {
                      lines.push(ly);
                    }
                  }

                  return lines;
                });

                return (
                  <g>
                    <title>{item.note}</title>
                    {/* Ledger lines */}
                    <For each={ledgerLines()}>
                      {(ly) => (
                        <line
                          x1={x - 4}
                          y1={ly}
                          x2={x + w + 4}
                          y2={ly}
                          stroke="#c7c7c7"
                          stroke-width="1"
                        />
                      )}
                    </For>
                    <rect
                      x={x}
                      y={y()}
                      width={w}
                      height={BAR_HEIGHT}
                      rx="4"
                      fill={color()}
                      class={isCurrentNote() ? 'brightness-125' : ''}
                    />
                    {w >= 28 && (
                      <text
                        x={x + w / 2}
                        y={yCenter() + 3}
                        font-size="9"
                        text-anchor="middle"
                        fill={contrastColor()}
                      >
                        {label()}
                      </text>
                    )}
                    {/* Error indicators */}
                    <For each={noteErrors()}>
                      {(error) => {
                        const errorColor =
                          error.type === 'WRONG_NOTE' || error.type === 'MISSED_NOTE'
                            ? '#ef4444' // Red
                            : error.type === 'TOO_EARLY' || error.type === 'TOO_LATE'
                              ? '#eab308' // Yellow
                              : '#f97316'; // Orange for duration errors
                        return (
                          <g>
                            {/* Error circle/X */}
                            <circle
                              cx={x + w / 2}
                              cy={yCenter()}
                              r="8"
                              fill={errorColor}
                              opacity="0.9"
                            />
                            <text
                              x={x + w / 2}
                              y={yCenter() + 3}
                              font-size="10"
                              text-anchor="middle"
                              fill="white"
                              font-weight="bold"
                            >
                              {error.type === 'WRONG_NOTE' || error.type === 'MISSED_NOTE'
                                ? '✕'
                                : error.type === 'TOO_EARLY'
                                  ? '←'
                                  : error.type === 'TOO_LATE'
                                    ? '→'
                                    : '~'}
                            </text>
                          </g>
                        );
                      }}
                    </For>
                  </g>
                );
              }}
            </For>
            {/* Error count display */}
            <Show when={playback.errors.length > 0 && settings.playbackMode === 'errorTracking'}>
              <g>
                <rect x="10" y="10" width="120" height="25" rx="4" fill="rgba(0, 0, 0, 0.7)" />
                <text x="20" y="27" font-size="12" fill="white">
                  Errors: {playback.errors.length}
                </text>
              </g>
            </Show>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default BarChart;
