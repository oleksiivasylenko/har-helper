import type { Archive, Filters, ExportSettings, GlobalSettings } from '../types';

var AUTH_TOKEN = '';

async function loadToken() {
  if (AUTH_TOKEN) return;
  try {
    var res = await fetch('/api/config');
    var data = await res.json();
    AUTH_TOKEN = data.token || '';
  } catch (e) {
    AUTH_TOKEN = '';
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  await loadToken();

  var headers = {
    'Content-Type': 'application/json',
    'X-Auth-Token': AUTH_TOKEN,
    ...options.headers
  };
  
  var response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    var error = await response.json().catch(function() { return { error: 'Request failed' }; });
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}

export var archivesApi = {
  list: function(): Promise<{ archives: Archive[] }> {
    return request('/api/archives');
  },
  
  get: function(id: number): Promise<{ archive: Archive }> {
    return request('/api/archives/' + id);
  },
  
  getHarData: function(id: number): Promise<{ harData: any }> {
    return request('/api/archives/' + id + '/har');
  },
  
  create: function(name: string, fileName: string, entryCount: number, harData?: any): Promise<{ archive: Archive }> {
    return request('/api/archives', {
      method: 'POST',
      body: JSON.stringify({ name: name, fileName: fileName, entryCount: entryCount, harData: harData })
    });
  },
  
  update: function(id: number, updates: Partial<Archive>): Promise<{ archive: Archive }> {
    return request('/api/archives/' + id, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },
  
  delete: function(id: number): Promise<{ success: boolean }> {
    return request('/api/archives/' + id, { method: 'DELETE' });
  }
};

export var filtersApi = {
  get: function(archiveId: number): Promise<{ filters: Filters }> {
    return request('/api/filters/' + archiveId);
  },
  
  save: function(archiveId: number, filters: Partial<Filters>): Promise<{ success: boolean; filters: Filters }> {
    return request('/api/filters/' + archiveId, {
      method: 'PUT',
      body: JSON.stringify(filters)
    });
  },
  
  copy: function(sourceArchiveId: number, targetArchiveId: number, mode: 'replace' | 'merge', copyNoiseHeaders: boolean = true): Promise<{ success: boolean; filterId: number }> {
    return request('/api/filters/' + targetArchiveId + '/copy', {
      method: 'POST',
      body: JSON.stringify({ sourceArchiveId: sourceArchiveId, mode: mode, copyNoiseHeaders: copyNoiseHeaders })
    });
  },
  
  getSources: function(targetArchiveId: number): Promise<{ sources: Array<{ archiveId: number; archiveName: string; hasFilters: boolean; hasExportSettings: boolean; isDeleted: boolean }> }> {
    return request('/api/filters/' + targetArchiveId + '/sources');
  }
};

export var exportSettingsApi = {
  get: function(archiveId: number): Promise<{ exportSettings: ExportSettings }> {
    return request('/api/export-settings/' + archiveId);
  },
  
  save: function(archiveId: number, settings: ExportSettings): Promise<{ success: boolean; exportSettings: ExportSettings }> {
    return request('/api/export-settings/' + archiveId, {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  },
  
  copy: function(sourceArchiveId: number, targetArchiveId: number, copyNoiseHeaders: boolean = true): Promise<{ success: boolean; exportSettingsId: number }> {
    return request('/api/export-settings/' + targetArchiveId + '/copy', {
      method: 'POST',
      body: JSON.stringify({ sourceArchiveId: sourceArchiveId, copyNoiseHeaders: copyNoiseHeaders })
    });
  }
};

export var settingsApi = {
  getGlobal: function(): Promise<{ settings: GlobalSettings }> {
    return request('/api/settings/global');
  },
  
  saveGlobal: function(settings: GlobalSettings): Promise<{ success: boolean; settings: GlobalSettings }> {
    return request('/api/settings/global', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }
};
