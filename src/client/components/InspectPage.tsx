import { Component, For, Show, createSignal, createMemo, onMount } from 'solid-js';
import { NoiseManager } from './modals/NoiseManager';
import { BUILTIN_NOISE_HEADERS } from '../utils/constants';
import { classifyEntry, formatSize } from '../utils/harProcessor';
import { exportSettingsApi } from '../api/client';
import type { HarEntry, Header } from '../types';

interface InspectNoiseSettings {
  hideNoiseReq: boolean;
  hideNoiseResp: boolean;
  userNoiseHeaders: Record<string, boolean>;
  disabledNoiseHeaders: Record<string, boolean>;
}

async function loadExportSettingsFromDb(archiveId: number): Promise<InspectNoiseSettings> {
  try {
    var result = await exportSettingsApi.get(archiveId);
    return {
      hideNoiseReq: result.exportSettings.hideNoiseReq ?? true,
      hideNoiseResp: result.exportSettings.hideNoiseResp ?? true,
      userNoiseHeaders: result.exportSettings.userNoiseHeaders || {},
      disabledNoiseHeaders: result.exportSettings.disabledNoiseHeaders || {}
    };
  } catch (e) {
    return { hideNoiseReq: true, hideNoiseResp: true, userNoiseHeaders: {}, disabledNoiseHeaders: {} };
  }
}

async function saveNoiseSettingsToDb(archiveId: number, settings: Partial<InspectNoiseSettings>) {
  try {
    var result = await exportSettingsApi.get(archiveId);
    var exportSettings = result.exportSettings;
    if (settings.userNoiseHeaders !== undefined) exportSettings.userNoiseHeaders = settings.userNoiseHeaders;
    if (settings.disabledNoiseHeaders !== undefined) exportSettings.disabledNoiseHeaders = settings.disabledNoiseHeaders;
    if (settings.hideNoiseReq !== undefined) exportSettings.hideNoiseReq = settings.hideNoiseReq;
    if (settings.hideNoiseResp !== undefined) exportSettings.hideNoiseResp = settings.hideNoiseResp;
    await exportSettingsApi.save(archiveId, exportSettings);
  } catch (e) {
    console.error('Failed to save noise settings:', e);
  }
}

function isNoiseHeader(key: string, userNoiseHeaders: Record<string, boolean>, disabledNoiseHeaders: Record<string, boolean>): boolean {
  if (disabledNoiseHeaders[key]) return false;
  return BUILTIN_NOISE_HEADERS.indexOf(key) !== -1 || userNoiseHeaders[key] === true;
}

function isBinaryMime(mime: string | undefined): boolean {
  if (!mime) return false;
  var m = mime.toLowerCase();
  var binaryPrefixes = ['image/', 'audio/', 'video/', 'font/', 'application/octet-stream',
    'application/zip', 'application/gzip', 'application/pdf', 'application/wasm',
    'application/x-protobuf', 'application/protobuf', 'application/grpc'];
  var binaryContains = ['font', 'woff', 'ttf', 'otf', 'eot', 'ogg', 'opus',
    'webm', 'mp4', 'mp3', 'flac', 'wav', 'aac', 'mpeg'];
  for (var i = 0; i < binaryPrefixes.length; i++) {
    if (m.indexOf(binaryPrefixes[i]) === 0) return true;
  }
  for (var j = 0; j < binaryContains.length; j++) {
    if (m.indexOf(binaryContains[j]) !== -1) return true;
  }
  return false;
}

function isGzipCompressed(entry: HarEntry): boolean {
  var url = entry.request.url || '';
  if (url.indexOf('compression=gzip-js') !== -1) return true;
  if (url.indexOf('compression=gzip') !== -1) return true;
  var headers = entry.request.headers || [];
  for (var i = 0; i < headers.length; i++) {
    if (headers[i].name.toLowerCase() === 'content-encoding') {
      var val = headers[i].value.toLowerCase();
      if (val.indexOf('gzip') !== -1) return true;
    }
  }
  return false;
}

async function tryDecompressGzip(uint8arr: Uint8Array): Promise<string> {
  var ds = new DecompressionStream('gzip');
  var blob = new Blob([uint8arr as any]);
  var stream = blob.stream().pipeThrough(ds);
  return new Response(stream).text();
}

