import { Show, createEffect, createSignal, onCleanup, onMount, type Component } from 'solid-js';

import { setSettings, settings } from '@lib/store';
import CustomDrawer from './CustomDrawer';

// Chrome/Edge on desktop + Android fire `beforeinstallprompt`.
// Safari/iOS does not, so we show an "Add to Home Screen" hint there.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsDrawer: Component<SettingsDrawerProps> = (props) => {
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

  // Keep UI consistent: desktop-only controls (shortcuts + octave buttons) should stay disabled on touch devices.
  createEffect(() => {
    if (!desktopCapable()) {
      if (settings.showShortcuts) {
        setSettings('showShortcuts', false);
      }
      if (settings.showOctaveControls) {
        setSettings('showOctaveControls', false);
      }
    }
  });

  return (
    <CustomDrawer open={props.open} onOpenChange={props.onOpenChange} label="Settings">
      {/* Charts & Colors Section */}
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-corvu-text border-b border-corvu-300 pb-1">
          Colors
        </h3>

        <div class="space-y-3 pt-2">
          <label class="flex items-center justify-between cursor-pointer">
            <span class="font-semibold text-corvu-text text-sm">Color Piano Keys</span>
            <input
              type="checkbox"
              checked={settings.showKeyColors}
              onChange={(e) => setSettings('showKeyColors', e.currentTarget.checked)}
              class="w-5 h-5 rounded border-corvu-300 text-corvu-400 focus:ring-corvu-400"
            />
          </label>
        </div>
      </div>

      {/* Display Settings Section */}
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-corvu-text border-b border-corvu-300 pb-1">
          Display
        </h3>

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
            class={`flex items-center justify-between ${
              desktopCapable() ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
            }`}
          >
            <span class="font-semibold text-corvu-text text-sm">
              Show Octave Controls
              <Show when={!desktopCapable()}>
                <span class="ml-2 text-xs font-normal text-gray-500">(desktop only)</span>
              </Show>
            </span>
            <input
              type="checkbox"
              checked={settings.showOctaveControls}
              onChange={(e) => setSettings('showOctaveControls', e.currentTarget.checked)}
              disabled={!desktopCapable()}
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
              Open in Safari → Share → "Add to Home Screen".
            </div>
          </div>
        </Show>
      </div>
    </CustomDrawer>
  );
};

export default SettingsDrawer;
