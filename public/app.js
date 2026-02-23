var harData = null;
var entries = [];
var quickFilters = {};
var tagFilters = {};
var sortColumn = null;
var sortDirection = 'asc';
var expressionCollapsed = false;

var BUILTIN_NOISE_HEADERS = [
  ':authority', ':method', ':path', ':scheme', ':status',
  'accept', 'accept-encoding', 'accept-language',
  'age', 'cache-control', 'connection', 'content-encoding',
  'content-length', 'date', 'etag', 'expect', 'expires',
  'if-match', 'if-modified-since', 'if-none-match', 'if-range', 'if-unmodified-since',
  'keep-alive', 'last-modified', 'pragma', 'range', 'referer',
  'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform', 'sec-fetch-dest',
  'sec-fetch-mode', 'sec-fetch-site', 'sec-fetch-user', 'server',
  'strict-transport-security', 'transfer-encoding', 'upgrade-insecure-requests',
  'user-agent', 'vary', 'via', 'x-content-type-options', 'x-frame-options',
  'x-powered-by', 'x-xss-protection'
];

var exportSettings = {
  requestBody: true,
  requestCookies: true,
  responseBody: true,
  responseCookies: true,
  timings: true,
  serverIp: true,
  queryString: true,
  hideNoiseReq: true,
  hideNoiseResp: true,
  useOriginalOrder: true,
  includedRequestHeaders: {},
  includedResponseHeaders: {},
  userNoiseHeaders: {},
  disabledNoiseHeaders: {}
};

var globalSettings = {
  useNoiseInspect: true
};

var expressionTree = {
  type: 'group',
  operator: 'and',
  children: []
};

var SEARCH_COLORS = [
  '#f9e2af', '#f38ba8', '#a6e3a1', '#89b4fa', '#cba6f7',
  '#fab387', '#94e2d5', '#74c7ec', '#eba0ac', '#a6adc8',
  '#f5c2e7', '#b4befe', '#f2cdcd', '#bac2de', '#9399b2',
  '#e6c384', '#7aa2f7', '#bb9af7', '#7dcfff', '#ff9e64'
];

var RESOURCE_TYPES = {
  'document': { label: 'Document', test: function (e) { return classifyEntry(e) === 'document'; } },
  'xhr': { label: 'Fetch/XHR', test: function (e) { return classifyEntry(e) === 'xhr'; } },
  'script': { label: 'Script (JS)', test: function (e) { return classifyEntry(e) === 'script'; } },
  'stylesheet': { label: 'Stylesheet (CSS)', test: function (e) { return classifyEntry(e) === 'stylesheet'; } },
  'image': { label: 'Image', test: function (e) { return classifyEntry(e) === 'image'; } },
  'font': { label: 'Font', test: function (e) { return classifyEntry(e) === 'font'; } },
  'media': { label: 'Media', test: function (e) { return classifyEntry(e) === 'media'; } },
  'websocket': { label: 'WebSocket', test: function (e) { return classifyEntry(e) === 'websocket'; } },
  'manifest': { label: 'Manifest', test: function (e) { return classifyEntry(e) === 'manifest'; } },
  'other': { label: 'Other', test: function (e) { return classifyEntry(e) === 'other'; } }
};

var EXTENSION_FILTERS = {
  '.png': { label: '.png' }, '.jpg': { label: '.jpg/.jpeg' }, '.gif': { label: '.gif' },
  '.svg': { label: '.svg' }, '.ico': { label: '.ico' }, '.webp': { label: '.webp' },
  '.woff': { label: '.woff' }, '.woff2': { label: '.woff2' }, '.ttf': { label: '.ttf' },
  '.css': { label: '.css' }, '.js': { label: '.js' }, '.map': { label: '.map' }, '.json': { label: '.json' }
};

var FILTER_FIELDS = [
  { value: 'url', label: 'URL' },
  { value: 'method', label: 'Method' },
  { value: 'status', label: 'Status Code' },
  { value: 'mimeType', label: 'MIME Type' },
  { value: 'resourceType', label: 'Resource Type' },
  { value: 'extension', label: 'File Extension' },
  { value: 'domain', label: 'Domain' },
  { value: 'size', label: 'Response Size (bytes)' },
  { value: 'time', label: 'Response Time (ms)' },
  { value: 'statusRange', label: 'Status Range' }
];

var FILTER_OPERATORS = {
  'url': ['contains', 'not contains', 'equals', 'starts with', 'ends with', 'regex'],
  'method': ['equals', 'not equals'],
  'status': ['equals', 'not equals', 'greater than', 'less than'],
  'mimeType': ['contains', 'not contains', 'equals'],
  'resourceType': ['equals', 'not equals'],
  'extension': ['equals', 'not equals'],
  'domain': ['contains', 'not contains', 'equals'],
  'size': ['greater than', 'less than', 'equals'],
  'time': ['greater than', 'less than', 'equals'],
  'statusRange': ['equals', 'not equals']
};

var STATUS_RANGES = ['1xx', '2xx', '3xx', '4xx', '5xx'];

var PRESETS = [
  { label: '🧹 Keep only Docs & XHR', keys: ['script', 'stylesheet', 'image', 'font', 'media', 'manifest', 'other'] },
  { label: '🔄 Reset All', keys: [] }
];

function saveState() {
  try {
    localStorage.setItem('har-helper-state', JSON.stringify({
      expressionTree: expressionTree,
      quickFilters: quickFilters,
      tagFilters: tagFilters,
      exportSettings: exportSettings,
      globalSettings: globalSettings,
      sortColumn: sortColumn,
      sortDirection: sortDirection,
      expressionCollapsed: expressionCollapsed
    }));
  } catch (e) {}
}

function loadState() {
  try {
    var raw = localStorage.getItem('har-helper-state');
    if (!raw) return;
    var state = JSON.parse(raw);
    if (state.expressionTree) expressionTree = state.expressionTree;
    if (state.quickFilters) quickFilters = state.quickFilters;
    if (state.tagFilters) tagFilters = state.tagFilters;
    if (state.exportSettings) {
      exportSettings = state.exportSettings;
      if (exportSettings.hideNoise !== undefined) {
        if (exportSettings.hideNoiseReq === undefined) exportSettings.hideNoiseReq = exportSettings.hideNoise;
        if (exportSettings.hideNoiseResp === undefined) exportSettings.hideNoiseResp = exportSettings.hideNoise;
        delete exportSettings.hideNoise;
      }
      if (exportSettings.hideNoiseReq === undefined) exportSettings.hideNoiseReq = true;
      if (exportSettings.hideNoiseResp === undefined) exportSettings.hideNoiseResp = true;
      if (exportSettings.useOriginalOrder === undefined) exportSettings.useOriginalOrder = true;
    }
    if (state.globalSettings) {
      globalSettings = state.globalSettings;
      if (globalSettings.useNoiseInspect === undefined) globalSettings.useNoiseInspect = true;
    }
    if (state.sortColumn !== undefined) sortColumn = state.sortColumn;
    if (state.sortDirection) sortDirection = state.sortDirection;
    if (state.expressionCollapsed !== undefined) expressionCollapsed = state.expressionCollapsed;
  } catch (e) {}
}

function applyExpressionCollapsed() {
  var section = document.getElementById('expression-section');
  var arrow = document.getElementById('expression-arrow');
  if (expressionCollapsed) {
    section.classList.add('collapsed');
    arrow.textContent = '▶';
  } else {
    section.classList.remove('collapsed');
    arrow.textContent = '▼';
  }
}

