import type { HarEntry, HarData, ExportSettings } from '../types';
import { filterHeaders } from './harProcessor';

export function applyExportSettings(entry: HarEntry, settings: ExportSettings): HarEntry {
  var clone = JSON.parse(JSON.stringify(entry)) as HarEntry;
  
  clone.request.headers = filterHeaders(clone.request.headers || [], settings.includedRequestHeaders);
  clone.response.headers = filterHeaders(clone.response.headers || [], settings.includedResponseHeaders);
  
  var origIdx = clone._origIndex !== undefined ? clone._origIndex : -1;
  var excludedResponses = settings.excludedResponses || {};
  if (origIdx >= 0 && excludedResponses[origIdx]) {
    clone.response = {
      status: clone.response.status,
      statusText: clone.response.statusText || '',
      headers: [],
      cookies: [],
      content: { size: 0, mimeType: '', text: '' },
      bodySize: 0
    };
  }
  
  if (!settings.requestBody) delete clone.request.postData;
  if (!settings.requestCookies) clone.request.cookies = [];
  if (!settings.responseBody) {
    clone.response.content.text = '';
    clone.response.content.size = 0;
  }
  if (!settings.responseCookies) clone.response.cookies = [];
  if (!settings.timings) delete clone.timings;
  if (!settings.serverIp) delete clone.serverIPAddress;
  if (!settings.queryString) clone.request.queryString = [];
  
  delete clone._checked;
  delete clone._origIndex;
  
  return clone;
}

export function createFilteredHar(
  originalHar: HarData,
  selectedEntries: HarEntry[],
  exportSettings: ExportSettings
): HarData {
  var entries = selectedEntries.map(function(entry) {
    return applyExportSettings(entry, exportSettings);
  });
  
  if (exportSettings.useOriginalOrder) {
    entries.sort(function(a, b) {
      return (a._origIndex || 0) - (b._origIndex || 0);
    });
  }
  
  var newHar: HarData = JSON.parse(JSON.stringify(originalHar));
  newHar.log.entries = entries;
  
  return newHar;
}

export function downloadHar(harData: HarData, fileName: string): void {
  var json = JSON.stringify(harData, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  
  var now = new Date();
  var hours = String(now.getHours()).padStart(2, '0');
  var minutes = String(now.getMinutes()).padStart(2, '0');
  var prefix = 'filtered-' + hours + '-' + minutes + '.';
  
  var downloadName = prefix + fileName;
  
  var a = document.createElement('a');
  a.href = url;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadJson(data: object, fileName: string): void {
  var json = JSON.stringify(data, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  
  var a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadText(text: string, fileName: string): void {
  var blob = new Blob([text], { type: 'text/plain' });
  var url = URL.createObjectURL(blob);
  
  var now = new Date();
  var hours = String(now.getHours()).padStart(2, '0');
  var minutes = String(now.getMinutes()).padStart(2, '0');
  var prefix = 'ai-' + hours + '-' + minutes + '_';
  
  var downloadName = prefix + fileName;
  
  var a = document.createElement('a');
  a.href = url;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadFilteredHar(harData: any, fileName: string): void {
  var json = JSON.stringify(harData, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  
  var now = new Date();
  var hours = String(now.getHours()).padStart(2, '0');
  var minutes = String(now.getMinutes()).padStart(2, '0');
  var prefix = 'filtered-' + hours + '-' + minutes + '_';
  
  var downloadName = prefix + fileName;
  
  var a = document.createElement('a');
  a.href = url;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
