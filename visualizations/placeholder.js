/** Shared scaffold renderer. This renders no data, marks, axes, or simulated results. */
export function renderPlaceholder(container, { title, note }) {
  const selection = window.d3?.select(container);
  if (!selection) return; // Keep the static HTML fallback when the CDN is unavailable.
  selection.selectAll('*').remove();
  selection.append('p').attr('class', 'placeholder-title').text(title);
  selection.append('p').attr('class', 'placeholder-note').text(note);
}