function classifyEntry(entry) {
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

function getExtension(url) {
  try {
    var p = new URL(url).pathname;
    var d = p.lastIndexOf('.');
    if (d === -1) return '';
    var ext = p.substring(d).toLowerCase();
    var q = ext.indexOf('?');
    if (q !== -1) ext = ext.substring(0, q);
    if (ext.length > 6) return '';
    return ext;
  } catch (e) { return ''; }
}

function getDomain(url) {
  try { return new URL(url).hostname; } catch (e) { return ''; }
}

function getEntrySize(entry) {
  return Math.max(0, entry.response.content.size || entry.response.bodySize || 0);
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getEntryTime(entry) { return Math.round(entry.time || 0); }

function getFieldValue(entry, field) {
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

function headersToString(headers) {
  var r = '';
  if (!headers) return r;
  for (var i = 0; i < headers.length; i++) r += headers[i].name + ': ' + headers[i].value + '\n';
  return r;
}

function isJsonMime(mime) {
  if (!mime) return false;
  var m = mime.toLowerCase();
  return m.indexOf('json') !== -1;
}

function isHtmlMime(mime) {
  if (!mime) return false;
  var m = mime.toLowerCase();
  return m.indexOf('text/html') !== -1 || m.indexOf('xhtml') !== -1;
}

function getEntryTags(entry) {
  var tags = [];
  var respMime = (entry.response.content.mimeType || '').toLowerCase();
  var reqMime = (entry.request.postData && entry.request.postData.mimeType || '').toLowerCase();

  if (isHtmlMime(respMime)) tags.push({ text: 'html', cls: 'tag-html' });
  if (isJsonMime(respMime)) tags.push({ text: 'resp-json', cls: 'tag-json' });
  if (isJsonMime(reqMime)) tags.push({ text: 'req-json', cls: 'tag-json' });
  if (entry.request.postData && entry.request.postData.text) tags.push({ text: 'payload', cls: 'tag-payload' });
  if (entry.request.queryString && entry.request.queryString.length > 0) tags.push({ text: 'query', cls: 'tag-query' });

  return tags;
}

function renderTags(tags) {
  var h = '';
  for (var i = 0; i < tags.length; i++) {
    h += '<span class="entry-tag ' + tags[i].cls + '">' + tags[i].text + '</span>';
  }
  return h;
}

function getSearchableText(entry, scope, part) {
  var texts = [];
  if (scope === 'url') { texts.push(entry.request.url); return texts.join('\n'); }
  if (scope === 'all' || scope === 'request') {
    if (part === 'all' || part === 'headers') {
      texts.push(entry.request.url);
      texts.push(entry.request.method);
      texts.push(headersToString(entry.request.headers));
      if (entry.request.queryString) {
        for (var i = 0; i < entry.request.queryString.length; i++)
          texts.push(entry.request.queryString[i].name + '=' + entry.request.queryString[i].value);
      }
    }
    if (part === 'all' || part === 'bodies') {
      if (entry.request.postData && entry.request.postData.text) texts.push(entry.request.postData.text);
    }
  }
  if (scope === 'all' || scope === 'response') {
    if (part === 'all' || part === 'headers') {
      texts.push(String(entry.response.status));
      texts.push(headersToString(entry.response.headers));
    }
    if (part === 'all' || part === 'bodies') {
      if (entry.response.content && entry.response.content.text) texts.push(decodeResponseBody(entry.response.content));
    }
  }
  return texts.join('\n');
}

function matchesPropertyFilter(entry, cond) {
  var val = getFieldValue(entry, cond.field);
  var target = cond.value;
  var op = cond.operator;
  if (cond.field === 'status' || cond.field === 'size' || cond.field === 'time') {
    var nv = Number(val), nt = Number(target);
    if (op === 'equals') return nv === nt;
    if (op === 'not equals') return nv !== nt;
    if (op === 'greater than') return nv > nt;
    if (op === 'less than') return nv < nt;
  }
  var sv = String(val).toLowerCase(), st = String(target).toLowerCase();
  if (op === 'contains') return sv.indexOf(st) !== -1;
  if (op === 'not contains') return sv.indexOf(st) === -1;
  if (op === 'equals') return sv === st;
  if (op === 'not equals') return sv !== st;
  if (op === 'starts with') return sv.indexOf(st) === 0;
  if (op === 'ends with') return sv.indexOf(st, sv.length - st.length) !== -1;
  if (op === 'regex') { try { return new RegExp(target, 'i').test(String(val)); } catch (e) { return false; } }
  return true;
}

function matchesTextSearch(entry, cond) {
  if (!cond.text) return true;
  var haystack = getSearchableText(entry, cond.scope, cond.part);
  var needle = cond.text;
  if (cond.mode === 'regex') { try { return new RegExp(needle, 'i').test(haystack); } catch (e) { return false; } }
  if (cond.mode === 'case') return haystack.indexOf(needle) !== -1;
  return haystack.toLowerCase().indexOf(needle.toLowerCase()) !== -1;
}

function evaluateExpression(entry, node) {
  if (!node) return true;
  if (node.type === 'group') {
    if (!node.children || node.children.length === 0) return true;
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

function getTextSearchHighlightColor(entry) {
  var colors = [];
  function walk(node) {
    if (!node) return;
    if (node.type === 'group') {
      if (node.children) {
        for (var i = 0; i < node.children.length; i++) walk(node.children[i]);
      }
      return;
    }
    if (node.type === 'text-search' && node.highlightOnly && node.text) {
      if (matchesTextSearch(entry, node)) colors.push(node.color);
    }
  }
  walk(expressionTree);
  return colors;
}

function isQuickFiltered(entry) {
  var keys = Object.keys(quickFilters);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (!quickFilters[k]) continue;
    if (RESOURCE_TYPES[k] && RESOURCE_TYPES[k].test(entry)) return true;
    if (EXTENSION_FILTERS[k]) {
      var ext = getExtension(entry.request.url);
      if (ext === k || (k === '.jpg' && (ext === '.jpg' || ext === '.jpeg'))) return true;
    }
  }
  return false;
}

function isTagFiltered(entry) {
  var activeKeys = Object.keys(tagFilters);
  var anyActive = false;
  for (var i = 0; i < activeKeys.length; i++) {
    if (tagFilters[activeKeys[i]]) { anyActive = true; break; }
  }
  if (!anyActive) return false;
  var tags = getEntryTags(entry);
  for (var i = 0; i < tags.length; i++) {
    if (tagFilters[tags[i].text]) return false;
  }
  return true;
}

function isEntryVisible(entry) {
  if (isQuickFiltered(entry)) return false;
  if (isTagFiltered(entry)) return false;
  if (!evaluateExpression(entry, expressionTree)) return false;
  return true;
}

function getUsedColors() {
  var used = {};
  function walk(node) {
    if (!node) return;
    if (node.type === 'text-search' && node.color) used[node.color] = true;
    if (node.type === 'group' && node.children) {
      for (var i = 0; i < node.children.length; i++) walk(node.children[i]);
    }
  }
  walk(expressionTree);
  return used;
}

function getNextColor() {
  var used = getUsedColors();
  for (var i = 0; i < SEARCH_COLORS.length; i++) {
    if (!used[SEARCH_COLORS[i]]) return SEARCH_COLORS[i];
  }
  return SEARCH_COLORS[0];
}

var dragData = null;

function renderExpressionTree() {
  var container = document.getElementById('expression-container');
  container.innerHTML = '';
  container.appendChild(renderNode(expressionTree, null, -1));
}

function renderNode(node, parent, indexInParent) {
  if (node.type === 'group') return renderGroup(node, parent, indexInParent);
  if (node.type === 'text-search') return renderTextSearchNode(node, parent, indexInParent);
  if (node.type === 'property-filter') return renderPropertyFilterNode(node, parent, indexInParent);
  return document.createElement('div');
}

function renderGroup(group, parent, indexInParent) {
  var div = document.createElement('div');
  div.className = 'expr-group';
  if (parent) div.className += ' expr-nested';

  var header = document.createElement('div');
  header.className = 'expr-group-header';

  var opBtn = document.createElement('button');
  opBtn.className = 'expr-op-btn';
  opBtn.textContent = group.operator.toUpperCase();
  opBtn.addEventListener('click', function () {
    group.operator = group.operator === 'and' ? 'or' : 'and';
    opBtn.textContent = group.operator.toUpperCase();
    saveState();
    applyFilters();
  });

  var addTextBtn = document.createElement('button');
  addTextBtn.className = 'expr-add-btn';
  addTextBtn.textContent = '+ Text Search';
  addTextBtn.addEventListener('click', function () {
    group.children.push({
      type: 'text-search', text: '', scope: 'all', part: 'all',
      mode: 'text', highlightOnly: true, color: getNextColor()
    });
    renderExpressionTree();
    applyFilters();
  });

  var addFilterBtn = document.createElement('button');
  addFilterBtn.className = 'expr-add-btn';
  addFilterBtn.textContent = '+ Property Filter';
  addFilterBtn.addEventListener('click', function () {
    group.children.push({
      type: 'property-filter', field: 'url', operator: 'contains', value: '', exclude: true
    });
    renderExpressionTree();
    applyFilters();
  });

  var addGroupBtn = document.createElement('button');
  addGroupBtn.className = 'expr-add-btn expr-add-group-btn';
  addGroupBtn.textContent = '+ ( Group )';
  addGroupBtn.addEventListener('click', function () {
    group.children.push({ type: 'group', operator: 'or', children: [] });
    renderExpressionTree();
    applyFilters();
  });

  header.appendChild(opBtn);
  header.appendChild(addTextBtn);
  header.appendChild(addFilterBtn);
  header.appendChild(addGroupBtn);

  if (parent) {
    var removeGroupBtn = document.createElement('button');
    removeGroupBtn.className = 'expr-remove-btn';
    removeGroupBtn.textContent = '×';
    removeGroupBtn.addEventListener('click', function () {
      parent.children.splice(indexInParent, 1);
      renderExpressionTree();
      applyFilters();
    });
    header.appendChild(removeGroupBtn);
  }

  div.appendChild(header);

  var childrenDiv = document.createElement('div');
  childrenDiv.className = 'expr-children';

  for (var i = 0; i < group.children.length; i++) {
    (function (idx) {
      var childWrapper = document.createElement('div');
      childWrapper.className = 'expr-child-wrapper';
      childWrapper.draggable = true;
      childWrapper.dataset.idx = idx;

      childWrapper.addEventListener('dragstart', function (e) {
        dragData = { parent: group, index: idx };
        childWrapper.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      childWrapper.addEventListener('dragend', function () {
        childWrapper.classList.remove('dragging');
        dragData = null;
        var allWrappers = document.querySelectorAll('.expr-child-wrapper');
        for (var w = 0; w < allWrappers.length; w++) allWrappers[w].classList.remove('drag-over');
      });

      childWrapper.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        childWrapper.classList.add('drag-over');
      });

      childWrapper.addEventListener('dragleave', function () {
        childWrapper.classList.remove('drag-over');
      });

      childWrapper.addEventListener('drop', function (e) {
        e.preventDefault();
        childWrapper.classList.remove('drag-over');
        if (!dragData) return;
        var srcParent = dragData.parent;
        var srcIdx = dragData.index;
        var item = srcParent.children.splice(srcIdx, 1)[0];
        var targetIdx = idx;
        if (srcParent === group && srcIdx < targetIdx) targetIdx--;
        group.children.splice(targetIdx, 0, item);
        dragData = null;
        renderExpressionTree();
        applyFilters();
      });

      if (idx > 0) {
        var opLabel = document.createElement('span');
        opLabel.className = 'expr-op-label';
        opLabel.textContent = group.operator.toUpperCase();
        childWrapper.appendChild(opLabel);
      }

      childWrapper.appendChild(renderNode(group.children[idx], group, idx));
      childrenDiv.appendChild(childWrapper);
    })(i);
  }

  div.appendChild(childrenDiv);
  return div;
}

function renderTextSearchNode(node, parent, idx) {
  var row = document.createElement('div');
  row.className = 'expr-leaf expr-text-search';
  row.style.borderLeftColor = node.color;

  var hlLabel = document.createElement('label');
  hlLabel.className = 'search-highlight-label';
  var hlCb = document.createElement('input');
  hlCb.type = 'checkbox';
  hlCb.checked = node.highlightOnly;
  hlLabel.appendChild(hlCb);
  hlLabel.appendChild(document.createTextNode(' HL'));

  var colorBtn = document.createElement('button');
  colorBtn.className = 'search-color-btn';
  colorBtn.style.backgroundColor = node.color;

  var scopeSel = createSelect([
    { v: 'all', l: 'Req & Resp' }, { v: 'request', l: 'Request' },
    { v: 'response', l: 'Response' }, { v: 'url', l: 'URLs' }
  ], node.scope);

  var partSel = createSelect([
    { v: 'all', l: 'Hdrs & Bodies' }, { v: 'headers', l: 'Headers' }, { v: 'bodies', l: 'Bodies' }
  ], node.part);

  var modeSel = createSelect([
    { v: 'text', l: 'Text' }, { v: 'case', l: 'Case' }, { v: 'regex', l: 'Regex' }
  ], node.mode);

  var input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Search text...';
  input.value = node.text || '';

  var removeBtn = document.createElement('button');
  removeBtn.className = 'expr-remove-btn';
  removeBtn.textContent = '×';

  hlCb.addEventListener('change', function () { node.highlightOnly = hlCb.checked; applyFilters(); });

  colorBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var existing = row.querySelector('.search-color-picker');
    if (existing) { existing.remove(); return; }
    var picker = document.createElement('div');
    picker.className = 'search-color-picker';
    var used = getUsedColors();
    for (var c = 0; c < SEARCH_COLORS.length; c++) {
      if (used[SEARCH_COLORS[c]] && SEARCH_COLORS[c] !== node.color) continue;
      (function (color) {
        var sw = document.createElement('button');
        sw.className = 'search-color-option';
        sw.style.backgroundColor = color;
        sw.addEventListener('click', function (ev) {
          ev.stopPropagation();
          node.color = color;
          colorBtn.style.backgroundColor = color;
          row.style.borderLeftColor = color;
          picker.remove();
          applyFilters();
        });
        picker.appendChild(sw);
      })(SEARCH_COLORS[c]);
    }
    colorBtn.appendChild(picker);
  });

  scopeSel.addEventListener('change', function () { node.scope = scopeSel.value; applyFilters(); });
  partSel.addEventListener('change', function () { node.part = partSel.value; applyFilters(); });
  modeSel.addEventListener('change', function () { node.mode = modeSel.value; applyFilters(); });
  input.addEventListener('input', function () { node.text = input.value; applyFilters(); });
  removeBtn.addEventListener('click', function () { parent.children.splice(idx, 1); renderExpressionTree(); applyFilters(); });

  row.appendChild(hlLabel);
  row.appendChild(colorBtn);
  row.appendChild(scopeSel);
  row.appendChild(partSel);
  row.appendChild(modeSel);
  row.appendChild(input);
  row.appendChild(removeBtn);
  return row;
}

function renderPropertyFilterNode(node, parent, idx) {
  if (node.exclude === undefined) node.exclude = true;
  var row = document.createElement('div');
  row.className = 'expr-leaf expr-property-filter';
  if (node.exclude) row.classList.add('expr-exclude');

  var excBtn = document.createElement('button');
  excBtn.className = 'expr-exc-btn';
  excBtn.textContent = node.exclude ? 'EXC' : 'INC';
  excBtn.title = node.exclude ? 'Exclude matching (click to toggle)' : 'Include matching (click to toggle)';
  if (node.exclude) excBtn.classList.add('is-exclude');
  excBtn.addEventListener('click', function () {
    node.exclude = !node.exclude;
    excBtn.textContent = node.exclude ? 'EXC' : 'INC';
    excBtn.title = node.exclude ? 'Exclude matching' : 'Include matching';
    if (node.exclude) { excBtn.classList.add('is-exclude'); row.classList.add('expr-exclude'); }
    else { excBtn.classList.remove('is-exclude'); row.classList.remove('expr-exclude'); }
    applyFilters();
  });

  var fieldSel = document.createElement('select');
  for (var f = 0; f < FILTER_FIELDS.length; f++) {
    var opt = document.createElement('option');
    opt.value = FILTER_FIELDS[f].value;
    opt.textContent = FILTER_FIELDS[f].label;
    if (node.field === FILTER_FIELDS[f].value) opt.selected = true;
    fieldSel.appendChild(opt);
  }

  var opSel = document.createElement('select');
  var ops = FILTER_OPERATORS[node.field] || ['contains'];
  for (var o = 0; o < ops.length; o++) {
    var opt = document.createElement('option');
    opt.value = ops[o];
    opt.textContent = ops[o];
    if (node.operator === ops[o]) opt.selected = true;
    opSel.appendChild(opt);
  }

  var valInput = createValueInput(node);

  var removeBtn = document.createElement('button');
  removeBtn.className = 'expr-remove-btn';
  removeBtn.textContent = '×';

  fieldSel.addEventListener('change', function () {
    node.field = fieldSel.value;
    node.operator = (FILTER_OPERATORS[fieldSel.value] || ['contains'])[0];
    node.value = '';
    renderExpressionTree();
    applyFilters();
  });

  opSel.addEventListener('change', function () { node.operator = opSel.value; applyFilters(); });

  if (valInput.tagName === 'SELECT') {
    valInput.addEventListener('change', function () { node.value = valInput.value; applyFilters(); });
  } else {
    valInput.addEventListener('input', function () { node.value = valInput.value; applyFilters(); });
  }

  removeBtn.addEventListener('click', function () { parent.children.splice(idx, 1); renderExpressionTree(); applyFilters(); });

  row.appendChild(excBtn);
  row.appendChild(fieldSel);
  row.appendChild(opSel);
  row.appendChild(valInput);
  row.appendChild(removeBtn);
  return row;
}

function createSelect(options, selected) {
  var sel = document.createElement('select');
  for (var i = 0; i < options.length; i++) {
    var opt = document.createElement('option');
    opt.value = options[i].v;
    opt.textContent = options[i].l;
    if (selected === options[i].v) opt.selected = true;
    sel.appendChild(opt);
  }
  return sel;
}

function createValueInput(node) {
  if (node.field === 'resourceType') {
    var sel = document.createElement('select');
    var keys = Object.keys(RESOURCE_TYPES);
    for (var i = 0; i < keys.length; i++) {
      var opt = document.createElement('option');
      opt.value = keys[i];
      opt.textContent = RESOURCE_TYPES[keys[i]].label;
      if (node.value === keys[i]) opt.selected = true;
      sel.appendChild(opt);
    }
    return sel;
  }
  if (node.field === 'statusRange') {
    var sel = document.createElement('select');
    for (var i = 0; i < STATUS_RANGES.length; i++) {
      var opt = document.createElement('option');
      opt.value = STATUS_RANGES[i];
      opt.textContent = STATUS_RANGES[i];
      if (node.value === STATUS_RANGES[i]) opt.selected = true;
      sel.appendChild(opt);
    }
    return sel;
  }
  if (node.field === 'method') {
    var methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
    var sel = document.createElement('select');
    for (var i = 0; i < methods.length; i++) {
      var opt = document.createElement('option');
      opt.value = methods[i];
      opt.textContent = methods[i];
      if (node.value === methods[i]) opt.selected = true;
      sel.appendChild(opt);
    }
    return sel;
  }
  if (node.field === 'extension') {
    var sel = document.createElement('select');
    var blank = document.createElement('option');
    blank.value = '';
    blank.textContent = '(none)';
    sel.appendChild(blank);
    var extKeys = Object.keys(EXTENSION_FILTERS);
    for (var i = 0; i < extKeys.length; i++) {
      var opt = document.createElement('option');
      opt.value = extKeys[i];
      opt.textContent = EXTENSION_FILTERS[extKeys[i]].label;
      if (node.value === extKeys[i]) opt.selected = true;
      sel.appendChild(opt);
    }
    return sel;
  }
  var input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Value...';
  input.value = node.value || '';
  return input;
}

function isQuickFilteredExcluding(entry, excludeKey) {
  var keys = Object.keys(quickFilters);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (k === excludeKey || !quickFilters[k]) continue;
    if (RESOURCE_TYPES[k] && RESOURCE_TYPES[k].test(entry)) return true;
    if (EXTENSION_FILTERS[k]) {
      var ext = getExtension(entry.request.url);
      if (ext === k || (k === '.jpg' && (ext === '.jpg' || ext === '.jpeg'))) return true;
    }
  }
  return false;
}

function countQuickFilterImpact(key) {
  var count = 0;
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    if (isQuickFilteredExcluding(entry, key)) continue;
    if (!evaluateExpression(entry, expressionTree)) continue;
    if (RESOURCE_TYPES[key] && RESOURCE_TYPES[key].test(entry)) count++;
    if (EXTENSION_FILTERS[key]) {
      var ext = getExtension(entry.request.url);
      if (ext === key || (key === '.jpg' && (ext === '.jpg' || ext === '.jpeg'))) count++;
    }
  }
  return count;
}

