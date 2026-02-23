import type { HarEntry, ExpressionNode, Header, Filters, ExportSettings, HighlightInfo } from '../types';
import { RESOURCE_TYPES, EXTENSION_FILTERS, BUILTIN_NOISE_HEADERS } from './constants';

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateEntryTokens(entry: HarEntry): number {
  var tokens = 0;
  tokens += estimateTokens(entry.request.method + ' ' + entry.request.url);
  
  if (entry.request.headers) {
    for (var i = 0; i < entry.request.headers.length; i++) {
      tokens += estimateTokens(entry.request.headers[i].name + ': ' + entry.request.headers[i].value);
    }
  }
  if (entry.response.headers) {
    for (var i = 0; i < entry.response.headers.length; i++) {
      tokens += estimateTokens(entry.response.headers[i].name + ': ' + entry.response.headers[i].value);
    }
  }
  if (entry.request.postData && entry.request.postData.text) {
    tokens += estimateTokens(entry.request.postData.text);
  }
  if (entry.response.content && entry.response.content.text) {
    tokens += estimateTokens(entry.response.content.text);
  }
  tokens += 20;
  return tokens;
}

export function estimateEntryTokensExcluded(entry: HarEntry, responseExcluded: boolean): number {
  var tokens = 0;
  tokens += estimateTokens(entry.request.method + ' ' + entry.request.url);
  
  if (entry.request.headers) {
    for (var i = 0; i < entry.request.headers.length; i++) {
      tokens += estimateTokens(entry.request.headers[i].name + ': ' + entry.request.headers[i].value);
    }
  }
  if (!responseExcluded && entry.response.headers) {
    for (var i = 0; i < entry.response.headers.length; i++) {
      tokens += estimateTokens(entry.response.headers[i].name + ': ' + entry.response.headers[i].value);
    }
  }
  if (entry.request.postData && entry.request.postData.text) {
    tokens += estimateTokens(entry.request.postData.text);
  }
  if (!responseExcluded && entry.response.content && entry.response.content.text) {
    tokens += estimateTokens(entry.response.content.text);
  }
  tokens += 20;
  return tokens;
}

export function formatTokenCount(count: number): string {
  if (count < 1000) return String(count);
  if (count < 1000000) return (count / 1000).toFixed(1) + 'k';
  return (count / 1000000).toFixed(1) + 'M';
}

