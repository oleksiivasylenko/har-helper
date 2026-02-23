import { createSignal, createRoot } from 'solid-js';
import type { Archive, HarData, HarEntry } from '../types';
import { archivesApi } from '../api/client';

var LAST_ARCHIVE_KEY = 'har-helper-last-archive-id';

function createArchivesStore() {
  var [archives, setArchives] = createSignal<Archive[]>([]);
  var [currentArchiveId, setCurrentArchiveIdInternal] = createSignal<number | null>(null);
  var [harDataMap, setHarDataMap] = createSignal<Map<number, HarData>>(new Map());
  var [entriesMap, setEntriesMap] = createSignal<Map<number, HarEntry[]>>(new Map());
  var [loading, setLoading] = createSignal(false);
  var [error, setError] = createSignal<string | null>(null);

  function setCurrentArchiveId(id: number | null) {
    setCurrentArchiveIdInternal(id);
    if (id !== null) {
      localStorage.setItem(LAST_ARCHIVE_KEY, String(id));
    } else {
      localStorage.removeItem(LAST_ARCHIVE_KEY);
    }
  }

  function getLastArchiveId(): number | null {
    var stored = localStorage.getItem(LAST_ARCHIVE_KEY);
    if (stored) {
      var parsed = parseInt(stored, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return null;
  }

  async function loadArchives() {
    setLoading(true);
    setError(null);
    try {
      var result = await archivesApi.list();
      setArchives(result.archives);
      
      var lastId = getLastArchiveId();
      if (lastId !== null && result.archives.some(function(a: Archive) { return a.id === lastId; })) {
        return lastId;
      } else if (result.archives.length > 0) {
        return result.archives[0].id;
      }
      return null;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function createArchive(name: string, fileName: string, harData: HarData) {
    setLoading(true);
    setError(null);
    try {
      var entries = harData.log.entries || [];
      var result = await archivesApi.create(name, fileName, entries.length, harData);
      var archive = result.archive;
      
      setArchives(function(prev) { return [...prev, archive]; });
      
      var processedEntries = entries.map(function(entry, index) {
        return { ...entry, _checked: true, _origIndex: index };
      });
      
      setHarDataMap(function(prev) {
        var newMap = new Map(prev);
        newMap.set(archive.id, harData);
        return newMap;
      });
      
      setEntriesMap(function(prev) {
        var newMap = new Map(prev);
        newMap.set(archive.id, processedEntries);
        return newMap;
      });
      
      setCurrentArchiveId(archive.id);
      return archive;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function deleteArchive(id: number) {
    setLoading(true);
    setError(null);
    try {
      await archivesApi.delete(id);
      
      setArchives(function(prev) { return prev.filter(function(a) { return a.id !== id; }); });
      
      setHarDataMap(function(prev) {
        var newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      
      setEntriesMap(function(prev) {
        var newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      
      if (currentArchiveId() === id) {
        var remaining = archives().filter(function(a) { return a.id !== id; });
        setCurrentArchiveId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function switchArchive(id: number) {
    if (!archives().some(function(a) { return a.id === id; })) {
      return;
    }
    
    setCurrentArchiveId(id);
    
    if (!harDataMap().has(id)) {
      setLoading(true);
      try {
        var result = await archivesApi.getHarData(id);
        if (result.harData) {
          var entries = result.harData.log.entries || [];
          var processedEntries = entries.map(function(entry: HarEntry, index: number) {
            return { ...entry, _checked: true, _origIndex: index };
          });
          
          setHarDataMap(function(prev) {
            var newMap = new Map(prev);
            newMap.set(id, result.harData);
            return newMap;
          });
          
          setEntriesMap(function(prev) {
            var newMap = new Map(prev);
            newMap.set(id, processedEntries);
            return newMap;
          });
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
  }

  function getCurrentArchive(): Archive | null {
    var id = currentArchiveId();
    if (id === null) return null;
    return archives().find(function(a) { return a.id === id; }) || null;
  }

  function getCurrentHarData(): HarData | null {
    var id = currentArchiveId();
    if (id === null) return null;
    return harDataMap().get(id) || null;
  }

  function getCurrentEntries(): HarEntry[] {
    var id = currentArchiveId();
    if (id === null) return [];
    return entriesMap().get(id) || [];
  }

  function updateEntries(entries: HarEntry[]) {
    var id = currentArchiveId();
    if (id === null) return;
    
    setEntriesMap(function(prev) {
      var newMap = new Map(prev);
      newMap.set(id!, entries);
      return newMap;
    });
  }

  function setEntryChecked(index: number, checked: boolean) {
    var id = currentArchiveId();
    if (id === null) return;
    
    setEntriesMap(function(prev) {
      var newMap = new Map(prev);
      var entries = [...(newMap.get(id!) || [])];
      if (entries[index]) {
        entries[index] = { ...entries[index], _checked: checked };
        newMap.set(id!, entries);
      }
      return newMap;
    });
  }

  function selectAllVisible(visibleIndices: number[]) {
    var id = currentArchiveId();
    if (id === null) return;
    
    setEntriesMap(function(prev) {
      var newMap = new Map(prev);
      var entries = [...(newMap.get(id!) || [])];
      for (var i = 0; i < visibleIndices.length; i++) {
        var idx = visibleIndices[i];
        if (entries[idx]) {
          entries[idx] = { ...entries[idx], _checked: true };
        }
      }
      newMap.set(id!, entries);
      return newMap;
    });
  }

  function deselectAll() {
    var id = currentArchiveId();
    if (id === null) return;
    
    setEntriesMap(function(prev) {
      var newMap = new Map(prev);
      var entries = (newMap.get(id!) || []).map(function(e) {
        return { ...e, _checked: false };
      });
      newMap.set(id!, entries);
      return newMap;
    });
  }

  function currentArchive() {
    return getCurrentArchive();
  }

  function currentHarData() {
    return getCurrentHarData();
  }

  function currentEntries() {
    return getCurrentEntries();
  }

  return {
    archives: archives,
    currentArchiveId: currentArchiveId,
    loading: loading,
    error: error,
    loadArchives: loadArchives,
    createArchive: createArchive,
    deleteArchive: deleteArchive,
    switchArchive: switchArchive,
    getCurrentArchive: getCurrentArchive,
    getCurrentHarData: getCurrentHarData,
    getCurrentEntries: getCurrentEntries,
    currentArchive: currentArchive,
    currentHarData: currentHarData,
    currentEntries: currentEntries,
    updateEntries: updateEntries,
    setEntryChecked: setEntryChecked,
    selectAllVisible: selectAllVisible,
    deselectAll: deselectAll
  };
}

export var archivesStore = createRoot(createArchivesStore);
