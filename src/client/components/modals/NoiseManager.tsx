import { Component, For, Show, createSignal, createMemo, createEffect } from 'solid-js';
import { BUILTIN_NOISE_HEADERS } from '../../utils/constants';
import { exportSettingsApi } from '../../api/client';
import type { ExportSettings } from '../../types';

interface NoiseManagerProps {
  isOpen: boolean;
  onClose: () => void;
  archiveId?: number | null;
}

export var NoiseManager: Component<NoiseManagerProps> = function(props) {
  var [newHeader, setNewHeader] = createSignal('');
  var [searchFilter, setSearchFilter] = createSignal('');
  var [localUserNoiseHeaders, setLocalUserNoiseHeaders] = createSignal<Record<string, boolean>>({});
  var [localDisabledNoiseHeaders, setLocalDisabledNoiseHeaders] = createSignal<Record<string, boolean>>({});
  var [loading, setLoading] = createSignal(false);
  
  createEffect(async function() {
    if (props.isOpen) {
      setLoading(true);
      if (props.archiveId) {
        try {
          var result = await exportSettingsApi.get(props.archiveId);
          setLocalUserNoiseHeaders(result.exportSettings.userNoiseHeaders || {});
          setLocalDisabledNoiseHeaders(result.exportSettings.disabledNoiseHeaders || {});
        } catch (e) {
          setLocalUserNoiseHeaders({});
          setLocalDisabledNoiseHeaders({});
        }
      } else {
        var exportSettingsStore = (window as any).__exportSettingsStore;
        if (exportSettingsStore) {
          var settings = exportSettingsStore.exportSettings();
          setLocalUserNoiseHeaders(settings.userNoiseHeaders || {});
          setLocalDisabledNoiseHeaders(settings.disabledNoiseHeaders || {});
        }
      }
      setLoading(false);
    }
  });
  
  var userNoiseHeaders = function() {
    return localUserNoiseHeaders();
  };
  
  var disabledNoiseHeaders = function() {
    return localDisabledNoiseHeaders();
  };

  var filteredBuiltinHeaders = createMemo(function() {
    var filter = searchFilter().toLowerCase().trim();
    if (!filter) return BUILTIN_NOISE_HEADERS;
    return BUILTIN_NOISE_HEADERS.filter(function(h) { return h.toLowerCase().includes(filter); });
  });

  var filteredUserHeaders = createMemo(function() {
    var filter = searchFilter().toLowerCase().trim();
    var headers = Object.keys(userNoiseHeaders());
    if (!filter) return headers;
    return headers.filter(function(h) { return h.toLowerCase().includes(filter); });
  });

  var headerExistsInNoise = createMemo(function() {
    var input = newHeader().toLowerCase().trim();
    if (!input) return false;
    if (BUILTIN_NOISE_HEADERS.indexOf(input) !== -1) return true;
    if (userNoiseHeaders()[input]) return true;
    return false;
  });

  async function saveToDb(newUserHeaders: Record<string, boolean>, newDisabledHeaders: Record<string, boolean>) {
    if (props.archiveId) {
      try {
        var result = await exportSettingsApi.get(props.archiveId);
        var settings = result.exportSettings;
        settings.userNoiseHeaders = newUserHeaders;
        settings.disabledNoiseHeaders = newDisabledHeaders;
        await exportSettingsApi.save(props.archiveId, settings);
      } catch (e) {
        console.error('Failed to save noise headers:', e);
      }
    } else {
      var exportSettingsStore = (window as any).__exportSettingsStore;
      if (exportSettingsStore) {
        var currentSettings = exportSettingsStore.exportSettings();
        var userKeys = Object.keys(newUserHeaders);
        var currentUserKeys = Object.keys(currentSettings.userNoiseHeaders || {});
        
        for (var i = 0; i < userKeys.length; i++) {
          if (!currentSettings.userNoiseHeaders || !currentSettings.userNoiseHeaders[userKeys[i]]) {
            exportSettingsStore.addUserNoiseHeader(userKeys[i]);
          }
        }
        
        for (var j = 0; j < currentUserKeys.length; j++) {
          if (!newUserHeaders[currentUserKeys[j]]) {
            exportSettingsStore.removeUserNoiseHeader(currentUserKeys[j]);
          }
        }
        
        var disabledKeys = Object.keys(newDisabledHeaders);
        for (var k = 0; k < disabledKeys.length; k++) {
          exportSettingsStore.toggleNoiseHeader(disabledKeys[k], false);
        }
        
        var enabledKeys = Object.keys(currentSettings.disabledNoiseHeaders || {});
        for (var l = 0; l < enabledKeys.length; l++) {
          if (!newDisabledHeaders[enabledKeys[l]]) {
            exportSettingsStore.toggleNoiseHeader(enabledKeys[l], true);
          }
        }
      }
    }
  }

  function addUserHeader() {
    var header = newHeader().trim().toLowerCase();
    if (!header) return;
    
    var newUserHeaders = { ...localUserNoiseHeaders(), [header]: true };
    var newDisabledHeaders = { ...localDisabledNoiseHeaders() };
    delete newDisabledHeaders[header];
    
    setLocalUserNoiseHeaders(newUserHeaders);
    setLocalDisabledNoiseHeaders(newDisabledHeaders);
    saveToDb(newUserHeaders, newDisabledHeaders);
    setNewHeader('');
  }

  function removeUserHeader(header: string) {
    var newUserHeaders = { ...localUserNoiseHeaders() };
    delete newUserHeaders[header];
    var newDisabledHeaders = { ...localDisabledNoiseHeaders() };
    delete newDisabledHeaders[header];
    
    setLocalUserNoiseHeaders(newUserHeaders);
    setLocalDisabledNoiseHeaders(newDisabledHeaders);
    saveToDb(newUserHeaders, newDisabledHeaders);
  }

  function toggleBuiltinHeader(header: string) {
    var isEnabled = !disabledNoiseHeaders()[header];
    var newDisabledHeaders = { ...localDisabledNoiseHeaders() };
    
    if (isEnabled) {
      newDisabledHeaders[header] = true;
    } else {
      delete newDisabledHeaders[header];
    }
    
    setLocalDisabledNoiseHeaders(newDisabledHeaders);
    saveToDb(localUserNoiseHeaders(), newDisabledHeaders);
  }

  function isBuiltinEnabled(header: string): boolean {
    return !disabledNoiseHeaders()[header];
  }

  return (
    <Show when={props.isOpen}>
      <div class="modal-overlay" onClick={function(e) { if (e.target === e.currentTarget) props.onClose(); }}>
        <div class="modal-panel">
          <div class="modal-header">
            <h4>Noise Headers Manager</h4>
            <button class="modal-close-btn" onClick={props.onClose}>×</button>
          </div>
          <div class="modal-body">
            <p class="modal-description">
              Noise headers are hidden by default in the request details view. 
              You can toggle built-in headers or add custom ones.
            </p>
            
            <Show when={loading()}>
              <p>Loading...</p>
            </Show>
            
            <Show when={!loading()}>
              <div class="noise-search">
                <input 
                  type="text"
                  placeholder="Search headers..."
                  value={searchFilter()}
                  onInput={function(e) { setSearchFilter((e.target as HTMLInputElement).value); }}
                />
              </div>
              
              <div class="noise-section">
                <h5>Built-in Noise Headers ({filteredBuiltinHeaders().length}/{BUILTIN_NOISE_HEADERS.length})</h5>
                <div class="noise-list">
                  <For each={filteredBuiltinHeaders()}>
                    {function(header) {
                      return (
                        <label class="noise-item">
                          <input 
                            type="checkbox" 
                            checked={isBuiltinEnabled(header)}
                            onChange={function() { toggleBuiltinHeader(header); }}
                          />
                          <span>{header}</span>
                        </label>
                      );
                    }}
                  </For>
                </div>
              </div>
              
              <div class="noise-section">
                <h5>Custom Noise Headers ({filteredUserHeaders().length}/{Object.keys(userNoiseHeaders()).length})</h5>
                <div class="noise-add-form">
                  <input 
                    type="text"
                    placeholder="Header name (e.g., x-custom-header)"
                    value={newHeader()}
                    onInput={function(e) { setNewHeader((e.target as HTMLInputElement).value); }}
                    onKeyPress={function(e) { if (e.key === 'Enter') addUserHeader(); }}
                  />
                  <button class="btn-primary" onClick={addUserHeader} disabled={headerExistsInNoise()}>Add</button>
                </div>
                <Show when={headerExistsInNoise()}>
                  <p class="noise-exists-warning">⚠️ This header already exists in noise list</p>
                </Show>
                <div class="noise-list">
                  <For each={filteredUserHeaders()}>
                    {function(header) {
                      return (
                        <div class="noise-item noise-item-custom">
                          <span>{header}</span>
                          <button 
                            class="noise-remove-btn"
                            onClick={function() { removeUserHeader(header); }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    }}
                  </For>
                  <Show when={Object.keys(userNoiseHeaders()).length === 0}>
                    <p class="noise-empty">No custom headers added</p>
                  </Show>
                </div>
              </div>
            </Show>
            
            <div class="modal-actions">
              <button class="btn-secondary" onClick={props.onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
