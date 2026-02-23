export interface HarEntry {
  _checked?: boolean;
  _origIndex?: number;
  startedDateTime?: string;
  time?: number;
  serverIPAddress?: string;
  _resourceType?: string;
  request: {
    method: string;
    url: string;
    headers: Header[];
    queryString?: QueryParam[];
    postData?: PostData;
    cookies?: Cookie[];
  };
  response: {
    status: number;
    statusText?: string;
    headers: Header[];
    content: ResponseContent;
    cookies?: Cookie[];
    bodySize?: number;
  };
  timings?: Record<string, number>;
}

export interface Header {
  name: string;
  value: string;
}

export interface QueryParam {
  name: string;
  value: string;
}

export interface PostData {
  mimeType?: string;
  text?: string;
}

export interface ResponseContent {
  size?: number;
  mimeType?: string;
  text?: string;
  encoding?: string;
}

export interface Cookie {
  name: string;
  value: string;
}

export interface HarData {
  log: {
    version?: string;
    browser?: { name?: string; version?: string };
    entries: HarEntry[];
  };
}

export interface Archive {
  id: number;
  name: string;
  file_name: string;
  entry_count: number;
  created_at: string;
}

export interface ExpressionNode {
  type: 'group' | 'text-search' | 'property-filter';
  operator?: 'and' | 'or';
  filterOperator?: string;
  children?: ExpressionNode[];
  text?: string;
  scope?: string;
  part?: string;
  mode?: string;
  highlightOnly?: boolean;
  color?: string;
  field?: string;
  value?: string;
  exclude?: boolean;
  enabled?: boolean;
}

export interface HighlightInfo {
  color: string;
  tooltip: string;
}

export interface Filters {
  id?: number;
  name?: string;
  expressionTree: ExpressionNode;
  quickFilters: Record<string, boolean>;
  tagFilters: Record<string, boolean>;
  domainFilters: Record<string, boolean>;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
}

export interface ExportSettings {
  id?: number;
  requestBody: boolean;
  requestCookies: boolean;
  responseBody: boolean;
  responseCookies: boolean;
  timings: boolean;
  serverIp: boolean;
  queryString: boolean;
  includeInitiator: boolean;
  hideNoiseReq: boolean;
  hideNoiseResp: boolean;
  useOriginalOrder: boolean;
  includedRequestHeaders: Record<string, boolean>;
  includedResponseHeaders: Record<string, boolean>;
  userNoiseHeaders: Record<string, boolean>;
  disabledNoiseHeaders: Record<string, boolean>;
  deselectedEntries: Record<number, boolean>;
  excludedResponses: Record<number, boolean>;
  minifyHtml: boolean;
  minifyJson: boolean;
  stripBase64: boolean;
  removeRequestBody?: boolean;
  removeResponseBody?: boolean;
  removeCookies?: boolean;
  removeTimings?: boolean;
  removeRequestHeaders?: boolean;
  removeResponseHeaders?: boolean;
  headersToRemove?: string[];
  removeQueryParams?: boolean;
  queryParamsToRemove?: string[];
}

export interface GlobalSettings {
  id?: number;
  useNoiseInspect: boolean;
  expressionCollapsed: boolean;
}

export interface ArchiveState {
  archive: Archive;
  harData: HarData | null;
  entries: HarEntry[];
}
