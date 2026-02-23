import { Component, For, Show, createSignal, createResource } from 'solid-js';
import { filtersApi } from '../../api/client';
import { archivesStore, filtersStore, exportSettingsStore } from '../../stores';

interface CopySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export var CopySettingsModal: Component<CopySettingsModalProps> = function(props) {
  var [selectedSource, setSelectedSource] = createSignal<number | null>(null);
  var [copyMode, setCopyMode] = createSignal<'replace' | 'merge'>('replace');
  var [copyFilters, setCopyFilters] = createSignal(true);
  var [copyExportSettings, setCopyExportSettings] = createSignal(true);
  var [copyNoiseHeaders, setCopyNoiseHeaders] = createSignal(true);
  var [loading, setLoading] = createSignal(false);
  var [error, setError] = createSignal<string | null>(null);

  var currentArchiveId = function() { return archivesStore.currentArchiveId(); };

  var selectedSourceInfo = function() {
    var sourceId = selectedSource();
    if (sourceId === null) return null;
    var sourceList = sources() || [];
    return sourceList.find(function(s) { return s.archiveId === sourceId; }) || null;
  };

  var [sources] = createResource(
    function() { return props.isOpen ? currentArchiveId() : null; },
    async function(archiveId) {
      if (archiveId === null) return [];
      try {
        var result = await filtersApi.getSources(archiveId);
        return result.sources;
      } catch (err) {
        return [];
      }
    }
  );

  async function handleCopy() {
    var sourceId = selectedSource();
    var targetId = currentArchiveId();
    
    if (sourceId === null || targetId === null) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (copyFilters()) {
        await filtersStore.copyFromArchive(sourceId, copyMode(), copyNoiseHeaders());
      }
      if (copyExportSettings()) {
        await exportSettingsStore.copyFromArchive(sourceId, copyNoiseHeaders());
      }
      props.onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Show when={props.isOpen}>
      <div class="modal-overlay" onClick={function(e) { if (e.target === e.currentTarget) props.onClose(); }}>
        <div class="modal-panel">
          <div class="modal-header">
            <h4>Copy Settings from Another Archive</h4>
            <button class="modal-close-btn" onClick={props.onClose}>×</button>
          </div>
          <div class="modal-body">
            <Show when={sources.loading}>
              <p>Loading sources...</p>
            </Show>
            
            <Show when={!sources.loading && (sources() || []).length === 0}>
              <p style="color: #6c7086">No other archives found. Upload another HAR file first.</p>
            </Show>
            
            <Show when={!sources.loading && (sources() || []).length > 0}>
              <div class="form-group">
                <label>Source Archive:</label>
                <select 
                  value={selectedSource() || ''} 
                  onChange={function(e) { 
                    var val = (e.target as HTMLSelectElement).value;
                    setSelectedSource(val ? parseInt(val) : null); 
                  }}
                >
                  <option value="">Select an archive...</option>
                  <For each={sources() || []}>
                    {function(source) {
                      var badges = [];
                      if (source.isDeleted) badges.push('D');
                      if (source.hasFilters) badges.push('F');
                      if (source.hasExportSettings) badges.push('E');
                      var badgeText = badges.length > 0 ? ' [' + badges.join(', ') + ']' : ' (no settings)';
                      return (
                        <option value={source.archiveId}>
                          {source.archiveName}{badgeText}
                        </option>
                      );
                    }}
                  </For>
                </select>
              </div>
              
              <p class="settings-legend" style="font-size: 12px; color: #6c7086; margin-bottom: 12px;">
                [D] = Deleted Archive, [F] = has Filters, [E] = has Export Settings
              </p>
              
              <div class="form-group">
                <label>Copy Mode:</label>
                <select 
                  value={copyMode()} 
                  onChange={function(e) { setCopyMode((e.target as HTMLSelectElement).value as 'replace' | 'merge'); }}
                >
                  <option value="replace">Replace existing</option>
                  <option value="merge">Merge with existing</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={copyFilters()}
                    onChange={function(e) { setCopyFilters((e.target as HTMLInputElement).checked); }}
                  />
                  Copy Filters (expression tree, quick filters, tag filters)
                </label>
              </div>
              
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={copyExportSettings()}
                    onChange={function(e) { setCopyExportSettings((e.target as HTMLInputElement).checked); }}
                  />
                  Copy Export Settings
                </label>
              </div>
              
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={copyNoiseHeaders()}
                    onChange={function(e) { setCopyNoiseHeaders((e.target as HTMLInputElement).checked); }}
                  />
                  Copy Noise Headers (custom headers, disabled built-in headers)
                </label>
              </div>
              
              <Show when={error()}>
                <p class="error-message">{error()}</p>
              </Show>
              
              <Show when={selectedSourceInfo() && copyFilters() && !selectedSourceInfo()!.hasFilters}>
                <p style="color: #fab387; font-size: 12px; margin-bottom: 8px;">
                  ⚠️ Selected archive has no filters - default empty filters will be applied.
                </p>
              </Show>
              
              <Show when={selectedSourceInfo() && copyExportSettings() && !selectedSourceInfo()!.hasExportSettings}>
                <p style="color: #fab387; font-size: 12px; margin-bottom: 8px;">
                  ⚠️ Selected archive has no export settings - default settings will be applied.
                </p>
              </Show>
              
              <div class="modal-actions">
                <button 
                  class="btn-primary"
                  disabled={selectedSource() === null || loading() || (!copyFilters() && !copyExportSettings())}
                  onClick={handleCopy}
                >
                  {loading() ? 'Copying...' : 'Copy Settings'}
                </button>
                <button class="btn-secondary" onClick={props.onClose}>Cancel</button>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};