async function tryDecompressDeflate(uint8arr: Uint8Array): Promise<string> {
  var ds = new DecompressionStream('deflate');
  var blob = new Blob([uint8arr as any]);
  var stream = blob.stream().pipeThrough(ds);
  return new Response(stream).text();
}

async function decodeBody(content: { text?: string; encoding?: string; mimeType?: string }, entry: HarEntry): Promise<string> {
  if (!content || !content.text) return '';

  var text = content.text;
  var isBase64 = content.encoding === 'base64';

  if (isBase64 && isBinaryMime(content.mimeType)) return text;

  if (isBase64) {
    try {
      text = atob(content.text);
    } catch (e) {
      return content.text;
    }
  }

  if (isGzipCompressed(entry)) {
    try {
      var bytes = isBase64 
        ? Uint8Array.from(atob(content.text), function(c) { return c.charCodeAt(0); })
        : new TextEncoder().encode(text);
      var decompressed: string | null = null;
      try {
        decompressed = await tryDecompressGzip(bytes);
      } catch (e1) {
        try {
          decompressed = await tryDecompressDeflate(bytes);
        } catch (e2) {
          var rawBytes = new Uint8Array(text.length);
          for (var i = 0; i < text.length; i++) rawBytes[i] = text.charCodeAt(i);
          try {
            decompressed = await tryDecompressGzip(rawBytes);
          } catch (e3) {
            try {
              decompressed = await tryDecompressDeflate(rawBytes);
            } catch (e4) {}
          }
        }
      }
      if (decompressed) return decompressed;
    } catch (e) {}
  }

  return text;
}

function tryFormatJson(text: string): string | null {
  try {
    var parsed = JSON.parse(text);
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    return null;
  }
}

interface HeaderRowProps {
  header: Header;
  isNoise: boolean;
  showNoise: boolean;
  onAddToNoise: (name: string) => void;
}

var HeaderRow: Component<HeaderRowProps> = function(props) {
  return (
    <Show when={!props.isNoise || props.showNoise}>
      <tr class={props.isNoise ? 'noise-header-row' : ''}>
        <th>
          {props.header.name}
          <Show when={!props.isNoise}>
            <button 
              class="header-add-noise" 
              title="Add to noise list"
              onClick={function() { props.onAddToNoise(props.header.name); }}
            >+</button>
          </Show>
        </th>
        <td>{props.header.value || ''}</td>
      </tr>
    </Show>
  );
};

interface HeadersTableProps {
  headers: Header[];
  type: 'request' | 'response';
  hideNoise: boolean;
  userNoiseHeaders: Record<string, boolean>;
  disabledNoiseHeaders: Record<string, boolean>;
  onAddToNoise: (name: string) => void;
}

var HeadersTable: Component<HeadersTableProps> = function(props) {
  if (!props.headers || props.headers.length === 0) {
    return <p class="empty-text">None</p>;
  }
  
  return (
    <table class="headers-table">
      <For each={props.headers}>
        {function(header) {
          var key = header.name.toLowerCase();
          var noise = isNoiseHeader(key, props.userNoiseHeaders, props.disabledNoiseHeaders);
          return (
            <HeaderRow 
              header={header}
              isNoise={noise}
              showNoise={!props.hideNoise}
              onAddToNoise={props.onAddToNoise}
            />
          );
        }}
      </For>
    </table>
  );
};

interface BodyViewProps {
  label: string;
  text: string;
  mime: string;
}

var BodyView: Component<BodyViewProps> = function(props) {
  var formatted = tryFormatJson(props.text);
  var isHtml = props.mime && (props.mime.indexOf('text/html') !== -1 || props.mime.indexOf('xhtml') !== -1);
  
  function openHtmlPreview() {
    var win = window.open('', '_blank');
    if (!win) return;
    win.document.write(props.text);
    win.document.close();
  }
  
  var displayText = props.text;
  if (displayText.length > 10000) {
    displayText = displayText.substring(0, 10000) + '\n... (truncated)';
  }
  
  return (
    <>
      <h2>
        {props.label} {formatted ? '(JSON)' : isHtml ? '(HTML)' : ''}
        <Show when={isHtml}>
          <button class="preview-btn" onClick={openHtmlPreview}>Preview HTML</button>
        </Show>
      </h2>
      <pre>{formatted || displayText}</pre>
    </>
  );
};

