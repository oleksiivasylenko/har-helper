import { Component, For, Show, createMemo, createSignal } from 'solid-js';
import { archivesStore, filtersStore } from '../stores';
import { getDomain } from '../utils/harProcessor';

export var DomainFilters: Component = function() {
  var [collapsed, setCollapsed] = createSignal(true);
  var entries = function() { return archivesStore.getCurrentEntries(); };
  var domainFilters = function() { return filtersStore.filters().domainFilters || {}; };

  var domainStats = createMemo(function() {
    var ents = entries();
    var counts: Record<string, number> = {};
    for (var i = 0; i < ents.length; i++) {
      var domain = getDomain(ents[i].request.url);
      counts[domain] = (counts[domain] || 0) + 1;
    }
    var result: Array<{domain: string, count: number}> = [];
    var keys = Object.keys(counts).sort(function(a, b) { return counts[b] - counts[a]; });
    for (var i = 0; i < keys.length; i++) {
      result.push({ domain: keys[i], count: counts[keys[i]] });
    }
    return result;
  });

  var excludedCount = createMemo(function() {
    var df = domainFilters();
    var count = 0;
    var keys = Object.keys(df);
    for (var i = 0; i < keys.length; i++) {
      if (df[keys[i]]) count++;
    }
    return count;
  });

  function handleToggle(domain: string) {
    var current = domainFilters()[domain] || false;
    filtersStore.setDomainFilter(domain, !current);
  }

  function handleReset() {
    filtersStore.resetDomainFilters();
  }

  return (
    <section class="domain-filters">
      <h3 
        class="domain-filters-header"
        onClick={function() { setCollapsed(!collapsed()); }}
      >
        <span class="exp-arrow">{collapsed() ? '▶' : '▼'}</span>
        Domains ({domainStats().length})
        <Show when={excludedCount() > 0}>
          <span class="domain-excluded-count"> — {excludedCount()} excluded</span>
        </Show>
      </h3>
      <Show when={!collapsed()}>
        <div class="domain-filters-list">
          <Show when={excludedCount() > 0}>
            <button class="domain-reset-btn" onClick={handleReset}>Reset all</button>
          </Show>
          <For each={domainStats()}>
            {function(item) {
              var isExcluded = function() { return domainFilters()[item.domain] === true; };
              return (
                <label class={'domain-filter-item' + (isExcluded() ? ' excluded' : '')}>
                  <input 
                    type="checkbox" 
                    checked={!isExcluded()}
                    onChange={function() { handleToggle(item.domain); }}
                  />
                  <span class="domain-name" title={item.domain}>{item.domain}</span>
                  <span class="domain-count">({item.count})</span>
                </label>
              );
            }}
          </For>
        </div>
      </Show>
    </section>
  );
};
