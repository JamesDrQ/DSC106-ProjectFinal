import { render } from './visualizations/regional-warming.js';

function initialize() {
  render(document.getElementById('regional-warming'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
