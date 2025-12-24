import Drawer from '@corvu/drawer';
import { settings, setSettings, Waveform } from '../store';
import type { Component } from 'solid-js';

const SettingsDrawer: Component = () => {
  return (
    <Drawer breakPoints={[0.75]}>
      {(props) => (
        <>
          <Drawer.Trigger class="fixed top-4 right-4 z-50 rounded-lg bg-corvu-400 px-4 py-2 text-white font-medium transition-all hover:bg-corvu-300 active:translate-y-0.5 shadow-lg">
            Settings
          </Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Overlay
              class="fixed inset-0 z-50 bg-black/50 transition-opacity duration-500"
              style={{
                'background-color': `rgb(0 0 0 / ${
                  0.5 * props.openPercentage
                })`,
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
                  <h3 class="text-lg font-bold text-corvu-text border-b border-corvu-300 pb-1">Audio</h3>
                  
                  {/* Waveform Selector */}
                  <div class="space-y-2">
                    <h3 class="font-semibold text-corvu-text text-sm">Waveform</h3>
                    <div class="grid grid-cols-4 gap-2">
                      {(['triangle', 'sine', 'square', 'sawtooth'] as Waveform[]).map((type) => (
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
                      ))}
                    </div>
                  </div>

                  {/* Volume Slider */}
                  <div class="space-y-2">
                     <div class="flex justify-between">
                       <h3 class="font-semibold text-corvu-text text-sm">Master Volume</h3>
                       <span class="text-sm text-gray-500">{Math.round(settings.volume * 100)}%</span>
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
                  <h3 class="text-lg font-bold text-corvu-text border-b border-corvu-300 pb-1">Display</h3>
                  
                  <div class="space-y-3">
                    <label class="flex items-center justify-between cursor-pointer">
                      <span class="font-semibold text-corvu-text text-sm">Show Note Names</span>
                      <input 
                        type="checkbox"
                        checked={settings.showNotes}
                        onChange={(e) => setSettings('showNotes', e.currentTarget.checked)}
                        class="w-5 h-5 rounded border-corvu-300 text-corvu-400 focus:ring-corvu-400"
                      />
                    </label>

                    <label class="flex items-center justify-between cursor-pointer">
                      <span class="font-semibold text-corvu-text text-sm">Show Keyboard Shortcuts</span>
                      <input 
                        type="checkbox"
                        checked={settings.showShortcuts}
                        onChange={(e) => setSettings('showShortcuts', e.currentTarget.checked)}
                        class="w-5 h-5 rounded border-corvu-300 text-corvu-400 focus:ring-corvu-400"
                      />
                    </label>
                  </div>
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
