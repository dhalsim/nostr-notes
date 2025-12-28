import { Show, createSignal, type Component } from 'solid-js';

import { setSettings, settings } from '@lib/store';

import PlaybackModeDrawer from './PlaybackModeDrawer';
import SettingsDrawer from './SettingsDrawer';

const MenuBar: Component = () => {
  const [isExpanded, setIsExpanded] = createSignal(false);
  const [activeDrawer, setActiveDrawer] = createSignal<'settings' | 'playback' | null>(null);

  const handleIconClick = (drawer: 'settings' | 'playback') => {
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
    </>
  );
};

export default MenuBar;