export function estimateExportTokens(
  entries: HarEntry[],
  exportSettings: ExportSettings,
  filters: Filters
): number {
  var filtered = filterEntries(entries, filters, exportSettings);
  var excludedResponses = exportSettings.excludedResponses || {};
  var includedRequestHeaders = exportSettings.includedRequestHeaders || {};
  var includedResponseHeaders = exportSettings.includedResponseHeaders || {};
  var userNoiseHeaders = exportSettings.userNoiseHeaders || {};
  var disabledNoiseHeaders = exportSettings.disabledNoiseHeaders || {};
  var total = 0;

  for (var i = 0; i < filtered.length; i++) {
    var entry = filtered[i];
    var origIdx = entry._origIndex !== undefined ? entry._origIndex : i;
    var respExcluded = !!excludedResponses[origIdx];
    var tokens = 0;

    tokens += estimateTokens(entry.request.method + ' ' + entry.request.url);

    if (entry.request.headers) {
      for (var j = 0; j < entry.request.headers.length; j++) {
        var hKey = entry.request.headers[j].name.toLowerCase();
        if (includedRequestHeaders[hKey] === false) continue;
        if (isNoiseHeader(hKey, userNoiseHeaders, disabledNoiseHeaders)) continue;
        if (!exportSettings.requestCookies && hKey === 'cookie') continue;
        tokens += estimateTokens(entry.request.headers[j].name + ': ' + entry.request.headers[j].value);
      }
    }

    if (!respExcluded && entry.response.headers) {
      for (var j = 0; j < entry.response.headers.length; j++) {
        var hKey = entry.response.headers[j].name.toLowerCase();
        if (includedResponseHeaders[hKey] === false) continue;
        if (isNoiseHeader(hKey, userNoiseHeaders, disabledNoiseHeaders)) continue;
        if (!exportSettings.responseCookies && hKey === 'set-cookie') continue;
        tokens += estimateTokens(entry.response.headers[j].name + ': ' + entry.response.headers[j].value);
      }
    }

    if (exportSettings.requestBody && entry.request.postData && entry.request.postData.text) {
      var reqText = entry.request.postData.text;
      if (exportSettings.stripBase64 !== false && isBase64Content(reqText)) {
        tokens += 10;
      } else {
        var reqMimeType = (entry.request.postData.mimeType || '').toLowerCase();
        if (exportSettings.minifyJson && reqMimeType.indexOf('json') !== -1) {
          reqText = minifyJsonContent(reqText);
        }
        tokens += estimateTokens(reqText);
      }
    }

    if (!respExcluded && exportSettings.responseBody && entry.response.content && entry.response.content.text) {
      var respText = entry.response.content.text;
      if (exportSettings.stripBase64 !== false && (entry.response.content.encoding === 'base64' || isBase64Content(respText))) {
        tokens += 10;
      } else {
        var respMimeType = (entry.response.content.mimeType || '').toLowerCase();
        if (exportSettings.minifyHtml && (respMimeType.indexOf('html') !== -1 || respMimeType.indexOf('xhtml') !== -1)) {
          respText = minifyHtmlContent(respText);
        }
        if (exportSettings.minifyJson && respMimeType.indexOf('json') !== -1) {
          respText = minifyJsonContent(respText);
        }
        tokens += estimateTokens(respText);
      }
    }

    if (exportSettings.queryString && entry.request.queryString) {
      for (var j = 0; j < entry.request.queryString.length; j++) {
        tokens += estimateTokens(entry.request.queryString[j].name + '=' + entry.request.queryString[j].value);
      }
    }

    tokens += 20;
    total += tokens;
  }

  return total;
}

export function classifyEntry(entry: HarEntry): string {
  var url = entry.request.url.toLowerCase();
  var mime = (entry.response.content.mimeType || '').toLowerCase();
  var rt = (entry._resourceType || '').toLowerCase();
  
  if (rt === 'websocket' || url.startsWith('wss://') || url.startsWith('ws://')) return 'websocket';
  if (rt === 'document' || mime.indexOf('text/html') !== -1) return 'document';
  if (rt === 'xhr' || rt === 'fetch') return 'xhr';
  if (rt === 'script' || mime.indexOf('javascript') !== -1) return 'script';
  if (rt === 'stylesheet' || mime.indexOf('css') !== -1) return 'stylesheet';
  if (rt === 'image' || mime.indexOf('image/') !== -1) return 'image';
  if (rt === 'font' || mime.indexOf('font') !== -1) return 'font';
  if (rt === 'media' || mime.indexOf('video/') !== -1 || mime.indexOf('audio/') !== -1) return 'media';
  if (mime.indexOf('manifest') !== -1) return 'manifest';
  return 'other';
}

export function getExtension(url: string): string {
  try {
    var p = new URL(url).pathname;
    var d = p.lastIndexOf('.');
    if (d === -1) return '';
    var ext = p.substring(d).toLowerCase();
    var q = ext.indexOf('?');
    if (q !== -1) ext = ext.substring(0, q);
    if (ext.length > 6) return '';
    return ext;
  } catch (e) {
    return '';
  }
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return '';
  }
}

