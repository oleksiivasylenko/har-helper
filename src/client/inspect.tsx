import { render } from 'solid-js/web';
import { InspectPage } from './components/InspectPage';
import './styles/inspect.css';

var root = document.getElementById('root');
if (root) {
  render(function() { return <InspectPage />; }, root);
}