function renderQuickFilters() {
  var container = document.getElementById('quick-filter-buttons');
  container.innerHTML = '';
  var allKeys = Object.keys(RESOURCE_TYPES).concat(Object.keys(EXTENSION_FILTERS));
  for (var i = 0; i < allKeys.length; i++) {
    (function (key) {
      var count = countQuickFilterImpact(key);
      if (count === 0 && !quickFilters[key]) return;
      var btn = document.createElement('button');
      btn.className = 'quick-filter-btn';
      if (quickFilters[key]) btn.className += ' active';
      var label = RESOURCE_TYPES[key] ? RESOURCE_TYPES[key].label : EXTENSION_FILTERS[key].label;
      btn.innerHTML = label + ' <span class="qf-count">(' + count + ')</span>';
      btn.addEventListener('click', function () {
        quickFilters[key] = !quickFilters[key];
        applyFilters();
        renderQuickFilters();
      });
      container.appendChild(btn);
    })(allKeys[i]);
  }
}

var TAG_TYPES = ['html', 'resp-json', 'req-json', 'payload', 'query'];
var TAG_CSS_MAP = { 'html': 'tag-html', 'resp-json': 'tag-json', 'req-json': 'tag-json', 'payload': 'tag-payload', 'query': 'tag-query' };

function renderTagFilters() {
  var container = document.getElementById('tag-filter-buttons');
  container.innerHTML = '';
  for (var i = 0; i < TAG_TYPES.length; i++) {
    (function (tag) {
      var btn = document.createElement('button');
      btn.className = 'tag-filter-btn';
      if (tagFilters[tag]) btn.className += ' active';
      var tagCls = TAG_CSS_MAP[tag] || '';
      btn.innerHTML = '<span class="entry-tag ' + tagCls + '">' + tag + '</span>';
      btn.addEventListener('click', function () {
        tagFilters[tag] = !tagFilters[tag];
        saveState();
        applyFilters();
        renderTagFilters();
        renderQuickFilters();
      });
      container.appendChild(btn);
    })(TAG_TYPES[i]);
  }
}