export function getEntrySize(entry: HarEntry): number {
  return Math.max(0, entry.response.content.size || entry.response.bodySize || 0);
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function getEntryTime(entry: HarEntry): number {
  return Math.round(entry.time || 0);
}

export function getSortValue(entry: HarEntry, col: string): string | number {
  if (col === 'index') return entry._origIndex || 0;
  if (col === 'method') return entry.request.method;
  if (col === 'status') return entry.response.status;
  if (col === 'type') return classifyEntry(entry);
  if (col === 'size') return getEntrySize(entry);
  if (col === 'time') return getEntryTime(entry);
  if (col === 'tokens') return estimateEntryTokens(entry);
  if (col === 'url') return entry.request.url;
  return 0;
}

export function sortEntries(
  entries: HarEntry[],
  sortColumn: string | null,
  sortDirection: 'asc' | 'desc'
): HarEntry[] {
  if (!sortColumn) return entries;
  
  var sorted = [...entries];
  sorted.sort(function(a, b) {
    var va = getSortValue(a, sortColumn);
    var vb = getSortValue(b, sortColumn);
    var result = 0;
    
    if (typeof va === 'number' && typeof vb === 'number') {
      result = va - vb;
    } else {
      result = String(va).localeCompare(String(vb));
    }
    
    return sortDirection === 'asc' ? result : -result;
  });
  
  return sorted;
}

export function getFieldValue(entry: HarEntry, field: string): string | number {
  if (field === 'url') return entry.request.url;
  if (field === 'method') return entry.request.method;
  if (field === 'status') return entry.response.status;
  if (field === 'mimeType') return entry.response.content.mimeType || '';
  if (field === 'resourceType') return classifyEntry(entry);
  if (field === 'extension') return getExtension(entry.request.url);
  if (field === 'domain') return getDomain(entry.request.url);
  if (field === 'size') return getEntrySize(entry);
  if (field === 'time') return getEntryTime(entry);
  if (field === 'statusRange') {
    var s = entry.response.status;
    if (s >= 100 && s < 200) return '1xx';
    if (s >= 200 && s < 300) return '2xx';
    if (s >= 300 && s < 400) return '3xx';
    if (s >= 400 && s < 500) return '4xx';
    if (s >= 500 && s < 600) return '5xx';
    return '0xx';
  }
  return '';
}

export function headersToString(headers: Header[] | undefined): string {
  var r = '';
  if (!headers) return r;
  for (var i = 0; i < headers.length; i++) {
    r += headers[i].name + ': ' + headers[i].value + '\n';
  }
  return r;
}

export function isJsonMime(mime: string | undefined): boolean {
  if (!mime) return false;
  return mime.toLowerCase().indexOf('json') !== -1;
}

export function isHtmlMime(mime: string | undefined): boolean {
  if (!mime) return false;
  var m = mime.toLowerCase();
  return m.indexOf('text/html') !== -1 || m.indexOf('xhtml') !== -1;
}

export function getEntryTags(entry: HarEntry): Array<{ text: string; cls: string }> {
  var tags: Array<{ text: string; cls: string }> = [];
  var respMime = (entry.response.content.mimeType || '').toLowerCase();
  var reqMime = (entry.request.postData?.mimeType || '').toLowerCase();

  if (isHtmlMime(respMime)) tags.push({ text: 'html', cls: 'tag-html' });
  if (isJsonMime(respMime)) tags.push({ text: 'resp-json', cls: 'tag-json' });
  if (isJsonMime(reqMime)) tags.push({ text: 'req-json', cls: 'tag-json' });
  if (entry.request.postData?.text) tags.push({ text: 'payload', cls: 'tag-payload' });
  if (entry.request.queryString && entry.request.queryString.length > 0) tags.push({ text: 'query', cls: 'tag-query' });

  var hasBase64 = false;
  if (entry.response.content?.encoding === 'base64') {
    hasBase64 = true;
  } else if (entry.response.content?.text && isBase64Content(entry.response.content.text)) {
    hasBase64 = true;
  } else if (entry.request.postData?.text && isBase64Content(entry.request.postData.text)) {
    hasBase64 = true;
  }
  if (hasBase64) tags.push({ text: 'base64', cls: 'tag-base64' });

  return tags;
}

export function decodeResponseBody(content: { text?: string; encoding?: string }): string {
  if (!content || !content.text) return '';
  if (content.encoding === 'base64') {
    try {
      return atob(content.text);
    } catch (e) {
      return content.text;
    }
  }
  return content.text;
}

function getSearchableText(entry: HarEntry, scope: string, part: string): string {
  var texts: string[] = [];
  
  if (scope === 'url') {
    texts.push(entry.request.url);
    return texts.join('\n');
  }
  
  if (scope === 'all' || scope === 'request') {
    if (part === 'all' || part === 'headers') {
      texts.push(entry.request.url);
      texts.push(entry.request.method);
      texts.push(headersToString(entry.request.headers));
      if (entry.request.queryString) {
        for (var i = 0; i < entry.request.queryString.length; i++) {
          texts.push(entry.request.queryString[i].name + '=' + entry.request.queryString[i].value);
        }
      }
    }
    if (part === 'all' || part === 'bodies') {
      if (entry.request.postData?.text) texts.push(entry.request.postData.text);
    }
  }
  
  if (scope === 'all' || scope === 'response') {
    if (part === 'all' || part === 'headers') {
      texts.push(String(entry.response.status));
      texts.push(headersToString(entry.response.headers));
    }
    if (part === 'all' || part === 'bodies') {
      if (entry.response.content?.text) texts.push(decodeResponseBody(entry.response.content));
    }
  }
  
  return texts.join('\n');
}

function matchesPropertyFilter(entry: HarEntry, cond: ExpressionNode): boolean {
  var val = getFieldValue(entry, cond.field || '');
  var target = cond.value || '';
  var op = cond.filterOperator || 'contains';
  
  if (cond.field === 'status' || cond.field === 'size' || cond.field === 'time') {
    var nv = Number(val);
    var nt = Number(target);
    if (op === 'equals') return nv === nt;
    if (op === 'not equals') return nv !== nt;
    if (op === 'greater than') return nv > nt;
    if (op === 'less than') return nv < nt;
  }
  
  var sv = String(val).toLowerCase();
  var st = String(target).toLowerCase();
  
  if (op === 'contains') return sv.indexOf(st) !== -1;
  if (op === 'not contains') return sv.indexOf(st) === -1;
  if (op === 'equals') return sv === st;
  if (op === 'not equals') return sv !== st;
  if (op === 'starts with') return sv.indexOf(st) === 0;
  if (op === 'ends with') return sv.indexOf(st, sv.length - st.length) !== -1;
  if (op === 'regex') {
    try {
      return new RegExp(target, 'i').test(String(val));
    } catch (e) {
      return false;
    }
  }
  return true;
}

function matchesTextSearch(entry: HarEntry, cond: ExpressionNode): boolean {
  if (!cond.text) return true;
  var haystack = getSearchableText(entry, cond.scope || 'all', cond.part || 'all');
  var needle = cond.text;
  
  if (cond.mode === 'regex') {
    try {
      return new RegExp(needle, 'i').test(haystack);
    } catch (e) {
      return false;
    }
  }
  if (cond.mode === 'case') return haystack.indexOf(needle) !== -1;
  return haystack.toLowerCase().indexOf(needle.toLowerCase()) !== -1;
}

export function evaluateExpression(entry: HarEntry, node: ExpressionNode | null): boolean {
  if (!node) return true;
  if (node.enabled === false) return true;
  
  if (node.type === 'group') {
    if (!node.children || node.children.length === 0) return true;
    var enabledChildren = node.children.filter(function(c) { return c.enabled !== false; });
    if (enabledChildren.length === 0) return true;
    if (node.operator === 'and') {
      for (var i = 0; i < node.children.length; i++) {
        if (!evaluateExpression(entry, node.children[i])) return false;
      }
      return true;
    } else {
      for (var i = 0; i < node.children.length; i++) {
        if (evaluateExpression(entry, node.children[i])) return true;
      }
      return false;
    }
  }
  
  if (node.type === 'text-search') {
    if (node.highlightOnly) return true;
    return matchesTextSearch(entry, node);
  }
  
  if (node.type === 'property-filter') {
    if (!node.value) return true;
    var result = matchesPropertyFilter(entry, node);
    return node.exclude ? !result : result;
  }
  
  return true;
}

function formatTextSearchTooltip(node: ExpressionNode): string {
  var scopeLabel = '';
  if (node.scope === 'all') scopeLabel = 'Req & Resp';
  else if (node.scope === 'request') scopeLabel = 'Request';
  else if (node.scope === 'response') scopeLabel = 'Response';
  else if (node.scope === 'url') scopeLabel = 'URL';
  else scopeLabel = node.scope || 'All';

  var partLabel = '';
  if (node.part === 'all') partLabel = 'Hdrs & Bodies';
  else if (node.part === 'headers') partLabel = 'Headers';
  else if (node.part === 'bodies') partLabel = 'Bodies';
  else partLabel = node.part || 'All';

  var modeLabel = '';
  if (node.mode === 'text') modeLabel = 'contains';
  else if (node.mode === 'case') modeLabel = 'contains (case)';
  else if (node.mode === 'regex') modeLabel = 'matches regex';
  else modeLabel = 'contains';

  return 'SEARCH: ' + scopeLabel + ' ' + partLabel + ' ' + modeLabel + " '" + (node.text || '') + "'";
}

export function getTextSearchHighlightColor(entry: HarEntry, expressionTree: ExpressionNode): HighlightInfo[] {
  var highlights: HighlightInfo[] = [];
  
  function walk(node: ExpressionNode | null) {
    if (!node) return;
    if (node.enabled === false) return;
    if (node.type === 'group') {
      if (node.children) {
        for (var i = 0; i < node.children.length; i++) walk(node.children[i]);
      }
      return;
    }
    if (node.type === 'text-search' && node.highlightOnly && node.text) {
      if (matchesTextSearch(entry, node) && node.color) {
        highlights.push({
          color: node.color,
          tooltip: formatTextSearchTooltip(node)
        });
      }
    }
  }
  
  walk(expressionTree);
  return highlights;
}

export function isQuickFiltered(entry: HarEntry, quickFilters: Record<string, boolean>): boolean {
  var keys = Object.keys(quickFilters);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (!quickFilters[k]) continue;
    if (RESOURCE_TYPES[k] && classifyEntry(entry) === k) return true;
    if (EXTENSION_FILTERS[k]) {
      var ext = getExtension(entry.request.url);
      if (ext === k || (k === '.jpg' && (ext === '.jpg' || ext === '.jpeg'))) return true;
    }
  }
  return false;
}

