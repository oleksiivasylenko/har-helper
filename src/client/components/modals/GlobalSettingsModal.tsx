import { Component, Show } from 'solid-js';
import { globalSettingsStore } from '../../stores';
import type { GlobalSettings } from '../../types';

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export var GlobalSettingsModal: Component<GlobalSettingsModalProps> = function(props) {
  var settings = function() { return globalSettingsStore.globalSettings(); };

  function updateSetting<K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K]) {
    globalSettingsStore.updateSetting(key, value);
  }

  return (
    <Show when={props.isOpen}>
      <div class="modal-overlay" onClick={function(e) { if (e.target === e.currentTarget) props.onClose(); }}>
        <div class="modal-panel">
          <div class="modal-header">
            <h4>Global Settings</h4>
            <button class="modal-close-btn" onClick={props.onClose}>×</button>
          </div>
          <div class="modal-body">
            <div class="settings-section">
              <h5>Display Options</h5>
              
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={settings().useNoiseInspect}
                  onChange={function(e) { updateSetting('useNoiseInspect', (e.target as HTMLInputElement).checked); }}
                />
                Use Noise Filtering in Request Inspector
              </label>
              
            </div>
            
            <div class="modal-actions">
              <button class="btn-secondary" onClick={props.onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