function renderPresetFilters() {
  var container = document.getElementById('preset-filter-buttons');
  container.innerHTML = '';
  for (var i = 0; i < PRESETS.length; i++) {
    (function (preset) {
      var btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.textContent = preset.label;
      btn.addEventListener('click', function () {
        if (preset.keys.length === 0) {
          var keys = Object.keys(quickFilters);
          for (var j = 0; j < keys.length; j++) quickFilters[keys[j]] = false;
        } else {
          for (var j = 0; j < preset.keys.length; j++) quickFilters[preset.keys[j]] = true;
        }
        renderQuickFilters();
        applyFilters();
      });
      container.appendChild(btn);
    })(PRESETS[i]);
  }
}

function getSortValue(entry, col) {
  if (col === 'index') return entry._origIndex;
  if (col === 'method') return entry.request.method;
  if (col === 'status') return entry.response.status;
  if (col === 'type') return classifyEntry(entry);
  if (col === 'mime') return entry.response.content.mimeType || '';
  if (col === 'size') return getEntrySize(entry);
  if (col === 'time') return getEntryTime(entry);
  if (col === 'url') return entry.request.url;
  return 0;
}

function sortEntries() {
  if (!sortColumn) return;
  entries.sort(function (a, b) {
    var va = getSortValue(a, sortColumn);
    var vb = getSortValue(b, sortColumn);
    var result = 0;
    if (typeof va === 'number' && typeof vb === 'number') result = va - vb;
    else result = String(va).localeCompare(String(vb));
    return sortDirection === 'asc' ? result : -result;
  });
}