export function isTagFiltered(entry: HarEntry, tagFilters: Record<string, boolean>): boolean {
  var activeKeys = Object.keys(tagFilters);
  var anyActive = false;
  for (var i = 0; i < activeKeys.length; i++) {
    if (tagFilters[activeKeys[i]]) {
      anyActive = true;
      break;
    }
  }
  if (!anyActive) return false;
  
  var tags = getEntryTags(entry);
  for (var i = 0; i < tags.length; i++) {
    if (tagFilters[tags[i].text]) return false;
  }
  return true;
}

function isDomainFiltered(entry: HarEntry, domainFilters: Record<string, boolean>): boolean {
  var domain = getDomain(entry.request.url);
  return domainFilters[domain] === true;
}

export function isEntryVisible(
  entry: HarEntry,
  expressionTree: ExpressionNode,
  quickFilters: Record<string, boolean>,
  tagFilters: Record<string, boolean>,
  domainFilters?: Record<string, boolean>
): boolean {
  if (domainFilters && isDomainFiltered(entry, domainFilters)) return false;
  if (isQuickFiltered(entry, quickFilters)) return false;
  if (isTagFiltered(entry, tagFilters)) return false;
  if (!evaluateExpression(entry, expressionTree)) return false;
  return true;
}

export function isNoiseHeader(
  key: string,
  userNoiseHeaders: Record<string, boolean>,
  disabledNoiseHeaders: Record<string, boolean>
): boolean {
  if (disabledNoiseHeaders[key]) return false;
  return BUILTIN_NOISE_HEADERS.indexOf(key) !== -1 || userNoiseHeaders[key] === true;
}

