import Drawer from '@corvu/drawer';
import {
  For,
  Show,
  createEffect,
  createSignal,
  type Component,
} from 'solid-js';

import { setSettings, settings, type Waveform, type InstrumentPreset } from '@lib/store';
import { BUILTIN_PRESETS } from '@lib/audio/presets';

interface AudioSettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AudioSettingsDrawer: Component<AudioSettingsDrawerProps> = (props) => {
  const [isPresetModified, setIsPresetModified] = createSignal(false);
  const [originalPreset, setOriginalPreset] = createSignal<InstrumentPreset | null>(null);
  const [lastPresetId, setLastPresetId] = createSignal<string>('');

  const allPresets = () => ({ ...BUILTIN_PRESETS, ...settings.customPresets });
  const currentPreset = (): InstrumentPreset => {
    const presets = allPresets();
    return presets[settings.currentPresetId] || BUILTIN_PRESETS['simple'];
  };

  // Track if preset is modified
  createEffect(() => {
    const preset = currentPreset();
    const presetId = preset.id;
    
    // Reset original when preset ID changes
    if (presetId !== lastPresetId()) {
      setLastPresetId(presetId);
      setOriginalPreset(JSON.parse(JSON.stringify(preset))); // Deep clone
      setIsPresetModified(false);
    } else {
      // Check if preset has been modified from original
      const orig = originalPreset();
      if (orig) {
        const modified = JSON.stringify(preset) !== JSON.stringify(orig);
        setIsPresetModified(modified);
      }
    }
  });

  const updatePreset = (updates: Partial<InstrumentPreset>) => {
    const preset = currentPreset();
    const updated = { ...preset, ...updates };
    
    // If it's a built-in preset, create a custom copy
    if (BUILTIN_PRESETS[preset.id]) {
      const customId = `${preset.id}-custom-${Date.now()}`;
      const customPreset = { ...updated, id: customId, name: `${preset.name} (Custom)` };
      setSettings('customPresets', {
        ...settings.customPresets,
        [customId]: customPreset,
      });
      setSettings('currentPresetId', customId);
    } else {
      // Update existing custom preset
      setSettings('customPresets', {
        ...settings.customPresets,
        [preset.id]: updated,
      });
    }
  };

  const resetPreset = () => {
    const preset = currentPreset();
    if (BUILTIN_PRESETS[preset.id]) {
      // It's a built-in preset, but might have been modified
      // Delete any custom copy and switch back to built-in
      const customPresets = { ...settings.customPresets };
      // Find and remove any custom copies of this preset
      Object.keys(customPresets).forEach((id) => {
        if (id.startsWith(`${preset.id}-custom-`)) {
          delete customPresets[id];
        }
      });
      setSettings('customPresets', customPresets);
      // Ensure we're using the built-in version
      if (settings.currentPresetId !== preset.id) {
        setSettings('currentPresetId', preset.id);
      }
    } else {
      // It's a custom preset, find the original built-in preset it was based on
      const baseId = preset.id.split('-custom-')[0];
      if (BUILTIN_PRESETS[baseId]) {
        setSettings('currentPresetId', baseId);
        // This will trigger the effect to reset originalPreset
      }
    }
  };

  const saveAsNewPreset = () => {
    const preset = currentPreset();
    const name = prompt('Enter preset name:', preset.name);
    if (!name) return;

    const newId = `custom-${Date.now()}`;
    const newPreset: InstrumentPreset = {
      ...preset,
      id: newId,
      name: name.trim(),
    };

    setSettings('customPresets', {
      ...settings.customPresets,
      [newId]: newPreset,
    });
    setSettings('currentPresetId', newId);
    setOriginalPreset(JSON.parse(JSON.stringify(newPreset)));
    setIsPresetModified(false);
  };

  const updateOscillator = (index: number, field: 'type' | 'detune' | 'volume', value: any) => {
    const preset = currentPreset();
    const oscillators = [...preset.oscillators];
    oscillators[index] = { ...oscillators[index], [field]: value };
    updatePreset({ oscillators });
  };

  const updateFilter = (field: string, value: any) => {
    const preset = currentPreset();
    if (field === 'enabled') {
      updatePreset({ filter: { ...preset.filter, enabled: value } });
    } else if (field.startsWith('envelope.')) {
      const envField = field.split('.')[1] as keyof InstrumentPreset['filter']['envelope'];
      updatePreset({
        filter: {
          ...preset.filter,
          envelope: { ...preset.filter.envelope, [envField]: value },
        },
      });
    } else {
      updatePreset({ filter: { ...preset.filter, [field]: value } });
    }
  };

