import { renderPlaceholder } from './placeholder.js';
export function render(container) {
  // Validate the geographic scope of siconc, zos, and zostoga independently.
  renderPlaceholder(container, { title: 'Ocean & sea ice visualization', note: 'Reserved for ocean comparisons. Data and chart integration pending.' });
}
