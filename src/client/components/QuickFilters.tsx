import { Component, For, createMemo } from 'solid-js';
import { archivesStore, filtersStore } from '../stores';
import { RESOURCE_TYPES, EXTENSION_FILTERS, PRESETS } from '../utils/constants';
import { classifyEntry, getExtension, evaluateExpression } from '../utils/harProcessor';

export var QuickFilters: Component = function() {
  var entries = function() { return archivesStore.getCurrentEntries(); };
  var filters = function() { return filtersStore.filters(); };
  var quickFilters = function() { return filters().quickFilters; };

  function isQuickFilteredExcluding(entry: any, excludeKey: string): boolean {
    var qf = quickFilters();
    var keys = Object.keys(qf);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k === excludeKey || !qf[k]) continue;
      if (RESOURCE_TYPES[k] && classifyEntry(entry) === k) return true;
      if (EXTENSION_FILTERS[k]) {
        var ext = getExtension(entry.request.url);
        if (ext === k || (k === '.jpg' && (ext === '.jpg' || ext === '.jpeg'))) return true;
      }
    }
    return false;
  }

  function countQuickFilterImpact(key: string): number {
    var count = 0;
    var ents = entries();
    var f = filters();
    
    for (var i = 0; i < ents.length; i++) {
      var entry = ents[i];
      if (isQuickFilteredExcluding(entry, key)) continue;
      if (!evaluateExpression(entry, f.expressionTree)) continue;
      
      if (RESOURCE_TYPES[key] && classifyEntry(entry) === key) count++;
      if (EXTENSION_FILTERS[key]) {
        var ext = getExtension(entry.request.url);
        if (ext === key || (key === '.jpg' && (ext === '.jpg' || ext === '.jpeg'))) count++;
      }
    }
    return count;
  }

  var filterButtons = createMemo(function() {
    var allKeys = Object.keys(RESOURCE_TYPES).concat(Object.keys(EXTENSION_FILTERS));
    var qf = quickFilters();
    
    return allKeys.map(function(key) {
      var count = countQuickFilterImpact(key);
      var label = RESOURCE_TYPES[key]?.label || EXTENSION_FILTERS[key]?.label || key;
      return { key: key, label: label, count: count, active: qf[key] || false };
    }).filter(function(item) {
      return item.count > 0 || item.active;
    });
  });

  function handleFilterClick(key: string) {
    var current = quickFilters()[key] || false;
    filtersStore.setQuickFilter(key, !current);
  }

  function handlePresetClick(preset: typeof PRESETS[0]) {
    if (preset.keys.length === 0) {
      filtersStore.resetQuickFilters();
    } else {
      for (var i = 0; i < preset.keys.length; i++) {
        filtersStore.setQuickFilter(preset.keys[i], true);
      }
    }
  }

  return (
    <section id="quick-filters">
      <h3>Exclude by Type</h3>
      <div id="preset-filter-buttons">
        <For each={PRESETS}>
          {function(preset) {
            return (
              <button 
                class="preset-btn" 
                onClick={function() { handlePresetClick(preset); }}
              >
                {preset.label}
              </button>
            );
          }}
        </For>
      </div>
      <div id="quick-filter-buttons">
        <For each={filterButtons()}>
          {function(item) {
            return (
              <button 
                class={'quick-filter-btn' + (item.active ? ' active' : '')}
                onClick={function() { handleFilterClick(item.key); }}
              >
                {item.label} <span class="qf-count">({item.count})</span>
              </button>
            );
          }}
        </For>
      </div>
    </section>
  );
};
