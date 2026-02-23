import { Component, For, Show, createSignal, createMemo } from 'solid-js';
import { exportSettingsStore, archivesStore, filtersStore } from '../../stores';
import { downloadFilteredHar, downloadText } from '../../utils/download';
import { filterEntries, createFilteredHar, createAiOptimizedText, sortEntries, estimateTokens, formatTokenCount, estimateExportTokens } from '../../utils/harProcessor';
import { BUILTIN_NOISE_HEADERS } from '../../utils/constants';
import type { ExportSettings } from '../../types';
import { NoiseManager } from './NoiseManager';

interface ExportSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HeaderPopupProps {
  hovered: {key: string, type: 'request' | 'response', rect: DOMRect};
  getTopValues: (key: string, type: 'request' | 'response') => Array<{value: string, count: number}>;
}

var HeaderPopup: Component<HeaderPopupProps> = function(props) {
  var topValues = props.getTopValues(props.hovered.key, props.hovered.type);
  if (topValues.length === 0) return null;
  
  var leftPos = props.hovered.rect.left - 220;
  if (leftPos < 0) leftPos = props.hovered.rect.right + 8;
  var topPos = props.hovered.rect.top;
  if (topPos + 150 > window.innerHeight) {
    topPos = window.innerHeight - 150;
  }
  
  return (
    <div
      class="exp-header-popup"
      style={{ left: leftPos + 'px', top: topPos + 'px' }}
    >
      <For each={topValues}>
        {function(item) {
          return (
            <div class="exp-header-popup-line">
              {item.value} ({item.count})
            </div>
          );
        }}
      </For>
    </div>
  );
};

