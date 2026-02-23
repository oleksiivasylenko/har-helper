import { Component, Show, createSignal, onMount, createMemo } from 'solid-js';
import {
  Header,
  ArchiveSelector,
  QuickFilters,
  TagFilters,
  DomainFilters,
  RequestTable,
  ExpressionEditor,
  CopySettingsModal,
  ExportSettingsModal,
  NoiseManager,
  GlobalSettingsModal
} from './components';
import { archivesStore, filtersStore, exportSettingsStore, globalSettingsStore } from './stores';
import type { HarEntry } from './types';
import { isEntryVisible, getTextSearchHighlightColor, estimateExportTokens, formatTokenCount } from './utils/harProcessor';

export var App: Component = function() {
  var [showCopySettings, setShowCopySettings] = createSignal(false);
  var [showExportSettings, setShowExportSettings] = createSignal(false);
  var [showNoiseManager, setShowNoiseManager] = createSignal(false);
  var [showGlobalSettings, setShowGlobalSettings] = createSignal(false);
  var [loading, setLoading] = createSignal(true);
  var [error, setError] = createSignal<string | null>(null);

  onMount(async function() {
    try {
      var lastArchiveId = await archivesStore.loadArchives();
      await globalSettingsStore.loadGlobalSettings();
      
      if (lastArchiveId !== null) {
        await archivesStore.switchArchive(lastArchiveId);
        await filtersStore.loadFilters(lastArchiveId);
        await exportSettingsStore.loadExportSettings(lastArchiveId);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  });

  var currentArchive = function() { return archivesStore.currentArchive(); };
  var harData = function() { return archivesStore.currentHarData(); };
  var filters = function() { return filtersStore.filters(); };

  var filteredEntries = createMemo(function() {
    var data = harData();
    if (!data || !data.log || !data.log.entries) return [];
    
    var f = filters();
    var result: HarEntry[] = [];
    var entries = data.log.entries;
    
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (isEntryVisible(entry, f.expressionTree, f.quickFilters, f.tagFilters, f.domainFilters)) {
        entry._origIndex = i;
        result.push(entry);
      }
    }
    
    return result;
  });

  var entriesWithHighlights = createMemo(function() {
    var entries = filteredEntries();
    var f = filters();
    
    return entries.map(function(entry) {
      var colors = getTextSearchHighlightColor(entry, f.expressionTree);
      return { entry: entry, highlightColors: colors };
    });
  });

  var stats = createMemo(function() {
    var data = harData();
    var filtered = filteredEntries();
    var totalEntries = data && data.log && data.log.entries ? data.log.entries.length : 0;
    var expSettings = exportSettingsStore.exportSettings();
    var deselected = expSettings.deselectedEntries || {};
    
    var selectedCount = 0;
    for (var i = 0; i < filtered.length; i++) {
      var entry = filtered[i];
      var origIdx = entry._origIndex !== undefined ? entry._origIndex : i;
      if (!deselected[origIdx as number]) {
        selectedCount++;
      }
    }
    
    var totalTokens = data && data.log && data.log.entries
      ? estimateExportTokens(data.log.entries, expSettings, filtersStore.filters())
      : 0;
    
    return {
      total: totalEntries,
      visible: filtered.length,
      hidden: totalEntries - filtered.length,
      selected: selectedCount,
      tokens: totalTokens
    };
  });

  function handleOpenCopySettings() {
    setShowCopySettings(true);
  }

  function handleOpenExportSettings() {
    setShowExportSettings(true);
  }

  function handleOpenNoiseManager() {
    setShowNoiseManager(true);
  }

  function handleOpenGlobalSettings() {
    setShowGlobalSettings(true);
  }

  return (
    <div class="app-container">
      <Header 
        onOpenGlobalSettings={handleOpenGlobalSettings}
      />
      
      <Show when={loading()}>
        <div class="loading-overlay">
          <div class="loading-spinner" />
          <p>Loading...</p>
        </div>
      </Show>
      
      <Show when={error()}>
        <div class="error-banner">
          <p>{error()}</p>
          <button onClick={function() { setError(null); }}>Dismiss</button>
        </div>
      </Show>
      
      <Show when={!loading()}>
        <main class="main-content">
          <aside class="sidebar">
            <ArchiveSelector 
              onOpenCopySettings={handleOpenCopySettings}
            />
            
            <Show when={currentArchive()}>
              <div class="stats-panel">
                <span>Total: {stats().total}</span>
                <span>Visible: {stats().visible}</span>
                <span>Hidden: {stats().hidden}</span>
                <span title="Selected for export">Export: {stats().selected}</span>
                <span title="Estimated tokens for AI (selected entries)" class="token-estimate">~{formatTokenCount(stats().tokens)} tokens</span>
              </div>
              
              <QuickFilters />
              <TagFilters />
              <DomainFilters />
              
              <div class="sidebar-option">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={exportSettingsStore.exportSettings().stripBase64}
                    onChange={function(e) { exportSettingsStore.updateSetting('stripBase64', (e.target as HTMLInputElement).checked); }}
                  />
                  Strip Base64 Content
                </label>
              </div>
              
              <button class="noise-headers-btn" onClick={handleOpenNoiseManager}>
                🔇 Noise Headers
              </button>
              
              <div class="sidebar-actions">
                <button class="btn-primary" onClick={handleOpenExportSettings}>
                  Create Filtered HAR
                </button>
              </div>
            </Show>
          </aside>
          
          <div class="content-area">
            <Show when={!currentArchive()}>
              <div class="empty-state">
                <h2>No Archive Selected</h2>
                <p>Upload a HAR file or select an existing archive to get started.</p>
              </div>
            </Show>
            
            <Show when={currentArchive()}>
              <ExpressionEditor />
              
              <div class="table-container">
                <RequestTable 
                  entries={entriesWithHighlights()}
                />
              </div>
            </Show>
          </div>
        </main>
      </Show>
      
      <CopySettingsModal 
        isOpen={showCopySettings()}
        onClose={function() { setShowCopySettings(false); }}
      />
      
      <ExportSettingsModal 
        isOpen={showExportSettings()}
        onClose={function() { setShowExportSettings(false); }}
      />
      
      <NoiseManager 
        isOpen={showNoiseManager()}
        onClose={function() { setShowNoiseManager(false); }}
      />
      
      <GlobalSettingsModal 
        isOpen={showGlobalSettings()}
        onClose={function() { setShowGlobalSettings(false); }}
      />
    </div>
  );
};
