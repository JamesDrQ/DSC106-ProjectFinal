"""
Interactive bar chart: which IPCC land regions warm the most?
Scenario buttons + decade slider (matplotlib widgets, opens a window).

Install:  pip install numpy xarray netCDF4 matplotlib pyshp
Run:      python warming_simple.py                 (interactive window)
          python warming_simple.py --save out.png  (static PNG instead, e.g. --scenario ssp245 --decade 2060)

Put this file in the same folder as ACCESS-CM2.nc, AWI-CM-1-1-MR.nc, BCC-CSM2-MR.nc,
CAMS-CSM1-0.nc, CAS-ESM2-0.nc, warming.json and IPCC-WGI-reference-regions-v4.* (or pass --data DIR).
"""
import argparse, json
from pathlib import Path
import numpy as np
import xarray as xr
import shapefile                      # pyshp

MODELS = ["ACCESS-CM2", "AWI-CM-1-1-MR", "BCC-CSM2-MR", "CAMS-CSM1-0", "CAS-ESM2-0"]
SCEN_LABEL = {"ssp126": "SSP1-2.6", "ssp245": "SSP2-4.5", "ssp370": "SSP3-7.0", "ssp585": "SSP5-8.5"}
TOP_N = 15


def load_region_warming(data):
    """Return (scenarios, decades, names, table[scen, decade, region], global_mean[scen, decade])."""
    meta = json.load(open(data / "warming.json"))
    scen, decades = meta["scen"], meta["years"]
    mask = np.array(meta["reg"]).reshape(len(meta["lat"]), len(meta["lon"]))  # region index per grid cell
    acr = [r["a"] for r in meta["regions"]]
    names = [r["n"] for r in meta["regions"]]

    # land regions only (Type is "Land" or "Land-Ocean" in the IPCC shapefile)
    sf = shapefile.Reader(str(data / "IPCC-WGI-reference-regions-v4.shp"))
    typ = {r["Acronym"]: r["Type"] for r in sf.records()}
    land = [i for i, a in enumerate(acr) if typ[a].startswith("Land") and (mask == i).any()]

    # 5-model mean warming (deg C vs 1995-2014): scenario x decade x lat x lon
    fields = []
    if meta["baseline"] != "1995-2014":
        raise ValueError("Expected the 1995-2014 baseline.")
    for model in MODELS:
        with xr.open_dataset(data / f"{model}.nc") as dataset:
            if not (np.array_equal(dataset.lat.values, meta["lat"]) and
                    np.array_equal(dataset.lon.values, meta["lon"])):
                raise ValueError(f"{model}: coordinates do not match the region mask.")
            field = dataset["warming"].sel(scenario=scen, decade=decades).load()
            if not np.isfinite(field.values).all():
                raise ValueError(f"{model}: missing or non-finite warming values.")
            fields.append(field)
    ens = xr.concat(fields, dim="model", join="exact").mean("model")
    ens = ens.transpose("scenario", "decade", "lat", "lon").sel(scenario=scen, decade=decades).values

    w = np.broadcast_to(np.cos(np.deg2rad(meta["lat"]))[:, None], mask.shape)   # area weights
    table = np.stack([(ens[..., mask == i] * w[mask == i]).sum(-1) / w[mask == i].sum() for i in land], axis=-1)
    gmean = (ens * w).sum((-2, -1)) / w.sum()
    return scen, decades, [names[i] for i in land], table, gmean


def draw(ax, scen, decades, names, table, gmean, si, di):
    ax.clear()
    vals = table[si, di]
    order = np.argsort(vals)[::-1][:TOP_N][::-1]                 # top N, largest at top
    g = gmean[si, di]
    ax.barh([names[i] for i in order], vals[order], color="#c8442f")
    for y, i in enumerate(order):
        ax.text(vals[i] + 0.05, y, f"+{vals[i]:.1f}", va="center", fontsize=9, color="#555")
    ax.axvline(g, color="k", ls="--", lw=1.2)
    ax.text(g, TOP_N - 0.4, f" global {g:.1f}°C", fontsize=9, va="bottom")
    ax.set_xlim(0, np.ceil(table.max()))
    ax.set_xlabel("Warming vs 1995–2014 (°C)")
    ax.set_title(f"Under {SCEN_LABEL[scen[si]]}, the world warms {g:.1f}°C by the {decades[di]}s,\n"
                 "but these regions warm far more", loc="left")
    ax.spines[["top", "right"]].set_visible(False)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=Path(__file__).parent, type=Path)
    ap.add_argument("--export-json", type=Path, help="export regional values for the D3 website")
    ap.add_argument("--save", help="write a PNG instead of opening a window")
    ap.add_argument("--scenario", default="ssp585", choices=SCEN_LABEL)
    ap.add_argument("--decade", default=2090, type=int)
    a = ap.parse_args()

    scen, decades, names, table, gmean = load_region_warming(a.data)
    if a.export_json:
        if not np.isfinite(table).all() or not np.isfinite(gmean).all():
            raise ValueError("Non-finite warming values: inspect missing source data before exporting.")
        payload = {
            "scenarios": list(scen), "decades": [int(d) for d in decades],
            "regions": names, "warming": table.tolist(), "globalMean": gmean.tolist(),
            "models": MODELS, "baseline": "1995–2014", "units": "°C",
            "variable": "Near-Surface Air Temperature",
        }
        a.export_json.parent.mkdir(parents=True, exist_ok=True)
        a.export_json.write_text(json.dumps(payload, allow_nan=False), encoding="utf-8")
        print("Exported", a.export_json)
        return

    import matplotlib.pyplot as plt
    from matplotlib.widgets import Slider, RadioButtons
    si, di = scen.index(a.scenario), decades.index(a.decade)

    fig = plt.figure(figsize=(10, 7))
    ax = fig.add_axes([0.27, 0.22, 0.68, 0.66])
    draw(ax, scen, decades, names, table, gmean, si, di)

    if a.save:
        fig.savefig(a.save, dpi=150, bbox_inches="tight"); print("saved", a.save); return

    # --- interactive controls
    rax = fig.add_axes([0.03, 0.45, 0.14, 0.2]); rax.set_title("Scenario", fontsize=10)
    radio = RadioButtons(rax, [SCEN_LABEL[s] for s in scen], active=si)
    sax = fig.add_axes([0.35, 0.07, 0.5, 0.03])
    slider = Slider(sax, "Decade", 0, len(decades) - 1, valinit=di, valstep=1)
    slider.valtext.set_text(f"{decades[di]}s")

    def update(_=None):
        s = [SCEN_LABEL[x] for x in scen].index(radio.value_selected)
        d = int(slider.val)
        slider.valtext.set_text(f"{decades[d]}s")
        draw(ax, scen, decades, names, table, gmean, s, d)
        fig.canvas.draw_idle()

    radio.on_clicked(update); slider.on_changed(update)
    plt.show()


if __name__ == "__main__":
    main()