export function filterHeaders(
  headers: Header[],
  includedMap: Record<string, boolean>
): Header[] {
  var result: Header[] = [];
  for (var i = 0; i < headers.length; i++) {
    var key = headers[i].name.toLowerCase();
    if (includedMap[key] !== false) result.push(headers[i]);
  }
  return result;
}

export interface ProcessedHarData {
  har: any;
  entries: HarEntry[];
  domains: string[];
  methods: string[];
  statusCodes: number[];
}

export function processHarData(harJson: any): ProcessedHarData {
  var entries = harJson.log?.entries || [];
  var domains = new Set<string>();
  var methods = new Set<string>();
  var statusCodes = new Set<number>();
  
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    domains.add(getDomain(entry.request.url));
    methods.add(entry.request.method);
    statusCodes.add(entry.response.status);
  }
  
  return {
    har: harJson,
    entries: entries,
    domains: Array.from(domains).sort(),
    methods: Array.from(methods).sort(),
    statusCodes: Array.from(statusCodes).sort(function(a, b) { return a - b; })
  };
}

export function filterEntries(
  entries: HarEntry[],
  filters: Filters,
  exportSettings: ExportSettings
): HarEntry[] {
  var result: HarEntry[] = [];
  var deselected = exportSettings.deselectedEntries || {};
  
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    var origIdx = entry._origIndex !== undefined ? entry._origIndex : i;
    
    if (deselected[origIdx]) continue;
    
    if (isEntryVisible(entry, filters.expressionTree, filters.quickFilters, filters.tagFilters, filters.domainFilters)) {
      result.push(entry);
    }
  }
  
  return result;
}