function updateSortIndicators() {
  var ths = document.querySelectorAll('#request-table th[data-sort]');
  for (var i = 0; i < ths.length; i++) {
    var arrow = ths[i].querySelector('.sort-arrow');
    if (arrow) arrow.remove();
    if (ths[i].dataset.sort === sortColumn) {
      var span = document.createElement('span');
      span.className = 'sort-arrow';
      span.textContent = sortDirection === 'asc' ? ' ▲' : ' ▼';
      ths[i].appendChild(span);
    }
  }
}

function renderRequestTable() {
  sortEntries();
  var tbody = document.getElementById('request-tbody');
  tbody.innerHTML = '';
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    var tr = document.createElement('tr');
    tr.dataset.index = i;
    var visible = isEntryVisible(entry);
    if (!visible) tr.className = 'hidden-row';
    var method = entry.request.method;
    var status = entry.response.status;
    var type = classifyEntry(entry);
    var mime = entry.response.content.mimeType || '';
    var size = getEntrySize(entry);
    var time = getEntryTime(entry);
    var url = entry.request.url;
    var statusClass = 'status-0';
    if (status >= 200 && status < 300) statusClass = 'status-2xx';
    else if (status >= 300 && status < 400) statusClass = 'status-3xx';
    else if (status >= 400 && status < 500) statusClass = 'status-4xx';
    else if (status >= 500) statusClass = 'status-5xx';
    var shortUrl = url;
    try {
      var urlObj = new URL(url);
      shortUrl = urlObj.pathname + urlObj.search;
      if (shortUrl.length > 120) shortUrl = shortUrl.substring(0, 120) + '...';
    } catch (e) {}
    var tags = getEntryTags(entry);
    tr.innerHTML =
      '<td class="col-check"><input type="checkbox" data-idx="' + i + '"' + (entry._checked ? ' checked' : '') + '></td>' +
      '<td class="col-index">' + (i + 1) + '</td>' +
      '<td class="col-method method-' + method + '">' + method + '</td>' +
      '<td class="col-status ' + statusClass + '">' + status + '</td>' +
      '<td class="col-type">' + type + '</td>' +
      '<td class="col-mime">' + mime + '</td>' +
      '<td class="col-size" style="text-align:right">' + formatSize(size) + '</td>' +
      '<td class="col-time" style="text-align:right">' + time + ' ms</td>' +
      '<td class="col-tags">' + renderTags(tags) + '</td>' +
      '<td class="col-actions"><button class="copy-url-btn" data-url="' + url.replace(/"/g, '&quot;') + '" title="Copy URL">📋</button></td>' +
      '<td class="col-url url-cell" data-idx="' + i + '" title="Click to inspect">' + shortUrl + '</td>';
    if (entry._checked) tr.classList.add('checked-row');
    tbody.appendChild(tr);
  }
  attachCheckboxListeners();
  attachUrlCopyListeners();
  attachInspectListeners();
  updateCounts();
}

function attachCheckboxListeners() {
  var cbs = document.querySelectorAll('#request-tbody input[type="checkbox"]');
  for (var i = 0; i < cbs.length; i++) {
    cbs[i].addEventListener('change', function () {
      var idx = parseInt(this.dataset.idx);
      entries[idx]._checked = this.checked;
      var row = this.closest('tr');
      if (this.checked) row.classList.add('checked-row');
      else row.classList.remove('checked-row');
      updateCounts();
    });
  }
}

function attachUrlCopyListeners() {
  var btns = document.querySelectorAll('#request-tbody .copy-url-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function (e) {
      e.stopPropagation();
      var url = this.dataset.url;
      navigator.clipboard.writeText(url).then(function () {
        var toast = document.getElementById('copy-toast');
        toast.style.display = 'block';
        setTimeout(function () { toast.style.display = 'none'; }, 1500);
      });
    });
  }
}

function attachInspectListeners() {
  var cells = document.querySelectorAll('#request-tbody .url-cell');
  for (var i = 0; i < cells.length; i++) {
    cells[i].addEventListener('click', function () {
      openInspectWindow(parseInt(this.dataset.idx));
    });
  }
}

function applyFilters() {
  saveState();
  var rows = document.querySelectorAll('#request-tbody tr');
  for (var i = 0; i < rows.length; i++) {
    var idx = parseInt(rows[i].dataset.index);
    var entry = entries[idx];
    var visible = isEntryVisible(entry);
    if (visible) rows[i].classList.remove('hidden-row');
    else rows[i].classList.add('hidden-row');
    var hlColors = getTextSearchHighlightColor(entry);
    if (hlColors.length > 0 && visible) {
      rows[i].style.borderLeft = '4px solid ' + hlColors[0];
      rows[i].style.backgroundColor = hlColors[0] + '20';
    } else {
      rows[i].style.borderLeft = '';
      rows[i].style.backgroundColor = '';
    }
  }
  updateCounts();
}

function updateCounts() {
  var rows = document.querySelectorAll('#request-tbody tr');
  var visibleCount = 0, checkedCount = 0;
  for (var i = 0; i < rows.length; i++) {
    if (!rows[i].classList.contains('hidden-row')) visibleCount++;
    var idx = parseInt(rows[i].dataset.index);
    if (entries[idx] && entries[idx]._checked) checkedCount++;
  }
  document.getElementById('visible-count').textContent = visibleCount;
  document.getElementById('total-count').textContent = entries.length;
  document.getElementById('checked-count').textContent = checkedCount;
}

function selectAllVisible() {
  var rows = document.querySelectorAll('#request-tbody tr');
  for (var i = 0; i < rows.length; i++) {
    if (!rows[i].classList.contains('hidden-row')) {
      var idx = parseInt(rows[i].dataset.index);
      entries[idx]._checked = true;
      var cb = rows[i].querySelector('input[type="checkbox"]');
      if (cb) cb.checked = true;
      rows[i].classList.add('checked-row');
    }
  }
  updateCounts();
}

function deselectAll() {
  for (var i = 0; i < entries.length; i++) entries[i]._checked = false;
  var cbs = document.querySelectorAll('#request-tbody input[type="checkbox"]');
  for (var i = 0; i < cbs.length; i++) cbs[i].checked = false;
  var rows = document.querySelectorAll('#request-tbody tr');
  for (var i = 0; i < rows.length; i++) rows[i].classList.remove('checked-row');
  updateCounts();
}