  const updateAmpEnvelope = (field: keyof InstrumentPreset['ampEnvelope'], value: number) => {
    const preset = currentPreset();
    updatePreset({
      ampEnvelope: { ...preset.ampEnvelope, [field]: value },
    });
  };

  const updateSaturation = (field: 'enabled' | 'amount', value: any) => {
    const preset = currentPreset();
    updatePreset({
      saturation: { ...preset.saturation, [field]: value },
    });
  };

  const deleteCustomPreset = (presetId: string) => {
    if (BUILTIN_PRESETS[presetId]) return; // Can't delete built-in presets
    
    const customPresets = { ...settings.customPresets };
    delete customPresets[presetId];
    setSettings('customPresets', customPresets);
    
    // If we deleted the current preset, switch to simple
    if (settings.currentPresetId === presetId) {
      setSettings('currentPresetId', 'simple');
    }
  };

  return (
    <Drawer breakPoints={[0.75]} open={props.open} onOpenChange={props.onOpenChange}>
      {(drawerProps) => (
        <>
          <Drawer.Portal>
            <Drawer.Overlay
              class="fixed inset-0 z-50 bg-black/50 transition-opacity duration-500"
              style={{
                'background-color': `rgb(0 0 0 / ${0.5 * drawerProps.openPercentage})`,
              }}
            />
            <Drawer.Content class="fixed inset-x-0 bottom-0 z-50 flex h-full max-h-[600px] flex-col rounded-t-2xl border-t-4 border-corvu-400 bg-corvu-100 pt-3 transition-transform duration-500 after:absolute after:inset-x-0 after:top-full after:h-1/2 after:bg-inherit md:select-none">
              <div class="h-1 w-12 self-center rounded-full bg-corvu-400/50 mb-6" />

              <div class="px-6 space-y-8 overflow-y-auto pb-8">
                <Drawer.Label class="text-2xl font-bold text-center text-corvu-text">
                  Audio Settings
                </Drawer.Label>

                {/* Preset Selector */}
                <div class="space-y-2">
                  <label class="font-semibold text-corvu-text text-sm">Instrument Preset</label>
                  <div class="flex gap-2">
                    <select
                      value={settings.currentPresetId}
                      onChange={(e) => {
                        setSettings('currentPresetId', e.currentTarget.value);
                      }}
                      class="flex-1 rounded-lg border border-corvu-300 bg-white px-3 py-2 text-sm focus:border-corvu-400 focus:outline-none"
                    >
                      <optgroup label="Built-in">
                        <For each={Object.values(BUILTIN_PRESETS)}>
                          {(preset) => <option value={preset.id}>{preset.name}</option>}
                        </For>
                      </optgroup>
                      <Show when={Object.keys(settings.customPresets || {}).length > 0}>
                        <optgroup label="Custom">
                          <For each={Object.values(settings.customPresets || {})}>
                            {(preset) => (
                              <option value={preset.id}>
                                {preset.name}
                                <Show when={settings.currentPresetId === preset.id && isPresetModified()}>
                                  {' '}(Modified)
                                </Show>
                              </option>
                            )}
                          </For>
                        </optgroup>
                      </Show>
                    </select>
                    <Show when={!BUILTIN_PRESETS[settings.currentPresetId]}>
                      <button
                        onClick={() => deleteCustomPreset(settings.currentPresetId)}
                        class="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100"
                        title="Delete custom preset"
                      >
                        🗑️
                      </button>
                    </Show>
                  </div>
                  <Show when={isPresetModified()}>
                    <div class="flex gap-2">
                      <button
                        onClick={resetPreset}
                        class="flex-1 rounded-lg border border-corvu-300 bg-white px-3 py-1.5 text-sm hover:bg-corvu-50"
                      >
                        Reset
                      </button>
                      <button
                        onClick={saveAsNewPreset}
                        class="flex-1 rounded-lg bg-corvu-400 px-3 py-1.5 text-sm text-white hover:bg-corvu-300"
                      >
                        Save as New
                      </button>
                    </div>
                  </Show>
                </div>

                {/* Tempo Control */}
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <h3 class="font-semibold text-corvu-text text-sm">Tempo (BPM)</h3>
                    <span class="text-sm text-gray-500">{settings.tempo}</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="300"
                    step="1"
                    value={settings.tempo}
                    onInput={(e) => setSettings('tempo', parseInt(e.currentTarget.value))}
                    class="w-full h-2 bg-corvu-200 rounded-lg appearance-none cursor-pointer accent-corvu-400"
                  />
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

                {/* Waveform Selector (for backward compatibility) */}
                <div class="space-y-2">
                  <label class="font-semibold text-corvu-text text-sm">Waveform</label>
                  <select
                    value={settings.waveform}
                    onChange={(e) => {
                      setSettings('waveform', e.currentTarget.value as Waveform);
                      // Also update first oscillator of current preset
                      if (currentPreset().oscillators.length > 0) {
                        updateOscillator(0, 'type', e.currentTarget.value);
                      }
                    }}
                    class="w-full rounded-lg border border-corvu-300 bg-white px-3 py-2 text-sm focus:border-corvu-400 focus:outline-none"
                  >
                    <option value="sine">Sine</option>
                    <option value="square">Square</option>
                    <option value="sawtooth">Sawtooth</option>
                    <option value="triangle">Triangle</option>
                  </select>
                </div>

                {/* Expandable Preset Parameters */}
                <details class="rounded-lg border border-corvu-200 bg-white">
                  <summary class="cursor-pointer px-4 py-2 font-semibold text-corvu-text hover:bg-corvu-50">
                    Advanced Parameters
                  </summary>
                  <div class="px-4 py-3 space-y-4">
                    {/* Oscillator Section */}
                    <div>
                      <h4 class="font-semibold text-sm mb-2">Oscillators</h4>
                      <For each={currentPreset().oscillators}>
                        {(osc, index) => (
                          <div class="space-y-2 mb-3 p-2 border border-corvu-200 rounded">
                            <select
                              value={osc.type}
                              onChange={(e) => updateOscillator(index(), 'type', e.currentTarget.value)}
                              class="w-full rounded border border-corvu-300 px-2 py-1 text-sm"
                            >
                              <option value="sine">Sine</option>
                              <option value="square">Square</option>
                              <option value="sawtooth">Sawtooth</option>
                              <option value="triangle">Triangle</option>
                            </select>
                            <Show when={currentPreset().oscillators.length > 1}>
                              <div class="space-y-1">
                                <div class="flex justify-between text-xs text-gray-600">
                                  <span>Detune (cents)</span>
                                  <span>{osc.detune || 0}</span>
                                </div>
                                <input
                                  type="range"
                                  min="-50"
                                  max="50"
                                  step="1"
                                  value={osc.detune || 0}
                                  onInput={(e) => updateOscillator(index(), 'detune', parseFloat(e.currentTarget.value))}
                                  class="w-full"
                                />
                              </div>
                              <div class="space-y-1">
                                <div class="flex justify-between text-xs text-gray-600">
                                  <span>Volume</span>
                                  <span>{Math.round((osc.volume || 1) * 100)}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.01"
                                  value={osc.volume || 1}
                                  onInput={(e) => updateOscillator(index(), 'volume', parseFloat(e.currentTarget.value))}
                                  class="w-full"
                                />
                              </div>
                            </Show>
                          </div>
                        )}
                      </For>
                    </div>

                    {/* Filter Section */}
                    <div>
                      <label class="flex items-center justify-between cursor-pointer mb-2">
                        <span class="font-semibold text-sm">Filter</span>
                        <input
                          type="checkbox"
                          checked={currentPreset().filter.enabled}
                          onChange={(e) => updateFilter('enabled', e.currentTarget.checked)}
                          class="w-5 h-5 rounded border-corvu-300 text-corvu-400 focus:ring-corvu-400"
                        />
                      </label>
                      <Show when={currentPreset().filter.enabled}>
                        <div class="space-y-2 pl-4">
                          <div>
                            <select
                              value={currentPreset().filter.type}
                              onChange={(e) => updateFilter('type', e.currentTarget.value)}
                              class="w-full rounded border border-corvu-300 px-2 py-1 text-sm mb-2"
                            >
                              <option value="lowpass">Lowpass</option>
                              <option value="highpass">Highpass</option>
                              <option value="bandpass">Bandpass</option>
                              <option value="notch">Notch</option>
                              <option value="allpass">Allpass</option>
                            </select>
                          </div>
                          <div>
                            <div class="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Cutoff Frequency (Hz)</span>
                              <span>{Math.round(currentPreset().filter.frequency)}</span>
                            </div>
                            <input
                              type="range"
                              min="20"
                              max="20000"
                              step="10"
                              value={currentPreset().filter.frequency}
                              onInput={(e) => updateFilter('frequency', parseFloat(e.currentTarget.value))}
                              class="w-full"
                            />
                          </div>
                          <div>
                            <div class="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Resonance (Q)</span>
                              <span>{currentPreset().filter.Q.toFixed(1)}</span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="30"
                              step="0.1"
                              value={currentPreset().filter.Q}
                              onInput={(e) => updateFilter('Q', parseFloat(e.currentTarget.value))}
                              class="w-full"
                            />
                          </div>
                          <div class="pt-2 border-t border-corvu-200">
                            <h5 class="font-semibold text-xs mb-2">Filter Envelope</h5>
                            <div class="grid grid-cols-2 gap-2">
                              {(['attack', 'decay', 'sustain', 'release'] as const).map((param) => (
                                <div>
                                  <div class="flex justify-between text-xs text-gray-600 mb-1">
                                    <span class="capitalize">{param}</span>
                                    <span>
                                      {param === 'sustain'
                                        ? Math.round((currentPreset().filter.envelope[param] as number) * 100) + '%'
                                        : currentPreset().filter.envelope[param].toFixed(2) + 's'}
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max={param === 'sustain' ? '1' : '2'}
                                    step={param === 'sustain' ? '0.01' : '0.01'}
                                    value={currentPreset().filter.envelope[param]}
                                    onInput={(e) => updateFilter(`envelope.${param}`, parseFloat(e.currentTarget.value))}
                                    class="w-full"
                                  />
                                </div>
                              ))}
                            </div>
                            <div class="grid grid-cols-2 gap-2 mt-2">
                              <div>
                                <div class="flex justify-between text-xs text-gray-600 mb-1">
                                  <span>Attack Level (Hz)</span>
                                  <span>{Math.round(currentPreset().filter.envelope.attackLevel)}</span>
                                </div>
                                <input
                                  type="range"
                                  min="20"
                                  max="20000"
                                  step="10"
                                  value={currentPreset().filter.envelope.attackLevel}
                                  onInput={(e) => updateFilter('envelope.attackLevel', parseFloat(e.currentTarget.value))}
                                  class="w-full"
                                />
                              </div>
                              <div>
                                <div class="flex justify-between text-xs text-gray-600 mb-1">
                                  <span>Sustain Level (Hz)</span>
                                  <span>{Math.round(currentPreset().filter.envelope.sustainLevel)}</span>
                                </div>
                                <input
                                  type="range"
                                  min="20"
                                  max="20000"
                                  step="10"
                                  value={currentPreset().filter.envelope.sustainLevel}
                                  onInput={(e) => updateFilter('envelope.sustainLevel', parseFloat(e.currentTarget.value))}
                                  class="w-full"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Show>
                    </div>

                    {/* Amp Envelope Section */}
                    <div>
                      <h4 class="font-semibold text-sm mb-2">Amplifier Envelope</h4>
                      <div class="grid grid-cols-2 gap-2">
                        {(['attack', 'decay', 'sustain', 'release'] as const).map((param) => (
                          <div>
                            <div class="flex justify-between text-xs text-gray-600 mb-1">
                              <span class="capitalize">{param}</span>
                              <span>
                                {param === 'sustain'
                                  ? Math.round((currentPreset().ampEnvelope[param] as number) * 100) + '%'
                                  : currentPreset().ampEnvelope[param].toFixed(2) + 's'}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max={param === 'sustain' ? '1' : '2'}
                              step={param === 'sustain' ? '0.01' : '0.01'}
                              value={currentPreset().ampEnvelope[param]}
                              onInput={(e) => updateAmpEnvelope(param, parseFloat(e.currentTarget.value))}
                              class="w-full"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Saturation Section */}
                    <div>
                      <label class="flex items-center justify-between cursor-pointer mb-2">
                        <span class="font-semibold text-sm">Saturation</span>
                        <input
                          type="checkbox"
                          checked={currentPreset().saturation.enabled}
                          onChange={(e) => updateSaturation('enabled', e.currentTarget.checked)}
                          class="w-5 h-5 rounded border-corvu-300 text-corvu-400 focus:ring-corvu-400"
                        />
                      </label>
                      <Show when={currentPreset().saturation.enabled}>
                        <div class="pl-4">
                          <div class="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Amount</span>
                            <span>{Math.round(currentPreset().saturation.amount)}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={currentPreset().saturation.amount}
                            onInput={(e) => updateSaturation('amount', parseFloat(e.currentTarget.value))}
                            class="w-full"
                          />
                        </div>
                      </Show>
                    </div>
                  </div>
                </details>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </>
      )}
    </Drawer>
  );
};

export default AudioSettingsDrawer;
