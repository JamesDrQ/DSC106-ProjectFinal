# Regional Disparities in Global Warming

UC San Diego DSC 106 Final Project. Vanilla HTML, CSS, JavaScript, and D3.js v7, with a Python preprocessing step for the regional warming chart.

## Local preview

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. Stop with Ctrl+C. D3 is loaded from jsDelivr and needs internet access. All project asset paths are relative and support GitHub Pages repository subpaths.

## Regional warming chart

`visualizations/regional-warming.js` adapts the supplied `prototype.py` plot to D3. It ranks the 15 land regions with the highest warming, provides a scenario selector and decade slider, and draws a dashed global-mean reference line. The x-axis domain is fixed across all scenarios and decades. A table exposes the selected chart values. Narrow screens can scroll the chart horizontally to keep region names readable.

The supplied Python source is retained in `scripts/prototype.py`, with an added `--export-json` option. Its model averaging, land-region filtering, and cosine-latitude weighting are retained. Matplotlib is imported only for the original desktop plot. The supplied input files are preserved in `data/source/`, and the generated `data/regional-warming.json` is included for direct browser use. It contains 4 scenarios, 8 decades (2020–2090), and the land regions selected by the Python script. No synthetic values are used.

### Prepare the real data

The input directory must contain:

- `ACCESS-CM2.nc`
- `AWI-CM-1-1-MR.nc`
- `BCC-CSM2-MR.nc`
- `CAMS-CSM1-0.nc`
- `CAS-ESM2-0.nc`
- `warming.json`
- `IPCC-WGI-reference-regions-v4.shp`, `.shx`, and `.dbf` (retain any other shapefile companion files)

Install the preprocessing dependencies in a repository-local environment:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install numpy xarray netCDF4 pyshp
.venv/bin/python scripts/prototype.py --data data/source --export-json data/regional-warming.json
```

The input NetCDF files must already contain the `warming` variable with scenario, decade, lat, and lon dimensions and anomalies relative to 1995–2014, as expected by the original script. They must share the latitude/longitude grid and ordering used by the region mask in `warming.json`. Verify those preprocessing assumptions before interpreting results. The exporter rejects non-finite output values.

Commit `data/regional-warming.json` along with the site; GitHub Pages does not run Python. The export contains `scenarios`, `decades`, `regions`, `warming[scenario][decade][region]`, `globalMean[scenario][decade]`, model names, baseline, and units. The source metadata identifies near-surface air temperature, not daily maximum temperature. The `warming` arrays are supplied precomputed anomalies with inherited Kelvin units; Kelvin differences and Celsius differences are numerically equal. The baseline comes from the supplied warming.json and original script, not a fresh calculation from historical files. Grid coordinates, baseline, and finite model values are checked during export.

To use the original desktop plotting mode, also install matplotlib, then run:

```sh
.venv/bin/python scripts/prototype.py --data data/source
```

## Project structure

- `index.html`: project writeup and chart container.
- `style.css`: simple responsive styling.
- `main.js`: initializes the regional warming chart.
- `visualizations/regional-warming.js`: data loading, validation, controls, and D3 chart.
- `scripts/prototype.py`: supplied Python analysis and JSON export option.
- Other files in `visualizations/` are retained unused starter modules, not rendered placeholders.

The two progress responses remain unchanged. Findings are still pending. Publish the repository root through GitHub Pages; no JavaScript build step is required.
