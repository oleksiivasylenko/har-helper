import { Component, For, Show, createSignal, createMemo } from 'solid-js';
import { exportSettingsStore, globalSettingsStore } from '../stores';
import type { HarEntry, Header } from '../types';
import { decodeResponseBody, headersToString, isNoiseHeader, isJsonMime } from '../utils/harProcessor';
import { BUILTIN_NOISE_HEADERS } from '../utils/constants';

interface RequestDetailsProps {
  entry: HarEntry | null;
  onClose: () => void;
}

export var RequestDetails: Component<RequestDetailsProps> = function(props) {
  var [activeTab, setActiveTab] = createSignal<'headers' | 'request' | 'response' | 'timing'>('headers');
  var [showNoiseHeaders, setShowNoiseHeaders] = createSignal(false);
  
  var exportSettings = function() { return exportSettingsStore.exportSettings(); };
  var globalSettings = function() { return globalSettingsStore.globalSettings(); };
  var entry = function() { return props.entry; };

  var requestHeaders = createMemo(function() {
    var e = entry();
    if (!e) return [];
    var headers = e.request.headers || [];
    if (showNoiseHeaders() || !globalSettings().useNoiseInspect) return headers;
    
    var userNoise = exportSettings().userNoiseHeaders || {};
    var disabledNoise = exportSettings().disabledNoiseHeaders || {};
    
    return headers.filter(function(h) {
      return !isNoiseHeader(h.name.toLowerCase(), userNoise, disabledNoise);
    });
  });

  var responseHeaders = createMemo(function() {
    var e = entry();
    if (!e) return [];
    var headers = e.response.headers || [];
    if (showNoiseHeaders() || !globalSettings().useNoiseInspect) return headers;
    
    var userNoise = exportSettings().userNoiseHeaders || {};
    var disabledNoise = exportSettings().disabledNoiseHeaders || {};
    
    return headers.filter(function(h) {
      return !isNoiseHeader(h.name.toLowerCase(), userNoise, disabledNoise);
    });
  });

  var requestBody = createMemo(function() {
    var e = entry();
    if (!e || !e.request.postData?.text) return null;
    var text = e.request.postData.text;
    var mime = e.request.postData.mimeType || '';
    
    if (isJsonMime(mime)) {
      try {
        return JSON.stringify(JSON.parse(text), null, 2);
      } catch (err) {
        return text;
      }
    }
    return text;
  });

  var responseBody = createMemo(function() {
    var e = entry();
    if (!e || !e.response.content?.text) return null;
    var text = decodeResponseBody(e.response.content);
    var mime = e.response.content.mimeType || '';
    
    if (isJsonMime(mime)) {
      try {
        return JSON.stringify(JSON.parse(text), null, 2);
      } catch (err) {
        return text;
      }
    }
    return text;
  });

  var queryParams = createMemo(function() {
    var e = entry();
    if (!e) return [];
    return e.request.queryString || [];
  });

  var timings = createMemo(function() {
    var e = entry();
    if (!e || !e.timings) return null;
    return e.timings;
  });

  return (
    <Show when={entry()}>
      <div class="request-details-panel">
        <div class="details-header">
          <div class="details-title">
            <span class={'method-badge method-' + entry()!.request.method.toLowerCase()}>
              {entry()!.request.method}
            </span>
            <span class={'status-badge status-' + Math.floor(entry()!.response.status / 100) + 'xx'}>
              {entry()!.response.status}
            </span>
            <span class="details-url" title={entry()!.request.url}>
              {entry()!.request.url}
            </span>
          </div>
          <button class="details-close-btn" onClick={props.onClose}>×</button>
        </div>
        
        <div class="details-tabs">
          <button 
            class={'tab-btn' + (activeTab() === 'headers' ? ' active' : '')}
            onClick={function() { setActiveTab('headers'); }}
          >
            Headers
          </button>
          <button 
            class={'tab-btn' + (activeTab() === 'request' ? ' active' : '')}
            onClick={function() { setActiveTab('request'); }}
          >
            Request
          </button>
          <button 
            class={'tab-btn' + (activeTab() === 'response' ? ' active' : '')}
            onClick={function() { setActiveTab('response'); }}
          >
            Response
          </button>
          <button 
            class={'tab-btn' + (activeTab() === 'timing' ? ' active' : '')}
            onClick={function() { setActiveTab('timing'); }}
          >
            Timing
          </button>
        </div>
        
        <div class="details-content">
          <Show when={activeTab() === 'headers'}>
            <div class="headers-section">
              <div class="headers-toolbar">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={showNoiseHeaders()}
                    onChange={function(e) { setShowNoiseHeaders((e.target as HTMLInputElement).checked); }}
                  />
                  Show Noise Headers
                </label>
              </div>
              
              <h5>Request Headers ({requestHeaders().length})</h5>
              <div class="headers-list">
                <For each={requestHeaders()}>
                  {function(header) {
                    return (
                      <div class="header-row">
                        <span class="header-name">{header.name}:</span>
                        <span class="header-value">{header.value}</span>
                      </div>
                    );
                  }}
                </For>
              </div>
              
              <h5>Response Headers ({responseHeaders().length})</h5>
              <div class="headers-list">
                <For each={responseHeaders()}>
                  {function(header) {
                    return (
                      <div class="header-row">
                        <span class="header-name">{header.name}:</span>
                        <span class="header-value">{header.value}</span>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>
          </Show>
          
          <Show when={activeTab() === 'request'}>
            <div class="request-section">
              <Show when={queryParams().length > 0}>
                <h5>Query Parameters ({queryParams().length})</h5>
                <div class="params-list">
                  <For each={queryParams()}>
                    {function(param) {
                      return (
                        <div class="param-row">
                          <span class="param-name">{param.name}:</span>
                          <span class="param-value">{param.value}</span>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </Show>
              
              <Show when={requestBody()}>
                <h5>Request Body</h5>
                <pre class="body-content">{requestBody()}</pre>
              </Show>
              
              <Show when={!requestBody() && queryParams().length === 0}>
                <p class="no-content">No request body or query parameters</p>
              </Show>
            </div>
          </Show>
          
          <Show when={activeTab() === 'response'}>
            <div class="response-section">
              <Show when={responseBody()}>
                <h5>Response Body ({entry()!.response.content.mimeType || 'unknown'})</h5>
                <pre class="body-content">{responseBody()}</pre>
              </Show>
              
              <Show when={!responseBody()}>
                <p class="no-content">No response body</p>
              </Show>
            </div>
          </Show>
          
          <Show when={activeTab() === 'timing'}>
            <div class="timing-section">
              <Show when={timings()}>
                <div class="timing-bars">
                  <Show when={timings()!.blocked && timings()!.blocked > 0}>
                    <div class="timing-row">
                      <span class="timing-label">Blocked:</span>
                      <div class="timing-bar timing-blocked" style={{ width: Math.max(2, timings()!.blocked) + 'px' }} />
                      <span class="timing-value">{timings()!.blocked.toFixed(2)} ms</span>
                    </div>
                  </Show>
                  <Show when={timings()!.dns && timings()!.dns > 0}>
                    <div class="timing-row">
                      <span class="timing-label">DNS:</span>
                      <div class="timing-bar timing-dns" style={{ width: Math.max(2, timings()!.dns) + 'px' }} />
                      <span class="timing-value">{timings()!.dns.toFixed(2)} ms</span>
                    </div>
                  </Show>
                  <Show when={timings()!.connect && timings()!.connect > 0}>
                    <div class="timing-row">
                      <span class="timing-label">Connect:</span>
                      <div class="timing-bar timing-connect" style={{ width: Math.max(2, timings()!.connect) + 'px' }} />
                      <span class="timing-value">{timings()!.connect.toFixed(2)} ms</span>
                    </div>
                  </Show>
                  <Show when={timings()!.ssl && timings()!.ssl > 0}>
                    <div class="timing-row">
                      <span class="timing-label">SSL:</span>
                      <div class="timing-bar timing-ssl" style={{ width: Math.max(2, timings()!.ssl) + 'px' }} />
                      <span class="timing-value">{timings()!.ssl.toFixed(2)} ms</span>
                    </div>
                  </Show>
                  <Show when={timings()!.send && timings()!.send > 0}>
                    <div class="timing-row">
                      <span class="timing-label">Send:</span>
                      <div class="timing-bar timing-send" style={{ width: Math.max(2, timings()!.send) + 'px' }} />
                      <span class="timing-value">{timings()!.send.toFixed(2)} ms</span>
                    </div>
                  </Show>
                  <Show when={timings()!.wait && timings()!.wait > 0}>
                    <div class="timing-row">
                      <span class="timing-label">Wait:</span>
                      <div class="timing-bar timing-wait" style={{ width: Math.max(2, timings()!.wait) + 'px' }} />
                      <span class="timing-value">{timings()!.wait.toFixed(2)} ms</span>
                    </div>
                  </Show>
                  <Show when={timings()!.receive && timings()!.receive > 0}>
                    <div class="timing-row">
                      <span class="timing-label">Receive:</span>
                      <div class="timing-bar timing-receive" style={{ width: Math.max(2, timings()!.receive) + 'px' }} />
                      <span class="timing-value">{timings()!.receive.toFixed(2)} ms</span>
                    </div>
                  </Show>
                </div>
                <div class="timing-total">
                  <strong>Total: {entry()!.time?.toFixed(2) || 0} ms</strong>
                </div>
              </Show>
              
              <Show when={!timings()}>
                <p class="no-content">No timing information available</p>
              </Show>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
};
