const labels = { ssp126: 'SSP1-2.6', ssp245: 'SSP2-4.5', ssp370: 'SSP3-7.0', ssp585: 'SSP5-8.5' };

export function validateData(data) {
  const { scenarios, decades, regions, warming, globalMean } = data;
  if (![scenarios, decades, regions].every(a => Array.isArray(a) && a.length) ||
      !scenarios.every(s => typeof s === 'string') ||
      !decades.every(Number.isFinite) || !regions.every(r => typeof r === 'string') ||
      new Set(regions).size !== regions.length ||
      warming?.length !== scenarios.length || globalMean?.length !== scenarios.length ||
      !warming.every(s => Array.isArray(s) && s.length === decades.length &&
        s.every(d => Array.isArray(d) && d.length === regions.length && d.every(Number.isFinite))) ||
      !globalMean.every(s => Array.isArray(s) && s.length === decades.length && s.every(Number.isFinite))) {
    throw new Error('Invalid regional warming data.');
  }
  return data;
}

export async function render(container) {
  if (!container) return;
  const status = container.querySelector('[role="status"]');
  const d3 = window.d3;
  if (!d3) {
    status.textContent = 'The chart library could not load. Check your connection and reload the page.';
    return;
  }
  let data;
  try {
    const response = await fetch(new URL('../data/regional-warming.json', import.meta.url));
    if (!response.ok) throw new Error(`Data request failed: ${response.status}`);
    data = validateData(await response.json());
  } catch (error) {
    status.textContent = 'Regional warming data are not available yet. The chart needs the data export from the Python prototype.';
    console.error('Regional warming chart:', error);
    return;
  }
  const root = d3.select(container);
  root.selectAll('*').remove();
  let si = Math.max(0, data.scenarios.indexOf('ssp585'));
  let di = Math.max(0, data.decades.indexOf(2090));
  const controls = root.append('div').attr('class', 'warming-controls');
  const scenarioLabel = controls.append('label').text('Scenario ');
  const select = scenarioLabel.append('select').attr('aria-label', 'Scenario');
  select.selectAll('option').data(data.scenarios).join('option')
    .attr('value', (_, i) => i).text(s => labels[s] || s);
  select.property('value', si);
  const decadeLabel = controls.append('label').text('Decade ');
  const output = decadeLabel.append('output').attr('for', 'warming-decade');
  const slider = decadeLabel.append('input').attr('id', 'warming-decade')
    .attr('type', 'range').attr('min', 0).attr('max', data.decades.length - 1)
    .attr('step', 1).attr('aria-label', 'Decade').property('value', di);
  const summary = root.append('p').attr('aria-live', 'polite').attr('class', 'warming-summary');
  const frame = root.append('div').attr('class', 'warming-chart');
  const svg = frame.append('svg').attr('role', 'img').attr('aria-labelledby', 'warming-chart-title warming-chart-description');
  svg.append('title').attr('id', 'warming-chart-title').text('The 15 land regions with the largest projected warming');
  const description = svg.append('desc').attr('id', 'warming-chart-description');
  const chart = svg.append('g');
  const details = root.append('details');
  details.append('summary').text('View chart values');
  const table = details.append('table').attr('class', 'warming-table');
  table.append('caption').text('Warming relative to 1995–2014 (°C)');
  table.append('thead').append('tr').selectAll('th').data(['Region', 'Warming (°C)'])
    .join('th').attr('scope', 'col').text(d => d);
  const tbody = table.append('tbody');
  const modelNote = root.append('p').attr('class', 'note');
  modelNote.text(`Models: ${(data.models || []).join(', ')}.`);
  // Keep one scale across scenarios and decades, as in the Python plot.
  const allValues = data.warming.flat(2).concat(data.globalMean.flat());
  const domain = [Math.min(0, Math.floor(d3.min(allValues))), Math.max(1, Math.ceil(d3.max(allValues)))];
  const format = d3.format('+.1f');

  function draw() {
    const rows = data.regions.map((name, i) => ({ name, value: data.warming[si][di][i] }))
      .sort((a, b) => b.value - a.value).slice(0, 15);
    const global = data.globalMean[si][di];
    output.text(`${data.decades[di]}s`);
    slider.attr('aria-valuetext', `${data.decades[di]}s`);
    summary.text(`${labels[data.scenarios[si]] || data.scenarios[si]}, ${data.decades[di]}s: global average warming ${format(global)}°C.`);
    description.text(`Relative to 1995–2014. ${rows.map(d => `${d.name}: ${format(d.value)}°C`).join('; ')}. Global average: ${format(global)}°C.`);
    const width = Math.max(620, container.clientWidth);
    const margin = { top: 38, right: 60, bottom: 55, left: 205 };
    const height = rows.length * 30 + margin.top + margin.bottom;
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height);
    chart.selectAll('*').remove();
    const x = d3.scaleLinear().domain(domain).range([margin.left, width - margin.right]);
    const y = d3.scaleBand().domain(rows.map(d => d.name)).range([margin.top, height - margin.bottom]).padding(0.25);
    chart.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(6));
    chart.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).tickSize(0)).call(g => g.select('.domain').remove());
    chart.selectAll('.bar').data(rows).join('rect').attr('class', 'bar')
      .attr('x', d => x(Math.min(0, d.value))).attr('y', d => y(d.name))
      .attr('width', d => Math.abs(x(d.value) - x(0))).attr('height', y.bandwidth()).attr('fill', '#c8442f')
      .append('title').text(d => `${d.name}: ${format(d.value)}°C`);
    chart.selectAll('.value').data(rows).join('text').attr('class', 'value')
      .attr('x', d => x(d.value) + 6).attr('y', d => y(d.name) + y.bandwidth() / 2)
      .attr('dy', '0.35em').text(d => format(d.value));
    chart.append('line').attr('x1', x(global)).attr('x2', x(global))
      .attr('y1', margin.top - 8).attr('y2', height - margin.bottom)
      .attr('stroke', '#303630').attr('stroke-dasharray', '5 4');
    chart.append('text').attr('x', x(global)).attr('y', 19).attr('text-anchor', 'middle')
      .text(`Global ${format(global)}°C`);
    chart.append('text').attr('x', (margin.left + width - margin.right) / 2)
      .attr('y', height - 10).attr('text-anchor', 'middle').text('Warming vs 1995–2014 (°C)');
    tbody.selectAll('tr').data([...rows, { name: 'Global average', value: global }]).join('tr')
      .selectAll('td').data(d => [d.name, format(d.value)]).join('td').text(d => d);
  }
  select.on('change', event => { si = Number(event.target.value); draw(); });
  slider.on('input', event => { di = Number(event.target.value); draw(); });
  draw();
  new ResizeObserver(draw).observe(container);
}