function removeHeadersByName(headers: Header[], namesToRemove: string[]): Header[] {
  var lowerNames = namesToRemove.map(function(n) { return n.toLowerCase(); });
  var result: Header[] = [];
  for (var i = 0; i < headers.length; i++) {
    if (lowerNames.indexOf(headers[i].name.toLowerCase()) === -1) {
      result.push(headers[i]);
    }
  }
  return result;
}

function removeQueryParamsByName(url: string, paramsToRemove: string[]): string {
  try {
    var u = new URL(url);
    for (var i = 0; i < paramsToRemove.length; i++) {
      u.searchParams.delete(paramsToRemove[i]);
    }
    return u.toString();
  } catch (e) {
    return url;
  }
}

function truncateBody(text: string | undefined, maxSizeKb: number): string | undefined {
  if (!text || maxSizeKb <= 0) return text;
  var maxBytes = maxSizeKb * 1024;
  if (text.length <= maxBytes) return text;
  return text.substring(0, maxBytes) + '... [truncated]';
}

function filterHeadersByIncluded(
  headers: Header[],
  includedMap: Record<string, boolean>,
  userNoiseHeaders: Record<string, boolean>,
  disabledNoiseHeaders: Record<string, boolean>
): Header[] {
  var result: Header[] = [];
  for (var i = 0; i < headers.length; i++) {
    var key = headers[i].name.toLowerCase();
    var isNoise = isNoiseHeader(key, userNoiseHeaders, disabledNoiseHeaders);
    if (isNoise) continue;
    if (includedMap[key] === false) continue;
    result.push(headers[i]);
  }
  return result;
}