export var ExportSettingsModal: Component<ExportSettingsModalProps> = function(props) {
  var [exporting, setExporting] = createSignal(false);
  var [error, setError] = createSignal<string | null>(null);
  var [headerFilter, setHeaderFilter] = createSignal('');
  var [reqHeadersCollapsed, setReqHeadersCollapsed] = createSignal(true);
  var [respHeadersCollapsed, setRespHeadersCollapsed] = createSignal(true);
  var [showNoiseManager, setShowNoiseManager] = createSignal(false);
  var [hoveredHeader, setHoveredHeader] = createSignal<{key: string, type: 'request' | 'response', rect: DOMRect} | null>(null);

  var settings = function() { return exportSettingsStore.exportSettings(); };
  var currentArchive = function() { return archivesStore.currentArchive(); };
  var harData = function() { return archivesStore.currentHarData(); };

  var estimatedTokens = createMemo(function() {
    var data = harData();
    if (!data || !data.log || !data.log.entries) return 0;
    return estimateExportTokens(data.log.entries, settings(), filtersStore.filters());
  });

  function updateSetting<K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) {
    exportSettingsStore.updateSetting(key, value);
  }

  function isNoiseHeader(key: string): boolean {
    var s = settings();
    if (s.disabledNoiseHeaders[key]) return false;
    return BUILTIN_NOISE_HEADERS.indexOf(key) !== -1 || s.userNoiseHeaders[key] === true;
  }

  var allRequestHeaders = createMemo(function() {
    var data = harData();
    if (!data || !data.log || !data.log.entries) return {};
    
    var headersMap: Record<string, string> = {};
    for (var i = 0; i < data.log.entries.length; i++) {
      var entry = data.log.entries[i];
      if (entry.request && entry.request.headers) {
        for (var j = 0; j < entry.request.headers.length; j++) {
          var name = entry.request.headers[j].name;
          var key = name.toLowerCase();
          headersMap[key] = name;
        }
      }
    }
    return headersMap;
  });

  var allResponseHeaders = createMemo(function() {
    var data = harData();
    if (!data || !data.log || !data.log.entries) return {};
    
    var headersMap: Record<string, string> = {};
    for (var i = 0; i < data.log.entries.length; i++) {
      var entry = data.log.entries[i];
      if (entry.response && entry.response.headers) {
        for (var j = 0; j < entry.response.headers.length; j++) {
          var name = entry.response.headers[j].name;
          var key = name.toLowerCase();
          headersMap[key] = name;
        }
      }
    }
    return headersMap;
  });

  var filteredRequestHeaders = createMemo(function() {
    var headers = allRequestHeaders();
    var filter = headerFilter().toLowerCase().trim();
    var s = settings();
    var keys = Object.keys(headers).sort();
    var result: Array<{key: string, displayName: string, isNoise: boolean}> = [];
    
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var displayName = headers[key];
      var noise = isNoiseHeader(key);
      
      if (s.hideNoiseReq && noise) continue;
      if (filter && key.indexOf(filter) === -1 && displayName.toLowerCase().indexOf(filter) === -1) continue;
      
      result.push({ key: key, displayName: displayName, isNoise: noise });
    }
    return result;
  });

  var filteredResponseHeaders = createMemo(function() {
    var headers = allResponseHeaders();
    var filter = headerFilter().toLowerCase().trim();
    var s = settings();
    var keys = Object.keys(headers).sort();
    var result: Array<{key: string, displayName: string, isNoise: boolean}> = [];
    
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var displayName = headers[key];
      var noise = isNoiseHeader(key);
      
      if (s.hideNoiseResp && noise) continue;
      if (filter && key.indexOf(filter) === -1 && displayName.toLowerCase().indexOf(filter) === -1) continue;
      
      result.push({ key: key, displayName: displayName, isNoise: noise });
    }
    return result;
  });

  var requestHeaderCounts = createMemo(function() {
    var headers = allRequestHeaders();
    var s = settings();
    var keys = Object.keys(headers);
    var total = 0;
    var included = 0;
    
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (s.hideNoiseReq && isNoiseHeader(key)) continue;
      total++;
      if (s.includedRequestHeaders[key] !== false) included++;
    }
    return { total: total, included: included };
  });

  var responseHeaderCounts = createMemo(function() {
    var headers = allResponseHeaders();
    var s = settings();
    var keys = Object.keys(headers);
    var total = 0;
    var included = 0;
    
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (s.hideNoiseResp && isNoiseHeader(key)) continue;
      total++;
      if (s.includedResponseHeaders[key] !== false) included++;
    }
    return { total: total, included: included };
  });

  function getTopHeaderValues(headerKey: string, type: 'request' | 'response'): Array<{value: string, count: number}> {
    var data = harData();
    if (!data || !data.log || !data.log.entries) return [];
    
    var counts: Record<string, number> = {};
    for (var i = 0; i < data.log.entries.length; i++) {
      var entry = data.log.entries[i];
      var headers = type === 'request' ? entry.request.headers : entry.response.headers;
      if (!headers) continue;
      
      for (var j = 0; j < headers.length; j++) {
        if (headers[j].name.toLowerCase() === headerKey) {
          var val = headers[j].value || '';
          if (val.length > 80) val = val.substring(0, 80) + '...';
          counts[val] = (counts[val] || 0) + 1;
        }
      }
    }
    
    var sorted = Object.keys(counts).sort(function(a, b) { return counts[b] - counts[a]; });
    var top: Array<{value: string, count: number}> = [];
    for (var i = 0; i < Math.min(5, sorted.length); i++) {
      top.push({ value: sorted[i], count: counts[sorted[i]] });
    }
    return top;
  }

  function isHeaderIncluded(key: string, type: 'request' | 'response'): boolean {
    var s = settings();
    var map = type === 'request' ? s.includedRequestHeaders : s.includedResponseHeaders;
    return map[key] !== false;
  }

  function toggleHeader(key: string, type: 'request' | 'response', included: boolean) {
    if (type === 'request') {
      exportSettingsStore.setIncludedRequestHeader(key, included);
    } else {
      exportSettingsStore.setIncludedResponseHeader(key, included);
    }
  }

  function selectAllHeaders(type: 'request' | 'response') {
    if (type === 'request') {
      var headers = allRequestHeaders();
      var keys = Object.keys(headers);
      for (var i = 0; i < keys.length; i++) {
        exportSettingsStore.setIncludedRequestHeader(keys[i], true);
      }
    } else {
      var headers = allResponseHeaders();
      var keys = Object.keys(headers);
      for (var i = 0; i < keys.length; i++) {
        exportSettingsStore.setIncludedResponseHeader(keys[i], true);
      }
    }
  }

  function selectNoneHeaders(type: 'request' | 'response') {
    if (type === 'request') {
      var headers = allRequestHeaders();
      var keys = Object.keys(headers);
      for (var i = 0; i < keys.length; i++) {
        exportSettingsStore.setIncludedRequestHeader(keys[i], false);
      }
    } else {
      var headers = allResponseHeaders();
      var keys = Object.keys(headers);
      for (var i = 0; i < keys.length; i++) {
        exportSettingsStore.setIncludedResponseHeader(keys[i], false);
      }
    }
  }

  function addToNoise(key: string) {
    if (BUILTIN_NOISE_HEADERS.indexOf(key) === -1) {
      exportSettingsStore.addUserNoiseHeader(key);
    }
    exportSettingsStore.toggleNoiseHeader(key, true);
  }

  async function handleExport() {
    var archive = currentArchive();
    var data = harData();
    
    if (!archive || !data || !data.log || !data.log.entries) {
      setError('No archive selected');
      return;
    }
    
    setExporting(true);
    setError(null);
    
    try {
      var filters = filtersStore.filters();
      var exportOpts = settings();
      
      var filteredEntriesResult = filterEntries(data.log.entries, filters, exportOpts);
      
      var finalEntries = filteredEntriesResult;
      if (!exportOpts.useOriginalOrder && filters.sortColumn) {
        finalEntries = sortEntries(filteredEntriesResult, filters.sortColumn, filters.sortDirection);
      }
      
      var filteredHar = createFilteredHar(data, finalEntries, exportOpts);
      
      var fileName = archive.file_name.replace('.har', '_filtered.har');
      downloadFilteredHar(filteredHar, fileName);
      
      props.onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  async function handleAiExport() {
    var archive = currentArchive();
    var data = harData();
    
    if (!archive || !data || !data.log || !data.log.entries) {
      setError('No archive selected');
      return;
    }
    
    setExporting(true);
    setError(null);
    
    try {
      var filters = filtersStore.filters();
      var exportOpts = settings();
      
      var filteredEntriesResult = filterEntries(data.log.entries, filters, exportOpts);
      
      var finalEntries = filteredEntriesResult;
      if (!exportOpts.useOriginalOrder && filters.sortColumn) {
        finalEntries = sortEntries(filteredEntriesResult, filters.sortColumn, filters.sortDirection);
      }
      
      var text = createAiOptimizedText(data, finalEntries, exportOpts);
      
      var fileName = archive.file_name.replace('.har', '.txt');
      downloadText(text, fileName);
      
      props.onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  function handleHeaderMouseEnter(e: MouseEvent, key: string, type: 'request' | 'response') {
    var target = e.currentTarget as HTMLElement;
    var rect = target.getBoundingClientRect();
    setHoveredHeader({ key: key, type: type, rect: rect });
  }

  function handleHeaderMouseLeave() {
    setHoveredHeader(null);
  }

  return (
    <Show when={props.isOpen}>
      <div class="modal-overlay" onClick={function(e) { if (e.target === e.currentTarget) props.onClose(); }}>
        <div class="modal-panel export-modal-panel">
          <div class="modal-header">
            <h4>Export Settings</h4>
            <button class="modal-close-btn" onClick={props.onClose}>×</button>
          </div>
          <div class="modal-body">
            <div class="exp-filter-row">
              <input 
                type="text" 
                placeholder="Filter headers by name..."
                value={headerFilter()}
                onInput={function(e) { setHeaderFilter((e.target as HTMLInputElement).value); }}
              />
            </div>
            
            <div class="exp-section">
              <div 
                class="exp-section-header"
                onClick={function() { setReqHeadersCollapsed(!reqHeadersCollapsed()); }}
              >
                <span class="exp-arrow">{reqHeadersCollapsed() ? '▶' : '▼'}</span>
                <span>Request Headers</span>
                <span class="exp-header-count">({requestHeaderCounts().included}/{requestHeaderCounts().total})</span>
                <span class="exp-header-actions" onClick={function(e) { e.stopPropagation(); }}>
                  <label class="exp-noise-toggle">
                    <input 
                      type="checkbox" 
                      checked={settings().hideNoiseReq}
                      onChange={function(e) { updateSetting('hideNoiseReq', (e.target as HTMLInputElement).checked); }}
                    />
                    Hide noise
                  </label>
                  <button class="exp-sel-btn" onClick={function() { selectAllHeaders('request'); }}>All</button>
                  <button class="exp-sel-btn" onClick={function() { selectNoneHeaders('request'); }}>None</button>
                </span>
              </div>
              <Show when={!reqHeadersCollapsed()}>
                <div class="exp-header-list">
                  <For each={filteredRequestHeaders()}>
                    {function(header) {
                      return (
                        <div class="exp-header-row">
                          <input 
                            type="checkbox"
                            checked={isHeaderIncluded(header.key, 'request')}
                            onChange={function(e) { toggleHeader(header.key, 'request', (e.target as HTMLInputElement).checked); }}
                          />
                          <span class="exp-header-name">
                            {header.displayName}
                            {header.isNoise && <span class="exp-noise-label">(noise)</span>}
                          </span>
                          <span 
                            class="exp-header-info"
                            onMouseEnter={function(e) { handleHeaderMouseEnter(e, header.key, 'request'); }}
                            onMouseLeave={handleHeaderMouseLeave}
                          >?</span>
                          <span 
                            class="exp-header-add-noise"
                            title="Move to noise"
                            onClick={function() { addToNoise(header.key); }}
                          >+</span>
                        </div>
                      );
                    }}
                  </For>
                  <Show when={filteredRequestHeaders().length === 0}>
                    <div class="exp-no-headers">No headers found</div>
                  </Show>
                </div>
              </Show>
            </div>
            
            <div class="exp-section">
              <div 
                class="exp-section-header"
                onClick={function() { setRespHeadersCollapsed(!respHeadersCollapsed()); }}
              >
                <span class="exp-arrow">{respHeadersCollapsed() ? '▶' : '▼'}</span>
                <span>Response Headers</span>
                <span class="exp-header-count">({responseHeaderCounts().included}/{responseHeaderCounts().total})</span>
                <span class="exp-header-actions" onClick={function(e) { e.stopPropagation(); }}>
                  <label class="exp-noise-toggle">
                    <input 
                      type="checkbox" 
                      checked={settings().hideNoiseResp}
                      onChange={function(e) { updateSetting('hideNoiseResp', (e.target as HTMLInputElement).checked); }}
                    />
                    Hide noise
                  </label>
                  <button class="exp-sel-btn" onClick={function() { selectAllHeaders('response'); }}>All</button>
                  <button class="exp-sel-btn" onClick={function() { selectNoneHeaders('response'); }}>None</button>
                </span>
              </div>
              <Show when={!respHeadersCollapsed()}>
                <div class="exp-header-list">
                  <For each={filteredResponseHeaders()}>
                    {function(header) {
                      return (
                        <div class="exp-header-row">
                          <input 
                            type="checkbox"
                            checked={isHeaderIncluded(header.key, 'response')}
                            onChange={function(e) { toggleHeader(header.key, 'response', (e.target as HTMLInputElement).checked); }}
                          />
                          <span class="exp-header-name">
                            {header.displayName}
                            {header.isNoise && <span class="exp-noise-label">(noise)</span>}
                          </span>
                          <span 
                            class="exp-header-info"
                            onMouseEnter={function(e) { handleHeaderMouseEnter(e, header.key, 'response'); }}
                            onMouseLeave={handleHeaderMouseLeave}
                          >?</span>
                          <span 
                            class="exp-header-add-noise"
                            title="Move to noise"
                            onClick={function() { addToNoise(header.key); }}
                          >+</span>
                        </div>
                      );
                    }}
                  </For>
                  <Show when={filteredResponseHeaders().length === 0}>
                    <div class="exp-no-headers">No headers found</div>
                  </Show>
                </div>
              </Show>
            </div>
            
            <div class="exp-manage-noise-bar">
              <button onClick={function() { setShowNoiseManager(true); }}>Manage Noise Headers</button>
            </div>
            
            <hr class="exp-divider" />
            
            <div class="exp-options-grid">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={settings().useOriginalOrder}
                  onChange={function(e) { updateSetting('useOriginalOrder', (e.target as HTMLInputElement).checked); }}
                />
                Use original order
              </label>
              
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={settings().requestBody}
                  onChange={function(e) { updateSetting('requestBody', (e.target as HTMLInputElement).checked); }}
                />
                Request Body
              </label>
              
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={settings().requestCookies}
                  onChange={function(e) { updateSetting('requestCookies', (e.target as HTMLInputElement).checked); }}
                />
                Request Cookies
              </label>
              
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={settings().responseBody}
                  onChange={function(e) { updateSetting('responseBody', (e.target as HTMLInputElement).checked); }}
                />
                Response Body
              </label>
              
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={settings().responseCookies}
                  onChange={function(e) { updateSetting('responseCookies', (e.target as HTMLInputElement).checked); }}
                />
                Response Cookies
              </label>
              
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={settings().timings}
                  onChange={function(e) { updateSetting('timings', (e.target as HTMLInputElement).checked); }}
                />
                Timings
              </label>
              
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={settings().serverIp}
                  onChange={function(e) { updateSetting('serverIp', (e.target as HTMLInputElement).checked); }}
                />
                Server IP Address
              </label>
              
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={settings().queryString}
                  onChange={function(e) { updateSetting('queryString', (e.target as HTMLInputElement).checked); }}
                />
                Query String Params
              </label>
              
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings().includeInitiator}
                  onChange={function(e) { updateSetting('includeInitiator', (e.target as HTMLInputElement).checked); }}
                />
                Initiator Info
              </label>
              
              <label class="checkbox-label" title="Remove CSS styles, scripts, comments, and extra whitespace from HTML responses">
                <input
                  type="checkbox"
                  checked={settings().minifyHtml}
                  onChange={function(e) { updateSetting('minifyHtml', (e.target as HTMLInputElement).checked); }}
                />
                Minify HTML
              </label>
              
              <label class="checkbox-label" title="Remove whitespace and formatting from JSON responses">
                <input
                  type="checkbox"
                  checked={settings().minifyJson}
                  onChange={function(e) { updateSetting('minifyJson', (e.target as HTMLInputElement).checked); }}
                />
                Minify JSON
              </label>
            </div>
            

            
            <div class="exp-token-estimate">
              <span class="exp-token-label">Estimated export size:</span>
              <span class="exp-token-value">~{formatTokenCount(estimatedTokens())} tokens</span>
            </div>
            
            <Show when={error()}>
              <p class="error-message">{error()}</p>
            </Show>
            
            <div class="modal-actions">
              <button
                class="btn-primary"
                disabled={exporting() || !currentArchive()}
                onClick={handleExport}
              >
                {exporting() ? 'Exporting...' : 'Create Filtered HAR'}
              </button>
              <button
                class="btn-ai-export"
                disabled={exporting() || !currentArchive()}
                onClick={handleAiExport}
                title="Export as plain text optimized for AI consumption (smaller token count)"
              >
                {exporting() ? 'Exporting...' : '🤖 Minimised DATA FOR AI'}
              </button>
              <button class="btn-secondary" onClick={props.onClose}>Cancel</button>
            </div>
          </div>
        </div>
        
        <Show when={hoveredHeader()}>
          <HeaderPopup
            hovered={hoveredHeader()!}
            getTopValues={getTopHeaderValues}
          />
        </Show>
      </div>
      
      <NoiseManager 
        isOpen={showNoiseManager()}
        onClose={function() { setShowNoiseManager(false); }}
      />
    </Show>
  );
};