function collectUniqueHeaders() {
  var reqHeaders = {};
  var respHeaders = {};
  for (var i = 0; i < entries.length; i++) {
    if (!isEntryVisible(entries[i])) continue;
    var rqh = entries[i].request.headers;
    if (rqh) {
      for (var j = 0; j < rqh.length; j++) {
        var name = rqh[j].name.toLowerCase();
        reqHeaders[name] = rqh[j].name;
      }
    }
    var rsh = entries[i].response.headers;
    if (rsh) {
      for (var j = 0; j < rsh.length; j++) {
        var name = rsh[j].name.toLowerCase();
        respHeaders[name] = rsh[j].name;
      }
    }
  }
  return { request: reqHeaders, response: respHeaders };
}

function isNoiseHeader(key) {
  if (exportSettings.disabledNoiseHeaders[key]) return false;
  return BUILTIN_NOISE_HEADERS.indexOf(key) !== -1 || exportSettings.userNoiseHeaders[key] === true;
}

function getTopHeaderValues(headerName, type) {
  var counts = {};
  for (var i = 0; i < entries.length; i++) {
    if (!isEntryVisible(entries[i])) continue;
    var headers = type === 'request' ? entries[i].request.headers : entries[i].response.headers;
    if (!headers) continue;
    for (var j = 0; j < headers.length; j++) {
      if (headers[j].name.toLowerCase() === headerName) {
        var val = headers[j].value || '';
        if (val.length > 80) val = val.substring(0, 80) + '...';
        counts[val] = (counts[val] || 0) + 1;
      }
    }
  }
  var sorted = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
  var top = [];
  for (var i = 0; i < Math.min(5, sorted.length); i++) {
    top.push({ value: sorted[i], count: counts[sorted[i]] });
  }
  return top;
}

function renderHeaderRow(key, displayName, isNoise, includedMap, type, container) {
  var row = document.createElement('div');
  row.className = 'exp-header-row';

  var cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = includedMap[key];
  cb.dataset.headerKey = key;
  cb.addEventListener('change', function () {
    includedMap[this.dataset.headerKey] = this.checked;
    saveState();
    updateHeaderCounts();
  });
  row.appendChild(cb);

  var nameSpan = document.createElement('span');
  nameSpan.className = 'exp-header-name';
  nameSpan.textContent = ' ' + displayName;
  if (isNoise) nameSpan.textContent += ' (noise)';
  row.appendChild(nameSpan);

  var infoBtn = document.createElement('span');
  infoBtn.className = 'exp-header-info';
  infoBtn.textContent = '?';
  infoBtn.title = 'Top values';
  infoBtn.dataset.headerKey = key;
  infoBtn.dataset.headerType = type;
  infoBtn.addEventListener('mouseenter', function (e) {
    var existing = document.querySelector('.exp-header-popup');
    if (existing) existing.remove();
    var top = getTopHeaderValues(this.dataset.headerKey, this.dataset.headerType);
    if (top.length === 0) return;
    var popup = document.createElement('div');
    popup.className = 'exp-header-popup';
    for (var t = 0; t < top.length; t++) {
      var line = document.createElement('div');
      line.className = 'exp-header-popup-line';
      line.textContent = top[t].value + ' (' + top[t].count + ')';
      popup.appendChild(line);
    }
    document.body.appendChild(popup);
    var rect = this.getBoundingClientRect();
    var popupW = popup.offsetWidth;
    var popupH = popup.offsetHeight;
    var leftPos = rect.left - popupW - 8;
    if (leftPos < 0) leftPos = rect.right + 8;
    var topPos = rect.top;
    if (topPos + popupH > window.innerHeight) {
      topPos = window.innerHeight - popupH - 4;
    }
    popup.style.left = leftPos + 'px';
    popup.style.top = topPos + 'px';
  });
  infoBtn.addEventListener('mouseleave', function () {
    var popup = document.querySelector('.exp-header-popup');
    if (popup) popup.remove();
  });
  row.appendChild(infoBtn);

  var addNoiseBtn = document.createElement('span');
  addNoiseBtn.className = 'exp-header-add-noise';
  addNoiseBtn.textContent = '+';
  addNoiseBtn.title = 'Move to noise';
  addNoiseBtn.dataset.headerKey = key;
  addNoiseBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var hk = this.dataset.headerKey;
    if (BUILTIN_NOISE_HEADERS.indexOf(hk) === -1) {
      exportSettings.userNoiseHeaders[hk] = true;
    }
    delete exportSettings.disabledNoiseHeaders[hk];
    saveState();
    renderHeaderCheckboxes();
  });
  row.appendChild(addNoiseBtn);

  container.appendChild(row);
}

function updateHeaderCounts() {
  var unique = collectUniqueHeaders();
  var reqKeys = Object.keys(unique.request);
  var reqTotal = 0;
  var reqIncluded = 0;
  for (var i = 0; i < reqKeys.length; i++) {
    var key = reqKeys[i];
    if (exportSettings.hideNoiseReq && isNoiseHeader(key)) continue;
    reqTotal++;
    if (exportSettings.includedRequestHeaders[key] !== false) reqIncluded++;
  }
  var respKeys = Object.keys(unique.response);
  var respTotal = 0;
  var respIncluded = 0;
  for (var i = 0; i < respKeys.length; i++) {
    var key = respKeys[i];
    if (exportSettings.hideNoiseResp && isNoiseHeader(key)) continue;
    respTotal++;
    if (exportSettings.includedResponseHeaders[key] !== false) respIncluded++;
  }
  var reqCountEl = document.getElementById('exp-req-headers-count');
  if (reqCountEl) reqCountEl.textContent = '(' + reqIncluded + '/' + reqTotal + ')';
  var respCountEl = document.getElementById('exp-resp-headers-count');
  if (respCountEl) respCountEl.textContent = '(' + respIncluded + '/' + respTotal + ')';
}

function renderHeaderCheckboxes() {
  var unique = collectUniqueHeaders();
  var filterText = '';
  var filterInput = document.getElementById('exp-header-filter');
  if (filterInput) filterText = filterInput.value.toLowerCase().trim();

  var reqContainer = document.getElementById('exp-req-headers-list');
  var respContainer = document.getElementById('exp-resp-headers-list');
  reqContainer.innerHTML = '';
  respContainer.innerHTML = '';

  var reqKeys = Object.keys(unique.request).sort();
  var reqTotal = 0;
  var reqIncluded = 0;
  for (var i = 0; i < reqKeys.length; i++) {
    var key = reqKeys[i];
    var displayName = unique.request[key];
    var isNoise = isNoiseHeader(key);
    if (exportSettings.includedRequestHeaders[key] === undefined) {
      exportSettings.includedRequestHeaders[key] = true;
    }
    if (exportSettings.hideNoiseReq && isNoise) {
      exportSettings.includedRequestHeaders[key] = false;
      continue;
    }
    reqTotal++;
    if (exportSettings.includedRequestHeaders[key]) reqIncluded++;
    if (filterText && key.indexOf(filterText) === -1 && displayName.toLowerCase().indexOf(filterText) === -1) continue;
    renderHeaderRow(key, displayName, isNoise, exportSettings.includedRequestHeaders, 'request', reqContainer);
  }

  var respKeys = Object.keys(unique.response).sort();
  var respTotal = 0;
  var respIncluded = 0;
  for (var i = 0; i < respKeys.length; i++) {
    var key = respKeys[i];
    var displayName = unique.response[key];
    var isNoise = isNoiseHeader(key);
    if (exportSettings.includedResponseHeaders[key] === undefined) {
      exportSettings.includedResponseHeaders[key] = true;
    }
    if (exportSettings.hideNoiseResp && isNoise) {
      exportSettings.includedResponseHeaders[key] = false;
      continue;
    }
    respTotal++;
    if (exportSettings.includedResponseHeaders[key]) respIncluded++;
    if (filterText && key.indexOf(filterText) === -1 && displayName.toLowerCase().indexOf(filterText) === -1) continue;
    renderHeaderRow(key, displayName, isNoise, exportSettings.includedResponseHeaders, 'response', respContainer);
  }

  var reqCountEl = document.getElementById('exp-req-headers-count');
  if (reqCountEl) reqCountEl.textContent = '(' + reqIncluded + '/' + reqTotal + ')';
  var respCountEl = document.getElementById('exp-resp-headers-count');
  if (respCountEl) respCountEl.textContent = '(' + respIncluded + '/' + respTotal + ')';
}

