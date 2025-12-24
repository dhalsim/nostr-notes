import Drawer from '@corvu/drawer';
import {
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  type Component,
} from 'solid-js';

import { setSettings, settings, type Waveform } from '../store';

// Chrome/Edge on desktop + Android fire `beforeinstallprompt`.
// Safari/iOS does not, so we show an "Add to Home Screen" hint there.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const SettingsDrawer: Component = () => {
  const [deferredPrompt, setDeferredPrompt] = createSignal<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = createSignal(false);
  const [showIosA2hsHint, setShowIosA2hsHint] = createSignal(false);
  const [desktopCapable, setDesktopCapable] = createSignal(false);

  const handleInstallClick = async () => {
    const evt = deferredPrompt();
    
    if (!evt) {
      return;
    }
    
    await evt.prompt();
    
    // Regardless of outcome, browsers only allow prompting once per event.
    // We'll clear it and let the browser re-emit later if still eligible.
    try {
      await evt.userChoice;
    } finally {
      setDeferredPrompt(null);
    }
  };

  onMount(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const installed =
      window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
      nav.standalone === true;
    
    setIsInstalled(installed);

    const ua = navigator.userAgent || '';
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    
    setShowIosA2hsHint(isIOS && !installed);

    const onBeforeInstallPrompt = (e: Event) => {
      // Required: prevents mini-infobar and lets us prompt on a user gesture.
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    
    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowIosA2hsHint(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    
    onCleanup(() => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    });
  });

  // Desktop = fine pointer (mouse/trackpad). This avoids "sm/lg" width false-positives on phones in landscape.
  onMount(() => {
    const mql = window.matchMedia?.('(pointer: fine)');
    
    if (!mql) {
      return;
    }
    
    const update = () => setDesktopCapable(mql.matches);
    
    update();
    
    if (mql.addEventListener) {
      mql.addEventListener('change', update);
    } else {
      mql.addListener(update);
    }
    
    onCleanup(() => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', update);
      } else {
        mql.removeListener(update);
      }
    });
  });

  // Keep UI consistent: shortcuts are desktop-only, so turn off the toggle on non-desktop devices.
  createEffect(() => {
    if (!desktopCapable() && settings.showShortcuts) {
      setSettings('showShortcuts', false);
    }
  });

  return (
    <Drawer breakPoints={[0.75]}>
      {(props) => (
        <>
          <Drawer.Trigger
            aria-label="Settings"
            title="Settings"
            class="fixed bottom-4 right-4 z-50 grid h-10 w-10 place-items-center rounded-full bg-gray-900/90 text-white transition-all hover:bg-gray-800 active:translate-y-0.5 shadow-lg ring-1 ring-white/10"
          >
            <span class="sr-only">Settings</span>
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
          </Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Overlay
              class="fixed inset-0 z-50 bg-black/50 transition-opacity duration-500"
              style={{
                'background-color': `rgb(0 0 0 / ${0.5 * props.openPercentage})`,
              }}
            />
            <Drawer.Content class="fixed inset-x-0 bottom-0 z-50 flex h-full max-h-[500px] flex-col rounded-t-2xl border-t-4 border-corvu-400 bg-corvu-100 pt-3 transition-transform duration-500 after:absolute after:inset-x-0 after:top-full after:h-1/2 after:bg-inherit md:select-none">
              <div class="h-1 w-12 self-center rounded-full bg-corvu-400/50 mb-6" />

              <div class="px-6 space-y-8 overflow-y-auto pb-8">
                <Drawer.Label class="text-2xl font-bold text-center text-corvu-text">
                  Synthesizer Settings
                </Drawer.Label>

                {/* Audio Settings Section */}
                <div class="space-y-4">
                  <h3 class="text-lg font-bold text-corvu-text border-b border-corvu-300 pb-1">
                    Audio
                  </h3>

                  {/* Waveform Selector */}
                  <div class="space-y-2">
                    <h3 class="font-semibold text-corvu-text text-sm">Waveform</h3>
                    <div class="grid grid-cols-4 gap-2">
                      <For each={['triangle', 'sine', 'square', 'sawtooth'] as Waveform[]}>
                        {(type) => (
                          <button
                            onClick={() => setSettings('waveform', type)}
                            class={`p-2 rounded-md text-sm font-medium transition-colors border-2 ${
                              settings.waveform === type
                                ? 'bg-corvu-400 text-white border-corvu-400'
                                : 'bg-white text-corvu-text border-transparent hover:border-corvu-300'
                            }`}
                          >
                            {type}
                          </button>
                        )}
                      </For>
                    </div>
                  </div>

                  {/* Volume Slider */}
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <h3 class="font-semibold text-corvu-text text-sm">Master Volume</h3>
                      <span class="text-sm text-gray-500">
                        {Math.round(settings.volume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings.volume}
                      onInput={(e) => setSettings('volume', parseFloat(e.currentTarget.value))}
                      class="w-full h-2 bg-corvu-200 rounded-lg appearance-none cursor-pointer accent-corvu-400"
                    />
                  </div>
                </div>

                {/* Display Settings Section */}
                <div class="space-y-4">
                  <h3 class="text-lg font-bold text-corvu-text border-b border-corvu-300 pb-1">
                    Display
                  </h3>

                  {/* Keyboard Size Control */}
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <h3 class="font-semibold text-corvu-text text-sm">Keyboard Size</h3>
                    </div>
                    <div class="flex gap-2 p-1 bg-gray-200 rounded-lg">
                      <button
                        class={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                          settings.octaveCount === 1
                            ? 'bg-white text-corvu-text shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        onClick={() => setSettings('octaveCount', 1)}
                      >
                        1 Octave
                      </button>
                      <button
                        class={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                          settings.octaveCount === 2
                            ? 'bg-white text-corvu-text shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        onClick={() => setSettings('octaveCount', 2)}
                      >
                        2 Octaves
                      </button>
                    </div>
                    <p class="text-xs text-gray-500">
                      Automatically adjusts on resize, or select manually.
                    </p>
                  </div>

                  <div class="space-y-3 pt-2">
                    <label class="flex items-center justify-between cursor-pointer">
                      <span class="font-semibold text-corvu-text text-sm">Show Note Names</span>
                      <input
                        type="checkbox"
                        checked={settings.showNotes}
                        onChange={(e) => setSettings('showNotes', e.currentTarget.checked)}
                        class="w-5 h-5 rounded border-corvu-300 text-corvu-400 focus:ring-corvu-400"
                      />
                    </label>

                    <label
                      class={`flex items-center justify-between ${desktopCapable() ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                    >
                      <span class="font-semibold text-corvu-text text-sm">
                        Show Keyboard Shortcuts
                        <Show when={!desktopCapable()}>
                          <span class="ml-2 text-xs font-normal text-gray-500">(desktop only)</span>
                        </Show>
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.showShortcuts}
                        onChange={(e) => setSettings('showShortcuts', e.currentTarget.checked)}
                        disabled={!desktopCapable()}
                        class="w-5 h-5 rounded border-corvu-300 text-corvu-400 focus:ring-corvu-400"
                      />
                    </label>
                  </div>
                </div>

                {/* App / Install Section */}
                <div class="space-y-4">
                  <h3 class="text-lg font-bold text-corvu-text border-b border-corvu-300 pb-1">
                    App
                  </h3>

                  <Show when={isInstalled()}>
                    <div class="rounded-lg border border-corvu-200 bg-white px-3 py-2 text-sm text-corvu-text">
                      Installed ✓
                    </div>
                  </Show>

                  <Show when={!isInstalled() && deferredPrompt()}>
                    <button
                      onClick={handleInstallClick}
                      class="w-full rounded-lg bg-corvu-400 px-4 py-2 text-white font-medium transition-all hover:bg-corvu-300 active:translate-y-0.5 shadow"
                    >
                      Install app
                    </button>
                    <p class="text-xs text-gray-500">Your browser will ask for confirmation.</p>
                  </Show>

                  <Show when={!isInstalled() && showIosA2hsHint()}>
                    <div class="rounded-lg border border-corvu-200 bg-white px-3 py-2 text-sm text-corvu-text space-y-1">
                      <div class="font-semibold">Install on iPhone/iPad</div>
                      <div class="text-xs text-gray-600">
                        Open in Safari → Share → “Add to Home Screen”.
                      </div>
                    </div>
                  </Show>
                </div>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </>
      )}
    </Drawer>
  );
};

export default SettingsDrawer;
