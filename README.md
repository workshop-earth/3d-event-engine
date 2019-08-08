# 3D Seismic Event Engine
This D3 powered visualization plots earthquake data in [3D space.](https://github.com/Niekes/d3-3d)

* Each individual plotted point represents a unique/measured earthquake event
* X/Y/Z axes represent physical relationships in KM
* Point radius represents event magnitude (minimum magnitude visualized is adjustable)
* Color is scaled across time while history range is adjustable
* X/Z axes labels are toggleable for visibility
* Time-based playback can be paused/scrubbed/replayed

## Development
`npm install` for dependencies

`gulp` defaults to a full build (compiles JS & CSS)

`http-server ./` for local development. Navigate to `public/` folder.

## 2019 Ridgecrest Earthquake
On July 5th 2019 a magnitude 7.1 earthquake struck Ridgecrest, CA. Effects were felt for miles and aftershocks were numerous. It's scale is visualized here.

Currently the engine is hard-coded with this specific dataset. Future roadmap for this engine is to support dataset import.
https://3d-event-engine.netlify.com/