function openNoiseManager() {
  var overlay = document.getElementById('noise-modal-overlay');
  overlay.classList.remove('hidden');
  var filterInput = document.getElementById('noise-filter-input');
  if (filterInput) filterInput.value = '';
  renderNoiseList();
}

function closeNoiseManager() {
  document.getElementById('noise-modal-overlay').classList.add('hidden');
}

function renderNoiseList() {
  var container = document.getElementById('noise-list');
  container.innerHTML = '';

  var filterText = '';
  var filterInput = document.getElementById('noise-filter-input');
  if (filterInput) filterText = filterInput.value.toLowerCase().trim();

  var allNoise = {};
  for (var i = 0; i < BUILTIN_NOISE_HEADERS.length; i++) {
    allNoise[BUILTIN_NOISE_HEADERS[i]] = 'builtin';
  }
  var userKeys = Object.keys(exportSettings.userNoiseHeaders);
  for (var i = 0; i < userKeys.length; i++) {
    if (exportSettings.userNoiseHeaders[userKeys[i]]) {
      allNoise[userKeys[i]] = 'user';
    }
  }

  var sorted = Object.keys(allNoise).sort();
  for (var i = 0; i < sorted.length; i++) {
    if (filterText && sorted[i].indexOf(filterText) === -1) continue;
    (function (key) {
      var source = allNoise[key];
      var row = document.createElement('div');
      row.className = 'noise-row';

      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !exportSettings.disabledNoiseHeaders[key];
      cb.addEventListener('change', function () {
        if (this.checked) {
          delete exportSettings.disabledNoiseHeaders[key];
        } else {
          exportSettings.disabledNoiseHeaders[key] = true;
        }
        saveState();
      });

      var nameSpan = document.createElement('span');
      nameSpan.className = 'noise-name';
      nameSpan.textContent = key;

      var sourceSpan = document.createElement('span');
      sourceSpan.className = source === 'builtin' ? 'noise-source-builtin' : 'noise-source-user';
      sourceSpan.textContent = source === 'builtin' ? 'built-in' : 'custom';

      row.appendChild(cb);
      row.appendChild(nameSpan);
      row.appendChild(sourceSpan);

      if (source === 'user') {
        var removeBtn = document.createElement('button');
        removeBtn.className = 'noise-remove-btn';
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', function () {
          delete exportSettings.userNoiseHeaders[key];
          delete exportSettings.disabledNoiseHeaders[key];
          saveState();
          renderNoiseList();
        });
        row.appendChild(removeBtn);
      }

      container.appendChild(row);
    })(sorted[i]);
  }
}

function addUserNoise() {
  var input = document.getElementById('noise-add-input');
  var val = input.value.trim().toLowerCase();
  if (!val) return;
  if (BUILTIN_NOISE_HEADERS.indexOf(val) !== -1) {
    input.value = '';
    return;
  }
  exportSettings.userNoiseHeaders[val] = true;
  saveState();
  input.value = '';
  renderNoiseList();
}

function filterHeaders(headers, includedMap) {
  var result = [];
  for (var i = 0; i < headers.length; i++) {
    var key = headers[i].name.toLowerCase();
    if (includedMap[key] !== false) result.push(headers[i]);
  }
  return result;
}

function applyExportSettings(entry) {
  entry.request.headers = filterHeaders(entry.request.headers || [], exportSettings.includedRequestHeaders);
  entry.response.headers = filterHeaders(entry.response.headers || [], exportSettings.includedResponseHeaders);
  if (!exportSettings.requestBody) delete entry.request.postData;
  if (!exportSettings.requestCookies) entry.request.cookies = [];
  if (!exportSettings.responseBody) { entry.response.content.text = ''; entry.response.content.size = 0; }
  if (!exportSettings.responseCookies) entry.response.cookies = [];
  if (!exportSettings.timings) delete entry.timings;
  if (!exportSettings.serverIp) delete entry.serverIPAddress;
  if (!exportSettings.queryString) entry.request.queryString = [];
  return entry;
}

function createFilteredHar() {
  var selected = [];
  for (var i = 0; i < entries.length; i++) {
    if (entries[i]._checked && isEntryVisible(entries[i])) {
      selected.push(entries[i]);
    }
  }
  if (exportSettings.useOriginalOrder) {
    selected.sort(function (a, b) { return a._origIndex - b._origIndex; });
  }
  var checked = [];
  for (var i = 0; i < selected.length; i++) {
    var clean = JSON.parse(JSON.stringify(selected[i]));
    delete clean._checked;
    delete clean._origIndex;
    applyExportSettings(clean);
    checked.push(clean);
  }
  if (checked.length === 0) { setStatus('No entries selected.'); return; }
  setStatus('Creating filtered HAR with ' + checked.length + ' entries...');
  fetch('/api/create-har', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries: checked })
  })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.success) setStatus('Saved: ' + d.path + ' (' + d.count + ' entries)');
      else setStatus('Error: ' + d.error);
    })
    .catch(function (e) { setStatus('Error: ' + e.message); });
}

function decodeResponseBody(content) {
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

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function openInspectWindow(idx) {
  var origIdx = entries[idx]._origIndex;
  window.open('/inspect?idx=' + origIdx, '_blank');
}

function setStatus(msg) {
  document.getElementById('status-bar').textContent = msg;
}

function loadHar() {
  setStatus('Loading HAR file...');
  fetch('/api/har')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.error) { setStatus('Error: ' + data.error); return; }
      harData = data;
      entries = data.log.entries || [];
      for (var i = 0; i < entries.length; i++) {
        entries[i]._checked = true;
        entries[i]._origIndex = i;
      }
      document.getElementById('har-info').textContent =
        'Version: ' + (data.log.version || '?') +
        ' | Browser: ' + ((data.log.browser && data.log.browser.name) || '?') +
        ' | Entries: ' + entries.length;
      renderExpressionTree();
      renderPresetFilters();
      renderQuickFilters();
      renderTagFilters();
      updateSortIndicators();
      renderRequestTable();
      setStatus('Loaded ' + entries.length + ' entries');
    })
    .catch(function (e) { setStatus('Failed: ' + e.message); });
}

document.getElementById('select-all-btn').addEventListener('click', selectAllVisible);
document.getElementById('deselect-all-btn').addEventListener('click', deselectAll);
document.getElementById('create-har-btn').addEventListener('click', createFilteredHar);
document.getElementById('master-checkbox').addEventListener('change', function () {
  if (this.checked) selectAllVisible();
  else deselectAll();
});

var EXPORT_SIMPLE_MAP = {
  'exp-original-order': 'useOriginalOrder',
  'exp-req-body': 'requestBody',
  'exp-req-cookies': 'requestCookies',
  'exp-resp-body': 'responseBody',
  'exp-resp-cookies': 'responseCookies',
  'exp-timings': 'timings',
  'exp-server-ip': 'serverIp',
  'exp-query-string': 'queryString'
};

