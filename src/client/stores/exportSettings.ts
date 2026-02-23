import { createSignal, createRoot } from 'solid-js';
import type { ExportSettings } from '../types';
import { exportSettingsApi } from '../api/client';
import { DEFAULT_EXPORT_SETTINGS } from '../utils/constants';
import { archivesStore } from './archives';

function createExportSettingsStore() {
  var [exportSettings, setExportSettings] = createSignal<ExportSettings>({ ...DEFAULT_EXPORT_SETTINGS });
  var [loading, setLoading] = createSignal(false);
  var [saveTimeout, setSaveTimeout] = createSignal<number | null>(null);

  async function loadExportSettings(archiveId: number) {
    setLoading(true);
    try {
      var result = await exportSettingsApi.get(archiveId);
      setExportSettings(result.exportSettings);
    } catch (err) {
      setExportSettings({ ...DEFAULT_EXPORT_SETTINGS });
    } finally {
      setLoading(false);
    }
  }

  function debouncedSave() {
    var archiveId = archivesStore.currentArchiveId();
    if (archiveId === null) return;
    
    var timeout = saveTimeout();
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    var newTimeout = window.setTimeout(function() {
      exportSettingsApi.save(archiveId!, exportSettings()).catch(function(err) {
        console.error('Failed to save export settings:', err);
      });
    }, 500);
    
    setSaveTimeout(newTimeout);
  }

  function updateSetting<K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) {
    setExportSettings(function(prev) { return { ...prev, [key]: value }; });
    debouncedSave();
  }

  function setIncludedRequestHeader(headerKey: string, included: boolean) {
    setExportSettings(function(prev) {
      var newHeaders = { ...prev.includedRequestHeaders, [headerKey]: included };
      return { ...prev, includedRequestHeaders: newHeaders };
    });
    debouncedSave();
  }

  function setIncludedResponseHeader(headerKey: string, included: boolean) {
    setExportSettings(function(prev) {
      var newHeaders = { ...prev.includedResponseHeaders, [headerKey]: included };
      return { ...prev, includedResponseHeaders: newHeaders };
    });
    debouncedSave();
  }

  function setAllRequestHeaders(included: boolean) {
    setExportSettings(function(prev) {
      var newHeaders: Record<string, boolean> = {};
      var keys = Object.keys(prev.includedRequestHeaders);
      for (var i = 0; i < keys.length; i++) {
        newHeaders[keys[i]] = included;
      }
      return { ...prev, includedRequestHeaders: newHeaders };
    });
    debouncedSave();
  }

  function setAllResponseHeaders(included: boolean) {
    setExportSettings(function(prev) {
      var newHeaders: Record<string, boolean> = {};
      var keys = Object.keys(prev.includedResponseHeaders);
      for (var i = 0; i < keys.length; i++) {
        newHeaders[keys[i]] = included;
      }
      return { ...prev, includedResponseHeaders: newHeaders };
    });
    debouncedSave();
  }

  function addUserNoiseHeader(headerKey: string) {
    setExportSettings(function(prev) {
      var newNoise = { ...prev.userNoiseHeaders, [headerKey]: true };
      var newDisabled = { ...prev.disabledNoiseHeaders };
      delete newDisabled[headerKey];
      return { ...prev, userNoiseHeaders: newNoise, disabledNoiseHeaders: newDisabled };
    });
    debouncedSave();
  }

  function removeUserNoiseHeader(headerKey: string) {
    setExportSettings(function(prev) {
      var newNoise = { ...prev.userNoiseHeaders };
      delete newNoise[headerKey];
      var newDisabled = { ...prev.disabledNoiseHeaders };
      delete newDisabled[headerKey];
      return { ...prev, userNoiseHeaders: newNoise, disabledNoiseHeaders: newDisabled };
    });
    debouncedSave();
  }

  function toggleNoiseHeader(headerKey: string, enabled: boolean) {
    setExportSettings(function(prev) {
      var newDisabled = { ...prev.disabledNoiseHeaders };
      if (enabled) {
        delete newDisabled[headerKey];
      } else {
        newDisabled[headerKey] = true;
      }
      return { ...prev, disabledNoiseHeaders: newDisabled };
    });
    debouncedSave();
  }

  function setEntrySelected(origIndex: number, selected: boolean) {
    setExportSettings(function(prev) {
      var newDeselected = { ...prev.deselectedEntries };
      if (selected) {
        delete newDeselected[origIndex];
      } else {
        newDeselected[origIndex] = true;
      }
      return { ...prev, deselectedEntries: newDeselected };
    });
    debouncedSave();
  }

  function isEntrySelected(origIndex: number): boolean {
    var settings = exportSettings();
    return !settings.deselectedEntries[origIndex];
  }

  function setResponseExcluded(origIndex: number, excluded: boolean) {
    setExportSettings(function(prev) {
      var newExcluded = { ...(prev.excludedResponses || {}) };
      if (excluded) {
        newExcluded[origIndex] = true;
      } else {
        delete newExcluded[origIndex];
      }
      return { ...prev, excludedResponses: newExcluded };
    });
    debouncedSave();
  }

  function isResponseExcluded(origIndex: number): boolean {
    var settings = exportSettings();
    return !!(settings.excludedResponses || {})[origIndex];
  }

  async function copyFromArchive(sourceArchiveId: number, copyNoiseHeaders: boolean = true) {
    var targetArchiveId = archivesStore.currentArchiveId();
    if (targetArchiveId === null) return;
    
    try {
      await exportSettingsApi.copy(sourceArchiveId, targetArchiveId, copyNoiseHeaders);
      await loadExportSettings(targetArchiveId);
    } catch (err) {
      console.error('Failed to copy export settings:', err);
      throw err;
    }
  }

  return {
    exportSettings: exportSettings,
    loading: loading,
    loadExportSettings: loadExportSettings,
    updateSetting: updateSetting,
    setIncludedRequestHeader: setIncludedRequestHeader,
    setIncludedResponseHeader: setIncludedResponseHeader,
    setAllRequestHeaders: setAllRequestHeaders,
    setAllResponseHeaders: setAllResponseHeaders,
    addUserNoiseHeader: addUserNoiseHeader,
    removeUserNoiseHeader: removeUserNoiseHeader,
    toggleNoiseHeader: toggleNoiseHeader,
    setEntrySelected: setEntrySelected,
    isEntrySelected: isEntrySelected,
    setResponseExcluded: setResponseExcluded,
    isResponseExcluded: isResponseExcluded,
    copyFromArchive: copyFromArchive
  };
}

export var exportSettingsStore = createRoot(createExportSettingsStore);
