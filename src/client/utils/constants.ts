export var BUILTIN_NOISE_HEADERS = [
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

export var SEARCH_COLORS = [
  '#f9e2af', '#f38ba8', '#a6e3a1', '#89b4fa', '#cba6f7',
  '#fab387', '#94e2d5', '#74c7ec', '#eba0ac', '#a6adc8',
  '#f5c2e7', '#b4befe', '#f2cdcd', '#bac2de', '#9399b2',
  '#e6c384', '#7aa2f7', '#bb9af7', '#7dcfff', '#ff9e64'
];

export var RESOURCE_TYPES: Record<string, { label: string }> = {
  'document': { label: 'Document' },
  'xhr': { label: 'Fetch/XHR' },
  'script': { label: 'Script (JS)' },
  'stylesheet': { label: 'Stylesheet (CSS)' },
  'image': { label: 'Image' },
  'font': { label: 'Font' },
  'media': { label: 'Media' },
  'websocket': { label: 'WebSocket' },
  'manifest': { label: 'Manifest' },
  'other': { label: 'Other' }
};

export var EXTENSION_FILTERS: Record<string, { label: string }> = {
  '.png': { label: '.png' },
  '.jpg': { label: '.jpg/.jpeg' },
  '.gif': { label: '.gif' },
  '.svg': { label: '.svg' },
  '.ico': { label: '.ico' },
  '.webp': { label: '.webp' },
  '.woff': { label: '.woff' },
  '.woff2': { label: '.woff2' },
  '.ttf': { label: '.ttf' },
  '.css': { label: '.css' },
  '.js': { label: '.js' },
  '.map': { label: '.map' },
  '.json': { label: '.json' }
};

export var FILTER_FIELDS = [
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

export var FILTER_OPERATORS: Record<string, string[]> = {
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

export var STATUS_RANGES = ['1xx', '2xx', '3xx', '4xx', '5xx'];

export var PRESETS = [
  { label: '🧹 Keep only Docs & XHR', keys: ['script', 'stylesheet', 'image', 'font', 'media', 'manifest', 'other'] },
  { label: '🔄 Reset All', keys: [] as string[] }
];

export var TAG_TYPES = ['html', 'resp-json', 'req-json', 'payload', 'query', 'base64'];

export var TAG_CSS_MAP: Record<string, string> = {
  'html': 'tag-html',
  'resp-json': 'tag-json',
  'req-json': 'tag-json',
  'payload': 'tag-payload',
  'query': 'tag-query',
  'base64': 'tag-base64'
};

export var DEFAULT_EXPRESSION_TREE = {
  type: 'group' as const,
  operator: 'and' as const,
  children: []
};

export var DEFAULT_EXPORT_SETTINGS = {
  requestBody: true,
  requestCookies: true,
  responseBody: true,
  responseCookies: true,
  timings: true,
  serverIp: true,
  queryString: true,
  includeInitiator: true,
  hideNoiseReq: true,
  hideNoiseResp: true,
  useOriginalOrder: true,
  includedRequestHeaders: {} as Record<string, boolean>,
  includedResponseHeaders: {} as Record<string, boolean>,
  userNoiseHeaders: {} as Record<string, boolean>,
  disabledNoiseHeaders: {} as Record<string, boolean>,
  deselectedEntries: {} as Record<number, boolean>,
  excludedResponses: {} as Record<number, boolean>,
  minifyHtml: true,
  minifyJson: true,
  stripBase64: true
};

export var DEFAULT_GLOBAL_SETTINGS = {
  useNoiseInspect: true,
  expressionCollapsed: false
};