function syncExportSettingsUI() {
  var keys = Object.keys(EXPORT_SIMPLE_MAP);
  for (var i = 0; i < keys.length; i++) {
    var cb = document.getElementById(keys[i]);
    if (cb) cb.checked = exportSettings[EXPORT_SIMPLE_MAP[keys[i]]];
  }
  var hdReq = document.getElementById('exp-hide-noise-req');
  if (hdReq) hdReq.checked = exportSettings.hideNoiseReq;
  var hdResp = document.getElementById('exp-hide-noise-resp');
  if (hdResp) hdResp.checked = exportSettings.hideNoiseResp;
  var gsNoise = document.getElementById('gs-use-noise-inspect');
  if (gsNoise) gsNoise.checked = globalSettings.useNoiseInspect;
  renderHeaderCheckboxes();
}

document.getElementById('export-settings-btn').addEventListener('click', function () {
  var overlay = document.getElementById('export-modal-overlay');
  overlay.classList.remove('hidden');
  var filterInput = document.getElementById('exp-header-filter');
  if (filterInput) filterInput.value = '';
  renderHeaderCheckboxes();
});

document.getElementById('export-modal-close').addEventListener('click', function () {
  document.getElementById('export-modal-overlay').classList.add('hidden');
});

document.getElementById('exp-header-filter').addEventListener('input', function () {
  renderHeaderCheckboxes();
});

document.getElementById('export-modal-overlay').addEventListener('click', function (e) {
  if (e.target === this) this.classList.add('hidden');
});

document.getElementById('export-settings-panel').addEventListener('click', function (e) {
  e.stopPropagation();
});

var sectionHeaders = document.querySelectorAll('.exp-section-header');
for (var sh = 0; sh < sectionHeaders.length; sh++) {
  sectionHeaders[sh].addEventListener('click', function (e) {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return;
    var targetId = this.dataset.target;
    var list = document.getElementById(targetId);
    if (list) {
      list.classList.toggle('collapsed');
      var arrow = this.querySelector('.exp-arrow');
      if (arrow) arrow.textContent = list.classList.contains('collapsed') ? '▶' : '▼';
    }
  });
}

var selAllBtns = document.querySelectorAll('.exp-sel-all');
for (var sa = 0; sa < selAllBtns.length; sa++) {
  selAllBtns[sa].addEventListener('click', function (e) {
    e.stopPropagation();
    var group = this.dataset.group;
    var map = group === 'req-headers' ? exportSettings.includedRequestHeaders : exportSettings.includedResponseHeaders;
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i++) map[keys[i]] = true;
    saveState();
    renderHeaderCheckboxes();
  });
}

var selNoneBtns = document.querySelectorAll('.exp-sel-none');
for (var sn = 0; sn < selNoneBtns.length; sn++) {
  selNoneBtns[sn].addEventListener('click', function (e) {
    e.stopPropagation();
    var group = this.dataset.group;
    var map = group === 'req-headers' ? exportSettings.includedRequestHeaders : exportSettings.includedResponseHeaders;
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i++) map[keys[i]] = false;
    saveState();
    renderHeaderCheckboxes();
  });
}

var expSimpleKeys = Object.keys(EXPORT_SIMPLE_MAP);
for (var ei = 0; ei < expSimpleKeys.length; ei++) {
  (function (id, key) {
    var cb = document.getElementById(id);
    if (cb) {
      cb.addEventListener('change', function () {
        exportSettings[key] = cb.checked;
        saveState();
      });
    }
  })(expSimpleKeys[ei], EXPORT_SIMPLE_MAP[expSimpleKeys[ei]]);
}

document.getElementById('exp-hide-noise-req').addEventListener('change', function () {
  exportSettings.hideNoiseReq = this.checked;
  saveState();
  renderHeaderCheckboxes();
});

document.getElementById('exp-hide-noise-resp').addEventListener('change', function () {
  exportSettings.hideNoiseResp = this.checked;
  saveState();
  renderHeaderCheckboxes();
});

document.getElementById('manage-noise-btn').addEventListener('click', function () {
  openNoiseManager();
});

document.getElementById('noise-modal-close').addEventListener('click', function () {
  closeNoiseManager();
  renderHeaderCheckboxes();
});

document.getElementById('noise-modal-overlay').addEventListener('click', function (e) {
  if (e.target === this) {
    closeNoiseManager();
    renderHeaderCheckboxes();
  }
});

document.getElementById('noise-filter-input').addEventListener('input', function () {
  renderNoiseList();
});

document.getElementById('noise-add-btn').addEventListener('click', addUserNoise);
document.getElementById('noise-add-input').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') addUserNoise();
});

document.getElementById('clear-storage-btn').addEventListener('click', function () {
  var modal = document.getElementById('clear-storage-modal');
  var container = document.getElementById('clear-storage-keys');
  container.innerHTML = '';
  try {
    var raw = localStorage.getItem('har-helper-state');
    if (raw) {
      var state = JSON.parse(raw);
      var keys = Object.keys(state);
      for (var i = 0; i < keys.length; i++) {
        var label = document.createElement('label');
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = true;
        cb.dataset.stateKey = keys[i];
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + keys[i]));
        container.appendChild(label);
      }
    }
  } catch (e) {}
  modal.classList.remove('hidden');
});

document.getElementById('clear-storage-close').addEventListener('click', function () {
  document.getElementById('clear-storage-modal').classList.add('hidden');
});

document.getElementById('clear-storage-cancel').addEventListener('click', function () {
  document.getElementById('clear-storage-modal').classList.add('hidden');
});

document.getElementById('clear-storage-modal').addEventListener('click', function (e) {
  if (e.target === this) this.classList.add('hidden');
});

document.getElementById('clear-storage-confirm').addEventListener('click', function () {
  try {
    var raw = localStorage.getItem('har-helper-state');
    if (raw) {
      var state = JSON.parse(raw);
      var cbs = document.querySelectorAll('#clear-storage-keys input[type="checkbox"]');
      for (var i = 0; i < cbs.length; i++) {
        if (cbs[i].checked) delete state[cbs[i].dataset.stateKey];
      }
      if (Object.keys(state).length === 0) {
        localStorage.removeItem('har-helper-state');
      } else {
        localStorage.setItem('har-helper-state', JSON.stringify(state));
      }
    }
  } catch (e) {}
  document.getElementById('clear-storage-modal').classList.add('hidden');
  location.reload();
});

document.addEventListener('click', function () {
  var pickers = document.querySelectorAll('.search-color-picker');
  for (var i = 0; i < pickers.length; i++) pickers[i].remove();
});

var sortHeaders = document.querySelectorAll('#request-table th[data-sort]');
for (var si = 0; si < sortHeaders.length; si++) {
  sortHeaders[si].addEventListener('click', function () {
    var col = this.dataset.sort;
    if (sortColumn === col) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = col;
      sortDirection = 'asc';
    }
    updateSortIndicators();
    saveState();
    renderRequestTable();
    applyFilters();
  });
}

document.getElementById('expression-toggle').addEventListener('click', function () {
  expressionCollapsed = !expressionCollapsed;
  applyExpressionCollapsed();
  saveState();
});

document.getElementById('global-settings-btn').addEventListener('click', function () {
  var modal = document.getElementById('global-settings-modal');
  var cb = document.getElementById('gs-use-noise-inspect');
  if (cb) cb.checked = globalSettings.useNoiseInspect;
  modal.classList.remove('hidden');
});

document.getElementById('global-settings-close').addEventListener('click', function () {
  document.getElementById('global-settings-modal').classList.add('hidden');
});

document.getElementById('global-settings-modal').addEventListener('click', function (e) {
  if (e.target === this) this.classList.add('hidden');
});

document.getElementById('gs-use-noise-inspect').addEventListener('change', function () {
  globalSettings.useNoiseInspect = this.checked;
  saveState();
  try {
    localStorage.setItem('har-helper-inspect-noise', JSON.stringify({
      hideNoiseReq: this.checked,
      hideNoiseResp: this.checked
    }));
  } catch (e) {}
});

loadState();
applyExpressionCollapsed();
syncExportSettingsUI();
loadHar();
