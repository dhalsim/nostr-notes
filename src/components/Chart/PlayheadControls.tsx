import type { Component } from 'solid-js';

import { seek, toggle } from '@lib/audio/playbackRouter';
import { playback } from '@lib/playbackStore';
import { setSettings, settings } from '@lib/store';

import type { NoteEvent } from './index';

interface PlayheadControlsProps {
  x: number;
  melodyNotes: NoteEvent[];
  onRewind: () => void;
}

export const PlayheadControls: Component<PlayheadControlsProps> = (props) => {
  return (
    <div
      class="absolute inset-y-3 w-0.5 bg-red-500 z-20 flex flex-col justify-end items-center"
      style={{ left: `${props.x}px` }}
    >
      <div class="absolute -left-[1px] inset-y-0 w-1 bg-red-400/70 blur-sm pointer-events-none" />

      <div class="relative translate-y-1/2 flex items-center justify-center">
        {/* Rewind Button */}
        <button
          class="absolute right-7 w-6 h-6 rounded-full bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 z-30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          onClick={(e) => {
            e.stopPropagation();
            seek(0);
            props.onRewind();
          }}
          disabled={playback.currentNoteIndex <= 0}
          title="Rewind to Start"
        >
          <div class="pointer-events-none">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </div>
        </button>

        {/* Play/Pause Button */}
        <button
          class="relative w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 z-30 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            // Play button should use normal playback mode
            if (settings.playbackMode !== 'normal') {
              setSettings('playbackMode', 'normal');
            }
            // If playback has no melody yet (first play), pass current notes once.
            if (playback.melody.length === 0) {
              toggle(props.melodyNotes);
            } else {
              toggle();
            }
          }}
          title={playback.isPlaying ? 'Pause' : 'Play'}
        >
          <div class="pointer-events-none">
            {playback.isPlaying ? (
              // Pause Icon
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              // Play Icon
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
        </button>
      </div>
    </div>
  );
};
