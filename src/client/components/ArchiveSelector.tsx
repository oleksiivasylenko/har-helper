import { Component, For, Show, createSignal } from 'solid-js';
import { archivesStore, filtersStore, exportSettingsStore } from '../stores';

interface ArchiveSelectorProps {
  onOpenCopySettings: () => void;
}

export var ArchiveSelector: Component<ArchiveSelectorProps> = function(props) {
  var [isDragging, setIsDragging] = createSignal(false);
  
  var archives = function() { return archivesStore.archives(); };
  var currentId = function() { return archivesStore.currentArchiveId(); };
  var loading = function() { return archivesStore.loading(); };

  async function handleArchiveSelect(id: number) {
    await archivesStore.switchArchive(id);
    await filtersStore.loadFilters(id);
    await exportSettingsStore.loadExportSettings(id);
  }

  async function handleFileUpload(file: File) {
    if (!file.name.endsWith('.har')) {
      alert('Please select a .har file');
      return;
    }
    
    try {
      var text = await file.text();
      var harJson = JSON.parse(text);
      
      if (!harJson.log || !harJson.log.entries) {
        alert('Invalid HAR file format');
        return;
      }
      
      var name = file.name.replace('.har', '');
      var existingArchivesCount = archives().length;
      await archivesStore.createArchive(name, file.name, harJson);
      
      if (existingArchivesCount > 0) {
        props.onOpenCopySettings();
      }
    } catch (err) {
      alert('Failed to parse HAR file: ' + (err as Error).message);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    
    var files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleFileInput(e: Event) {
    var target = e.target as HTMLInputElement;
    var files = target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
    target.value = '';
  }

  async function handleDeleteArchive(id: number, name: string) {
    if (confirm('Delete archive "' + name + '"? Settings will be preserved.')) {
      await archivesStore.deleteArchive(id);
    }
  }

  return (
    <div class="archive-selector">
      <h3>Archives</h3>
      
      <div class="archive-list">
        <For each={archives()}>
          {function(archive) {
            return (
              <div 
                class={'archive-item' + (currentId() === archive.id ? ' active' : '')}
                onClick={function() { handleArchiveSelect(archive.id); }}
              >
                <span class="archive-item-name">{archive.name}</span>
                <span class="archive-item-count">{archive.entry_count}</span>
                <button 
                  class="archive-item-delete"
                  onClick={function(e) { 
                    e.stopPropagation(); 
                    handleDeleteArchive(archive.id, archive.name); 
                  }}
                >
                  ×
                </button>
              </div>
            );
          }}
        </For>
        
        <Show when={archives().length === 0}>
          <div class="archive-item" style="color: #6c7086; cursor: default;">
            No archives loaded
          </div>
        </Show>
      </div>
      
      <div class="archive-upload">
        <input 
          type="file" 
          accept=".har" 
          onChange={handleFileInput}
          id="har-file-input"
          style="display: none"
        />
        <label 
          for="har-file-input" 
          class={'upload-btn' + (isDragging() ? ' dragging' : '')}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          📁 Upload HAR File
        </label>
      </div>
      
      <Show when={currentId() !== null}>
        <button class="copy-settings-btn" onClick={props.onOpenCopySettings}>
          📋 Copy Settings from Archive
        </button>
      </Show>
    </div>
  );
};