interface BinaryBodyViewProps {
  label: string;
  content: { text?: string; encoding?: string; mimeType?: string; size?: number };
}

var BinaryBodyView: Component<BinaryBodyViewProps> = function(props) {
  var mime = (props.content.mimeType || '').toLowerCase();
  var base64Data = props.content.encoding === 'base64' ? props.content.text : '';
  var dataUrl = base64Data ? 'data:' + mime + ';base64,' + base64Data : '';
  var size = props.content.size || 0;
  
  if (mime.indexOf('image/') === 0 && dataUrl) {
    return (
      <>
        <h2>{props.label} (Image)</h2>
        <div class="binary-info">{mime} — {formatSize(size)}</div>
        <img src={dataUrl} class="binary-image" />
      </>
    );
  }
  
  if ((mime.indexOf('audio/') === 0 || mime.indexOf('video/ogg') !== -1) && dataUrl) {
    return (
      <>
        <h2>{props.label} (Audio)</h2>
        <div class="binary-info">{mime} — {formatSize(size)}</div>
        <audio controls src={dataUrl} class="binary-audio" />
      </>
    );
  }
  
  if (mime.indexOf('video/') === 0 && dataUrl) {
    return (
      <>
        <h2>{props.label} (Video)</h2>
        <div class="binary-info">{mime} — {formatSize(size)}</div>
        <video controls src={dataUrl} class="binary-video" />
      </>
    );
  }
  
  return (
    <>
      <h2>{props.label} (Binary)</h2>
      <div class="binary-container">
        <p class="binary-info">{mime} — {formatSize(size)}</p>
        <p class="binary-text">Binary content cannot be displayed as text.</p>
        <Show when={dataUrl}>
          <p><a href={dataUrl} download="response-body" class="download-link">Download file</a></p>
        </Show>
      </div>
    </>
  );
};

