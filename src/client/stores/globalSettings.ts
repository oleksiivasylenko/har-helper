import { createSignal, createRoot } from 'solid-js';
import type { GlobalSettings } from '../types';
import { settingsApi } from '../api/client';
import { DEFAULT_GLOBAL_SETTINGS } from '../utils/constants';

function createGlobalSettingsStore() {
  var [globalSettings, setGlobalSettings] = createSignal<GlobalSettings>({ ...DEFAULT_GLOBAL_SETTINGS });
  var [loading, setLoading] = createSignal(false);

  async function loadGlobalSettings() {
    setLoading(true);
    try {
      var result = await settingsApi.getGlobal();
      setGlobalSettings(result.settings);
    } catch (err) {
      setGlobalSettings({ ...DEFAULT_GLOBAL_SETTINGS });
    } finally {
      setLoading(false);
    }
  }

  async function updateSetting<K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K]) {
    var newSettings = { ...globalSettings(), [key]: value };
    setGlobalSettings(newSettings);
    
    try {
      await settingsApi.saveGlobal(newSettings);
    } catch (err) {
      console.error('Failed to save global settings:', err);
    }
  }

  function toggleExpressionCollapsed() {
    updateSetting('expressionCollapsed', !globalSettings().expressionCollapsed);
  }

  function toggleUseNoiseInspect() {
    updateSetting('useNoiseInspect', !globalSettings().useNoiseInspect);
  }

  return {
    globalSettings: globalSettings,
    loading: loading,
    loadGlobalSettings: loadGlobalSettings,
    updateSetting: updateSetting,
    toggleExpressionCollapsed: toggleExpressionCollapsed,
    toggleUseNoiseInspect: toggleUseNoiseInspect
  };
}

export var globalSettingsStore = createRoot(createGlobalSettingsStore);
