import { Show, createSignal, type Component } from 'solid-js';

import { setSettings, settings, type InstrumentPreset } from '@lib/store';
import { BUILTIN_PRESETS } from '@lib/audio/presets';

import PlaybackModeDrawer from './PlaybackModeDrawer';
import SettingsDrawer from './SettingsDrawer';
import AudioSettingsDrawer from './AudioSettingsDrawer';

const MenuBar: Component = () => {
  const [isExpanded, setIsExpanded] = createSignal(false);
  const [activeDrawer, setActiveDrawer] = createSignal<'settings' | 'playback' | 'audio' | null>(null);

  const handleIconClick = (drawer: 'settings' | 'playback' | 'audio') => {
    // Toggle: if clicking the same drawer, close it; otherwise open the new one
    if (activeDrawer() === drawer) {
      setActiveDrawer(null);
      setIsExpanded(false);
    } else {
      setActiveDrawer(drawer);
      setIsExpanded(true); // Keep icons visible when drawer is open
    }
  };

  const handleClose = () => {
    setActiveDrawer(null);
    setIsExpanded(false); // Show burger menu when all drawers are closed
  };

  const handleOctaveToggle = () => {
    const newCount = settings.octaveCount === 1 ? 2 : 1;
    setSettings('octaveCount', newCount);
  };

  const handleChartTypeToggle = () => {
    const newType = settings.chartType === 'bar' ? 'sheet' : 'bar';
    setSettings('chartType', newType);
  };

  const handleWaveformToggle = () => {
    const waveforms: Array<'triangle' | 'sine' | 'square' | 'sawtooth'> = [
      'triangle',
      'sine',
      'square',
      'sawtooth',
    ];
    const currentIndex = waveforms.indexOf(settings.waveform);
    const nextIndex = (currentIndex + 1) % waveforms.length;
    const nextWaveform = waveforms[nextIndex];
    setSettings('waveform', nextWaveform);
    
    // Also update the first oscillator of the current preset
    const allPresets = { ...BUILTIN_PRESETS, ...settings.customPresets };
    const preset = allPresets[settings.currentPresetId] || BUILTIN_PRESETS['simple'];
    if (preset.oscillators.length > 0) {
      const updatedOscillators = [...preset.oscillators];
      updatedOscillators[0] = { ...updatedOscillators[0], type: nextWaveform };
      
      // If it's a built-in preset, create a custom copy
      if (BUILTIN_PRESETS[preset.id]) {
        const customId = `${preset.id}-custom-${Date.now()}`;
        const customPreset: InstrumentPreset = {
          ...preset,
          id: customId,
          name: `${preset.name} (Custom)`,
          oscillators: updatedOscillators,
        };
        setSettings('customPresets', {
          ...settings.customPresets,
          [customId]: customPreset,
        });
        setSettings('currentPresetId', customId);
      } else {
        // Update existing custom preset
        setSettings('customPresets', {
          ...settings.customPresets,
          [preset.id]: { ...preset, oscillators: updatedOscillators },
        });
      }
    }
  };

  return (
    <>
      <div class="fixed top-4 right-4 z-50 flex items-center gap-2">
        <Show when={!isExpanded()}>
          {/* Burger Menu Icon */}
          <button
            onClick={() => setIsExpanded(true)}
            aria-label="Open menu"
            title="Menu"
            class="grid h-10 w-10 place-items-center rounded-full bg-gray-900/90 text-white transition-all hover:bg-gray-800 active:translate-y-0.5 shadow-lg ring-1 ring-white/10"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </Show>

        <Show when={isExpanded()}>
          {/* Settings Icon */}
          <button
            onClick={() => handleIconClick('settings')}
            aria-label="Settings"
            title="Settings"
            class="grid h-10 w-10 place-items-center rounded-full bg-gray-900/90 text-white transition-all hover:bg-gray-800 active:translate-y-0.5 shadow-lg ring-1 ring-white/10"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>

          {/* Audio Settings Icon (Speaker) */}
          <button
            onClick={() => handleIconClick('audio')}
            aria-label="Audio Settings"
            title="Audio Settings"
            class="grid h-10 w-10 place-items-center rounded-full bg-gray-900/90 text-white transition-all hover:bg-gray-800 active:translate-y-0.5 shadow-lg ring-1 ring-white/10"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          </button>

          {/* Playback Mode Icon (Knob) */}
          <button
            onClick={() => handleIconClick('playback')}
            aria-label="Playback Mode"
            title="Playback Mode"
            class="grid h-10 w-10 place-items-center rounded-full bg-gray-900/90 text-white transition-all hover:bg-gray-800 active:translate-y-0.5 shadow-lg ring-1 ring-white/10"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          </button>

          {/* Octave Count Toggle */}
          <button
            onClick={handleOctaveToggle}
            aria-label={`Octave Count: ${settings.octaveCount}`}
            title={`Octave Count: ${settings.octaveCount} (click to toggle)`}
            class="grid h-10 w-10 place-items-center rounded-full bg-gray-900/90 text-white transition-all hover:bg-gray-800 active:translate-y-0.5 shadow-lg ring-1 ring-white/10"
          >
            <span class="text-sm font-bold">{settings.octaveCount}</span>
          </button>

          {/* Chart Type Toggle */}
          <button
            onClick={handleChartTypeToggle}
            aria-label={`Chart Type: ${settings.chartType === 'bar' ? 'Bar Chart' : 'Sheet Music'}`}
            title={`Chart Type: ${settings.chartType === 'bar' ? 'Bar Chart' : 'Sheet Music'} (click to toggle)`}
            class="grid h-10 w-10 place-items-center rounded-full bg-gray-900/90 text-white transition-all hover:bg-gray-800 active:translate-y-0.5 shadow-lg ring-1 ring-white/10"
          >
            <Show
              when={settings.chartType === 'sheet'}
              fallback={
                // Bar Chart Icon (bars on top of sheet music lines, using BarChart proportions)
                <svg
                  class="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  {/* 5 staff lines (fully extended, more vertical spacing) */}
                  <line x1="1" y1="4" x2="23" y2="4" />
                  <line x1="1" y1="8" x2="23" y2="8" />
                  <line x1="1" y1="12" x2="23" y2="12" />
                  <line x1="1" y1="16" x2="23" y2="16" />
                  <line x1="1" y1="20" x2="23" y2="20" />
                  {/* 2 bars (positioned on different staff positions) */}
                  <rect x="2" y="10" width="8" height="3.5" rx="0.5" />
                  <rect x="13" y="6" width="8" height="3.5" rx="0.5" />
                </svg>
              }
            >
              {/* Sheet Music Icon (musical note) */}
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </Show>
          </button>

          {/* Waveform Toggle */}
          <button
            onClick={handleWaveformToggle}
            aria-label={`Waveform: ${settings.waveform}`}
            title={`Waveform: ${settings.waveform} (click to cycle)`}
            class="grid h-10 w-10 place-items-center rounded-full bg-gray-900/90 text-white transition-all hover:bg-gray-800 active:translate-y-0.5 shadow-lg ring-1 ring-white/10"
          >
            <Show when={settings.waveform === 'triangle'}>
              {/* Triangle Icon (triangle wave: up then down) */}
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                {/* Triangle wave (zig-zag) */}
                <path d="M3 16L7 8L11 16L15 8L19 16L21 12" />
              </svg>
            </Show>
            <Show when={settings.waveform === 'sine'}>
              {/* Sine Icon (smooth sine wave) */}
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" />
              </svg>
            </Show>
            <Show when={settings.waveform === 'square'}>
              {/* Square Icon (square wave: high-low-high-low) */}
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                {/* Square wave (step function) */}
                <path d="M3 16H7V8H13V16H19V8H21V16" />
              </svg>
            </Show>
            <Show when={settings.waveform === 'sawtooth'}>
              {/* Sawtooth Icon (ramp up, sharp drop) */}
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                {/* Sawtooth wave (ramp + vertical drop) */}
                <path d="M3 16L11 8V16L19 8V16" />
              </svg>
            </Show>
          </button>

          {/* Close Icon (X) */}
          <button
            onClick={handleClose}
            aria-label="Close menu"
            title="Close"
            class="grid h-10 w-10 place-items-center rounded-full bg-gray-900/90 text-white transition-all hover:bg-gray-800 active:translate-y-0.5 shadow-lg ring-1 ring-white/10"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </Show>
      </div>

      <SettingsDrawer
        open={activeDrawer() === 'settings'}
        onOpenChange={(open) => {
          if (!open) {
            handleClose();
          } else {
            setIsExpanded(true);
          }
        }}
      />
      <PlaybackModeDrawer
        open={activeDrawer() === 'playback'}
        onOpenChange={(open) => {
          if (!open) {
            handleClose();
          } else {
            setIsExpanded(true);
          }
        }}
      />
      <AudioSettingsDrawer
        open={activeDrawer() === 'audio'}
        onOpenChange={(open) => {
          if (!open) {
            handleClose();
          } else {
            setIsExpanded(true);
          }
        }}
      />
    </>
  );
};

export default MenuBar;