export function isBase64Content(text: string): boolean {
  if (text.length < 100) return false;
  if (/^data:[^;]+;base64,/.test(text)) return true;
  var sample = text.substring(0, 1000).replace(/\s/g, '');
  if (sample.length < 50) return false;
  var b64Chars = sample.replace(/[A-Za-z0-9+/=]/g, '');
  return b64Chars.length / sample.length < 0.05 && sample.length > 200;
}

function minifyHtmlContent(html: string): string {
  var result = html;
  result = result.replace(/<!--[\s\S]*?-->/g, '');
  result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  result = result.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  result = result.replace(/<link[^>]*rel\s*=\s*["']stylesheet["'][^>]*\/?>/gi, '');
  result = result.replace(/\s*style\s*=\s*"[^"]*"/gi, '');
  result = result.replace(/\s*style\s*=\s*'[^']*'/gi, '');
  result = result.replace(/\s*class\s*=\s*"[^"]*"/gi, '');
  result = result.replace(/\s*class\s*=\s*'[^']*'/gi, '');
  result = result.replace(/\s+/g, ' ');
  result = result.replace(/>\s+</g, '><');
  return result.trim();
}

function minifyJsonContent(text: string): string {
  try {
    var parsed = JSON.parse(text);
    return JSON.stringify(parsed);
  } catch (e) {
    return text;
  }
}

export function createFilteredHar(
  originalHar: any,
  filteredEntries: HarEntry[],
  exportSettings: ExportSettings
): any {
  var newHar = JSON.parse(JSON.stringify(originalHar));
  var newEntries: any[] = [];
  
  var userNoiseHeaders = exportSettings.userNoiseHeaders || {};
  var disabledNoiseHeaders = exportSettings.disabledNoiseHeaders || {};
  var includedRequestHeaders = exportSettings.includedRequestHeaders || {};
  var includedResponseHeaders = exportSettings.includedResponseHeaders || {};
  var excludedResponses = exportSettings.excludedResponses || {};
  
  for (var i = 0; i < filteredEntries.length; i++) {
    var entry = JSON.parse(JSON.stringify(filteredEntries[i]));
    var entryOrigIdx = entry._origIndex !== undefined ? entry._origIndex : i;
    
    if (excludedResponses[entryOrigIdx]) {
      entry.response = {
        status: entry.response.status,
        statusText: entry.response.statusText || '',
        headers: [],
        cookies: [],
        content: { size: 0, mimeType: '', text: '' },
        bodySize: 0
      };
    }
    
    if (!exportSettings.requestBody && entry.request.postData) {
      delete entry.request.postData;
    }
    
    if (!exportSettings.responseBody && entry.response.content) {
      entry.response.content.text = '';
      entry.response.content.size = 0;
    }
    
    if (entry.response.content && entry.response.content.text) {
      var mimeType = (entry.response.content.mimeType || '').toLowerCase();
      
      if (exportSettings.minifyHtml && (mimeType.indexOf('html') !== -1 || mimeType.indexOf('xhtml') !== -1)) {
        entry.response.content.text = minifyHtmlContent(entry.response.content.text);
        entry.response.content.size = entry.response.content.text.length;
      }
      
      if (exportSettings.minifyJson && (mimeType.indexOf('json') !== -1)) {
        entry.response.content.text = minifyJsonContent(entry.response.content.text);
        entry.response.content.size = entry.response.content.text.length;
      }
    }
    
    if (entry.request.postData && entry.request.postData.text) {
      var reqMimeType = (entry.request.postData.mimeType || '').toLowerCase();
      
      if (exportSettings.minifyJson && reqMimeType.indexOf('json') !== -1) {
        entry.request.postData.text = minifyJsonContent(entry.request.postData.text);
      }
    }
    
    if (exportSettings.stripBase64 !== false) {
      if (entry.response.content && entry.response.content.text) {
        var respText = entry.response.content.text;
        if (entry.response.content.encoding === 'base64' || isBase64Content(respText)) {
          var b64Size = Math.round(respText.length * 3 / 4 / 1024);
          var b64Mime = entry.response.content.mimeType || 'unknown';
          entry.response.content.text = '[base64-data: ' + b64Size + 'KB ' + b64Mime + ']';
          entry.response.content.size = entry.response.content.text.length;
          entry.response.content.encoding = undefined;
        }
      }
      
      if (entry.request.postData && entry.request.postData.text) {
        var reqText = entry.request.postData.text;
        if (isBase64Content(reqText)) {
          var reqB64Size = Math.round(reqText.length * 3 / 4 / 1024);
          entry.request.postData.text = '[base64-data: ' + reqB64Size + 'KB]';
        }
      }
    }
    
    if (!exportSettings.requestCookies) {
      entry.request.cookies = [];
      if (entry.request.headers) {
        entry.request.headers = removeHeadersByName(entry.request.headers, ['cookie']);
      }
    }
    
    if (!exportSettings.responseCookies) {
      entry.response.cookies = [];
      if (entry.response.headers) {
        entry.response.headers = removeHeadersByName(entry.response.headers, ['set-cookie']);
      }
    }
    
    if (!exportSettings.timings && entry.timings) {
      delete entry.timings;
    }
    
    if (!exportSettings.serverIp) {
      delete entry.serverIPAddress;
    }
    
    if (!exportSettings.queryString && entry.request.queryString) {
      entry.request.queryString = [];
      try {
        var u = new URL(entry.request.url);
        u.search = '';
        entry.request.url = u.toString();
      } catch (e) {}
    }
    
    if (!exportSettings.includeInitiator) {
      delete entry._initiator;
    }
    
    if (entry.request.headers) {
      entry.request.headers = filterHeadersByIncluded(
        entry.request.headers,
        includedRequestHeaders,
        userNoiseHeaders,
        disabledNoiseHeaders
      );
    }
    
    if (entry.response.headers) {
      entry.response.headers = filterHeadersByIncluded(
        entry.response.headers,
        includedResponseHeaders,
        userNoiseHeaders,
        disabledNoiseHeaders
      );
    }
    
    delete entry._checked;
    delete entry._origIndex;
    delete entry._resourceType;
    
    newEntries.push(entry);
  }
  
  newHar.log.entries = newEntries;
  return newHar;
}

export function createAiOptimizedText(
  originalHar: any,
  filteredEntries: HarEntry[],
  exportSettings: ExportSettings
): string {
  var har = createFilteredHar(originalHar, filteredEntries, exportSettings);
  var entries = har.log.entries;
  var lines: string[] = [];
  
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    var req = entry.request;
    var resp = entry.response;
    
    lines.push('--- #' + (i + 1) + ' ---');
    lines.push(req.method + ' ' + req.url);
    
    if (req.headers && req.headers.length > 0) {
      for (var h = 0; h < req.headers.length; h++) {
        lines.push(req.headers[h].name + ': ' + req.headers[h].value);
      }
    }
    
    if (req.postData && req.postData.text) {
      lines.push('');
      lines.push(req.postData.text);
    }
    
    var respSize = resp.content && resp.content.text ? resp.content.text.length : 0;
    lines.push('');
    lines.push('> ' + resp.status + ' ' + (resp.statusText || '') + ' (' + formatSize(respSize) + ')');
    
    if (resp.headers && resp.headers.length > 0) {
      for (var h = 0; h < resp.headers.length; h++) {
        lines.push(resp.headers[h].name + ': ' + resp.headers[h].value);
      }
    }
    
    if (resp.content && resp.content.text) {
      lines.push('');
      lines.push(resp.content.text);
    }
    
    lines.push('');
  }
  
  return lines.join('\n');
}
