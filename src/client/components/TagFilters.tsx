import { Component, For } from 'solid-js';
import { filtersStore } from '../stores';
import { TAG_TYPES, TAG_CSS_MAP } from '../utils/constants';

export var TagFilters: Component = function() {
  var tagFilters = function() { return filtersStore.filters().tagFilters; };

  function handleTagClick(tag: string) {
    var current = tagFilters()[tag] || false;
    filtersStore.setTagFilter(tag, !current);
  }

  return (
    <div id="tag-filters-section">
      <h3 style="margin-top:8px">Filter by Tag</h3>
      <div id="tag-filter-buttons">
        <For each={TAG_TYPES}>
          {function(tag) {
            var isActive = function() { return tagFilters()[tag] || false; };
            var tagCls = TAG_CSS_MAP[tag] || '';
            
            return (
              <button 
                class={'tag-filter-btn' + (isActive() ? ' active' : '')}
                onClick={function() { handleTagClick(tag); }}
              >
                <span class={'entry-tag ' + tagCls}>{tag}</span>
              </button>
            );
          }}
        </For>
      </div>
    </div>
  );
};
