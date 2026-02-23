import { Component, Show } from 'solid-js';
import { archivesStore } from '../stores';

interface HeaderProps {
  onOpenGlobalSettings: () => void;
}

export var Header: Component<HeaderProps> = function(props) {
  var archive = function() { return archivesStore.currentArchive(); };
  var harData = function() { return archivesStore.currentHarData(); };
  
  var harInfo = function() {
    var data = harData();
    var arch = archive();
    if (!data || !arch) return '';
    
    var version = data.log?.version || '?';
    var browser = data.log?.browser?.name || '?';
    var entries = arch.entry_count;
    
    return 'Version: ' + version + ' | Browser: ' + browser + ' | Entries: ' + entries;
  };

  return (
    <header>
      <h1>HAR Helper</h1>
      <div class="header-info">{harInfo()}</div>
      <div class="header-actions">
        <button onClick={props.onOpenGlobalSettings}>
          ⚙ Settings
        </button>
      </div>
    </header>
  );
};
