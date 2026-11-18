import { renderPlaceholder } from './placeholder.js';
export function render(container) {
  // Confirm the soil moisture variable and units before integrating data.
  renderPlaceholder(container, { title: 'Soil moisture visualization', note: 'Reserved for land moisture patterns. Variable selection and integration pending.' });
}
