import { render } from 'solid-js/web';
import { App } from './App';
import { exportSettingsStore } from './stores';
import './styles/main.css';

(window as any).__exportSettingsStore = exportSettingsStore;

var root = document.getElementById('root');

if (root) {
  render(function() { return <App />; }, root);
}
