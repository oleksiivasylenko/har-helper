import { Component, For, createMemo } from 'solid-js';
import { filtersStore, archivesStore, exportSettingsStore } from '../stores';
import type { HarEntry, HighlightInfo } from '../types';
import {
  classifyEntry,
  getEntrySize,
  formatSize,
  getEntryTime,
  getEntryTags,
  getSortValue,
  estimateEntryTokensExcluded,
  formatTokenCount
} from '../utils/harProcessor';

interface EntryWithHighlights {
  entry: HarEntry;
  highlightColors: HighlightInfo[];
}

interface RequestTableProps {
  entries: EntryWithHighlights[];
}

export var RequestTable: Component<RequestTableProps> = function(props) {
  var sortColumn = function() { return filtersStore.filters().sortColumn; };
  var sortDirection = function() { return filtersStore.filters().sortDirection; };
  var excludedResponses = function() { return exportSettingsStore.exportSettings().excludedResponses || {}; };

  var sortedEntries = createMemo(function() {
    var ents = [...props.entries];
    var col = sortColumn();
    var excluded = excludedResponses();
    
    if (col) {
      ents.sort(function(a, b) {
        var va: string | number;
        var vb: string | number;
        
        if (col === 'tokens') {
          var aIdx = a.entry._origIndex !== undefined ? a.entry._origIndex : 0;
          var bIdx = b.entry._origIndex !== undefined ? b.entry._origIndex : 0;
          va = estimateEntryTokensExcluded(a.entry, !!excluded[aIdx]);
          vb = estimateEntryTokensExcluded(b.entry, !!excluded[bIdx]);
        } else {
          va = getSortValue(a.entry, col!);
          vb = getSortValue(b.entry, col!);
        }
        
        var result = 0;
        if (typeof va === 'number' && typeof vb === 'number') {
          result = va - vb;
        } else {
          result = String(va).localeCompare(String(vb));
        }
        
        return sortDirection() === 'asc' ? result : -result;
      });
    }
    
    return ents;
  });

  function handleSort(column: string) {
    filtersStore.toggleSort(column);
  }

  function handleCopyUrl(url: string, e: Event) {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
  }

  function getStatusClass(status: number): string {
    if (status >= 100 && status < 200) return 'status-1xx';
    if (status >= 200 && status < 300) return 'status-2xx';
    if (status >= 300 && status < 400) return 'status-3xx';
    if (status >= 400 && status < 500) return 'status-4xx';
    if (status >= 500) return 'status-5xx';
    return 'status-0xx';
  }

  function getShortUrl(url: string): string {
    try {
      var urlObj = new URL(url);
      return urlObj.pathname + urlObj.search;
    } catch (e) {
      return url;
    }
  }

  function renderSortArrow(column: string) {
    if (sortColumn() !== column) return null;
    return <span class="sort-arrow">{sortDirection() === 'asc' ? ' ▲' : ' ▼'}</span>;
  }

  var deselectedEntries = function() { return exportSettingsStore.exportSettings().deselectedEntries || {}; };
  var excludedResponses = function() { return exportSettingsStore.exportSettings().excludedResponses || {}; };

  return (
    <table class="request-table">
      <thead>
        <tr>
          <th class="col-select" title="Include in filtered HAR">✓</th>
          <th class="col-row-num">Row</th>
          <th class="col-index sortable" onClick={function() { handleSort('index'); }}>
            Orig#{renderSortArrow('index')}
          </th>
          <th class="col-method sortable" onClick={function() { handleSort('method'); }}>
            Method{renderSortArrow('method')}
          </th>
          <th class="col-status sortable" onClick={function() { handleSort('status'); }}>
            Status{renderSortArrow('status')}
          </th>
          <th class="col-type sortable" onClick={function() { handleSort('type'); }}>
            Type{renderSortArrow('type')}
          </th>
          <th class="col-size sortable" onClick={function() { handleSort('size'); }}>
            Size{renderSortArrow('size')}
          </th>
          <th class="col-time sortable" onClick={function() { handleSort('time'); }}>
            Time{renderSortArrow('time')}
          </th>
          <th class="col-tokens sortable" onClick={function() { handleSort('tokens'); }} title="Estimated tokens">
            Tokens{renderSortArrow('tokens')}
          </th>
          <th class="col-exclude-resp" title="Exclude response from export">🚫</th>
          <th class="col-tags">Tags</th>
          <th class="col-highlight"></th>
          <th class="col-url sortable" onClick={function() { handleSort('url'); }}>
            URL{renderSortArrow('url')}
          </th>
        </tr>
      </thead>
      <tbody>
        <For each={sortedEntries()}>
          {function(item, index) {
            var entry = item.entry;
            var hlColors = item.highlightColors;
            var tags = getEntryTags(entry);
            var status = entry.response.status;
            var method = entry.request.method;
            var origIdx = entry._origIndex !== undefined ? entry._origIndex : index();
            
            var isSelected = function() {
              return !deselectedEntries()[origIdx];
            };
            
            var rowStyle = function() {
              var style: Record<string, string> = {};
              if (hlColors.length > 0) {
                style['border-left'] = '4px solid ' + hlColors[0].color;
                style['background-color'] = hlColors[0].color + '20';
              }
              if (!isSelected()) {
                style['opacity'] = '0.5';
              }
              return style;
            };

            function openInspectWindow() {
              var archiveId = archivesStore.currentArchiveId();
              localStorage.setItem('har-helper-inspect-entry', JSON.stringify(entry));
              localStorage.setItem('har-helper-inspect-idx', String(origIdx));
              localStorage.setItem('har-helper-inspect-archive-id', String(archiveId));
              window.open('/inspect.html?idx=' + origIdx + '&archiveId=' + archiveId, '_blank');
            }

            function handleCheckboxChange(e: Event) {
              e.stopPropagation();
              var checked = (e.target as HTMLInputElement).checked;
              exportSettingsStore.setEntrySelected(origIdx, checked);
            }

            var isResponseExcluded = function() {
              return !!(excludedResponses()[origIdx]);
            };

            function handleExcludeResponseChange(e: Event) {
              e.stopPropagation();
              var checked = (e.target as HTMLInputElement).checked;
              exportSettingsStore.setResponseExcluded(origIdx, checked);
            }

            return (
              <tr 
                style={rowStyle()}
                onClick={openInspectWindow}
              >
                <td class="col-select" onClick={function(e) { e.stopPropagation(); }}>
                  <input 
                    type="checkbox" 
                    checked={isSelected()}
                    onChange={handleCheckboxChange}
                    title="Include in filtered HAR"
                  />
                </td>
                <td class="col-row-num">{index() + 1}</td>
                <td class="col-index">{origIdx + 1}</td>
                <td class={'col-method method-' + method}>{method}</td>
                <td class={'col-status ' + getStatusClass(status)}>{status}</td>
                <td class="col-type">{classifyEntry(entry)}</td>
                <td class="col-size">{formatSize(getEntrySize(entry))}</td>
                <td class="col-time">{getEntryTime(entry)} ms</td>
                <td class="col-tokens">{formatTokenCount(estimateEntryTokensExcluded(entry, isResponseExcluded()))}</td>
                <td class="col-exclude-resp" onClick={function(e) { e.stopPropagation(); }}>
                  <input
                    type="checkbox"
                    checked={isResponseExcluded()}
                    onChange={handleExcludeResponseChange}
                    title="Exclude response from export"
                  />
                </td>
                <td class="col-tags">
                  <For each={tags}>
                    {function(tag) {
                      return <span class={'entry-tag ' + tag.cls}>{tag.text}</span>;
                    }}
                  </For>
                </td>
                <td class="col-highlight">
                  <For each={hlColors}>
                    {function(hl) {
                      return <span class="highlight-dot" style={{ 'background-color': hl.color }} title={hl.tooltip} />;
                    }}
                  </For>
                </td>
                <td class="col-url url-cell" title={entry.request.url}>
                  <span 
                    class="copy-url-icon" 
                    onClick={function(e) { handleCopyUrl(entry.request.url, e); }}
                    title="Copy URL"
                  >📋</span>
                  {getShortUrl(entry.request.url)}
                </td>
              </tr>
            );
          }}
        </For>
      </tbody>
    </table>
  );
};