export var InspectPage: Component = function() {
  var [entry, setEntry] = createSignal<HarEntry | null>(null);
  var [entryIdx, setEntryIdx] = createSignal(0);
  var [archiveId, setArchiveId] = createSignal<number | null>(null);
  var [error, setError] = createSignal<string | null>(null);
  var [loading, setLoading] = createSignal(true);
  var [hideNoiseReq, setHideNoiseReq] = createSignal(true);
  var [hideNoiseResp, setHideNoiseResp] = createSignal(true);
  var [userNoiseHeaders, setUserNoiseHeaders] = createSignal<Record<string, boolean>>({});
  var [disabledNoiseHeaders, setDisabledNoiseHeaders] = createSignal<Record<string, boolean>>({});
  var [showNoiseManager, setShowNoiseManager] = createSignal(false);
  var [decodedRequestBody, setDecodedRequestBody] = createSignal<string | null>(null);
  var [decodedResponseBody, setDecodedResponseBody] = createSignal<string | null>(null);
  
  onMount(async function() {
    var params = new URLSearchParams(window.location.search);
    var idx = parseInt(params.get('idx') || '0');
    var archiveIdParam = params.get('archiveId');
    var storedArchiveId = localStorage.getItem('har-helper-inspect-archive-id');
    var currentArchiveId = archiveIdParam ? parseInt(archiveIdParam) : (storedArchiveId ? parseInt(storedArchiveId) : null);
    
    if (currentArchiveId) {
      setArchiveId(currentArchiveId);
      var noiseSettings = await loadExportSettingsFromDb(currentArchiveId);
      setHideNoiseReq(noiseSettings.hideNoiseReq);
      setHideNoiseResp(noiseSettings.hideNoiseResp);
      setUserNoiseHeaders(noiseSettings.userNoiseHeaders);
      setDisabledNoiseHeaders(noiseSettings.disabledNoiseHeaders);
    }
    
    if (isNaN(idx) || idx < 0) {
      setError('Invalid entry index.');
      setLoading(false);
      return;
    }
    
    try {
      var entryJson = localStorage.getItem('har-helper-inspect-entry');
      var storedIdx = localStorage.getItem('har-helper-inspect-idx');
      
      if (!entryJson) {
        setError('No entry data found. Please click on a request from the main page.');
        setLoading(false);
        return;
      }
      
      var parsedEntry = JSON.parse(entryJson) as HarEntry;
      var finalIdx = storedIdx ? parseInt(storedIdx) : idx;
      
      setEntry(parsedEntry);
      setEntryIdx(finalIdx);
      document.title = 'Request #' + (finalIdx + 1) + ' — ' + parsedEntry.request.method + ' ' + parsedEntry.request.url.substring(0, 80);
      
      if (parsedEntry.request.postData?.text) {
        var reqBody = parsedEntry.request.postData.text;
        if (isGzipCompressed(parsedEntry)) {
          try {
            var decoded = await decodeBody({ text: reqBody, encoding: undefined, mimeType: parsedEntry.request.postData.mimeType }, parsedEntry);
            if (decoded && decoded !== reqBody) {
              reqBody = decoded;
            }
          } catch (e) {}
        }
        setDecodedRequestBody(reqBody);
      }
      
      if (parsedEntry.response.content?.text && !isBinaryMime(parsedEntry.response.content.mimeType)) {
        var respBody = await decodeBody(parsedEntry.response.content, parsedEntry);
        setDecodedResponseBody(respBody);
      }
      
      setLoading(false);
    } catch (e) {
      setError('Failed to load entry: ' + (e as Error).message);
      setLoading(false);
    }
  });
  
  function handleHideNoiseReqChange(checked: boolean) {
    setHideNoiseReq(checked);
    var currentArchiveId = archiveId();
    if (currentArchiveId) {
      saveNoiseSettingsToDb(currentArchiveId, { hideNoiseReq: checked });
    }
  }
  
  function handleHideNoiseRespChange(checked: boolean) {
    setHideNoiseResp(checked);
    var currentArchiveId = archiveId();
    if (currentArchiveId) {
      saveNoiseSettingsToDb(currentArchiveId, { hideNoiseResp: checked });
    }
  }
  
  function handleAddToNoise(headerName: string) {
    var key = headerName.toLowerCase();
    var newUserNoiseHeaders = userNoiseHeaders();
    var newDisabledNoiseHeaders = disabledNoiseHeaders();
    
    if (BUILTIN_NOISE_HEADERS.indexOf(key) === -1) {
      newUserNoiseHeaders = { ...newUserNoiseHeaders, [key]: true };
      setUserNoiseHeaders(newUserNoiseHeaders);
    }
    
    var updatedDisabled = { ...newDisabledNoiseHeaders };
    delete updatedDisabled[key];
    setDisabledNoiseHeaders(updatedDisabled);
    
    var currentArchiveId = archiveId();
    if (currentArchiveId) {
      saveNoiseSettingsToDb(currentArchiveId, { userNoiseHeaders: newUserNoiseHeaders, disabledNoiseHeaders: updatedDisabled });
    }
  }
  
  var currentEntry = createMemo(function() { return entry(); });
  var req = createMemo(function() { return currentEntry()?.request; });
  var res = createMemo(function() { return currentEntry()?.response; });
  var size = createMemo(function() {
    var r = res();
    if (!r) return 0;
    return Math.max(0, r.content?.size || r.bodySize || 0);
  });
  var time = createMemo(function() { return Math.round(currentEntry()?.time || 0); });
  
  return (
    <div class="inspect-container">
      <Show when={loading()}>
        <p class="loading-text">Loading...</p>
      </Show>
      
      <Show when={error()}>
        <p class="error-text">{error()}</p>
      </Show>
      
      <Show when={!loading() && !error() && currentEntry()}>
        <h1>Request #{entryIdx() + 1}</h1>
        <div class="url-box">{req()?.url}</div>
        
        <div class="inspect-toolbar">
          <label>
            <input 
              type="checkbox" 
              checked={hideNoiseReq()}
              onChange={function(e) { handleHideNoiseReqChange((e.target as HTMLInputElement).checked); }}
            />
            Hide noise: Request Headers
          </label>
          <label>
            <input 
              type="checkbox" 
              checked={hideNoiseResp()}
              onChange={function(e) { handleHideNoiseRespChange((e.target as HTMLInputElement).checked); }}
            />
            Hide noise: Response Headers
          </label>
          <button onClick={function() { setShowNoiseManager(true); }}>Manage Noise Headers</button>
        </div>
        
        <h2>General</h2>
        <table>
          <tbody>
            <tr><th>Method</th><td>{req()?.method}</td></tr>
            <tr><th>Status</th><td>{res()?.status} {res()?.statusText || ''}</td></tr>
            <tr><th>MIME</th><td>{res()?.content?.mimeType || ''}</td></tr>
            <tr><th>Type</th><td>{classifyEntry(currentEntry()!)}</td></tr>
            <tr><th>Size</th><td>{formatSize(size())}</td></tr>
            <tr><th>Time</th><td>{time()} ms</td></tr>
            <Show when={currentEntry()?.startedDateTime}>
              <tr><th>Started</th><td>{currentEntry()?.startedDateTime}</td></tr>
            </Show>
            <Show when={currentEntry()?.serverIPAddress}>
              <tr><th>Server IP</th><td>{currentEntry()?.serverIPAddress}</td></tr>
            </Show>
          </tbody>
        </table>
        
        <h2>Request Headers</h2>
        <HeadersTable 
          headers={req()?.headers || []}
          type="request"
          hideNoise={hideNoiseReq()}
          userNoiseHeaders={userNoiseHeaders()}
          disabledNoiseHeaders={disabledNoiseHeaders()}
          onAddToNoise={handleAddToNoise}
        />
        
        <Show when={req()?.queryString && req()!.queryString!.length > 0}>
          <h2>Query Params</h2>
          <table>
            <tbody>
              <For each={req()?.queryString || []}>
                {function(param) {
                  return <tr><th>{param.name}</th><td>{param.value || ''}</td></tr>;
                }}
              </For>
            </tbody>
          </table>
        </Show>
        
        <Show when={decodedRequestBody()}>
          <BodyView 
            label="Request Body"
            text={decodedRequestBody()!}
            mime={req()?.postData?.mimeType || ''}
          />
        </Show>
        
        <Show when={req()?.cookies && req()!.cookies!.length > 0}>
          <h2>Request Cookies</h2>
          <table>
            <tbody>
              <For each={req()?.cookies || []}>
                {function(cookie) {
                  return <tr><th>{cookie.name}</th><td>{cookie.value || ''}</td></tr>;
                }}
              </For>
            </tbody>
          </table>
        </Show>
        
        <h2>Response Headers</h2>
        <HeadersTable 
          headers={res()?.headers || []}
          type="response"
          hideNoise={hideNoiseResp()}
          userNoiseHeaders={userNoiseHeaders()}
          disabledNoiseHeaders={disabledNoiseHeaders()}
          onAddToNoise={handleAddToNoise}
        />
        
        <Show when={res()?.content?.text}>
          <Show when={isBinaryMime(res()?.content?.mimeType)}>
            <BinaryBodyView 
              label="Response Body"
              content={res()!.content!}
            />
          </Show>
          <Show when={!isBinaryMime(res()?.content?.mimeType) && decodedResponseBody()}>
            <BodyView 
              label="Response Body"
              text={decodedResponseBody()!}
              mime={res()?.content?.mimeType || ''}
            />
          </Show>
        </Show>
        
        <Show when={res()?.cookies && res()!.cookies!.length > 0}>
          <h2>Response Cookies</h2>
          <table>
            <tbody>
              <For each={res()?.cookies || []}>
                {function(cookie) {
                  return <tr><th>{cookie.name}</th><td>{cookie.value || ''}</td></tr>;
                }}
              </For>
            </tbody>
          </table>
        </Show>
        
        <Show when={currentEntry()?.timings}>
          <h2>Timings</h2>
          <table>
            <tbody>
              <For each={Object.entries(currentEntry()?.timings || {})}>
                {function([key, value]) {
                  return <tr><th>{key}</th><td>{value} ms</td></tr>;
                }}
              </For>
            </tbody>
          </table>
        </Show>
      </Show>
      
      <NoiseManager
        isOpen={showNoiseManager()}
        onClose={async function() {
          setShowNoiseManager(false);
          var currentArchiveId = archiveId();
          if (currentArchiveId) {
            var noiseSettings = await loadExportSettingsFromDb(currentArchiveId);
            setUserNoiseHeaders(noiseSettings.userNoiseHeaders);
            setDisabledNoiseHeaders(noiseSettings.disabledNoiseHeaders);
          }
        }}
        archiveId={archiveId()}
      />
    </div>
  );
};
