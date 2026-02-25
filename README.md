# webgl-cube-array

A minimal vanilla WebGL demo that renders a 16x16 vertical wall of cubes with random colors, ambient + point-light shading (including specular highlights), white background, medium white fog, and a slowly orbiting camera.

## Run

Use any static server from the project root:

- `npx serve .`
- `python -m http.server`

Then open the shown local URL in a browser.

## PNG to RGBA JSON

This repo now includes a helper script to convert a 16x16 PNG into a JSON matrix of RGBA values.

- Script: scripts/png16_to_rgba_json.py
- Dependency: Pillow (`pip install pillow`)

Example usage:

- Print JSON to stdout:
  - `python scripts/png16_to_rgba_json.py input.png`
- Write pretty JSON to a file:
  - `python scripts/png16_to_rgba_json.py input.png -o colors.json`
- Write compact one-line JSON:
  - `python scripts/png16_to_rgba_json.py input.png -o colors.json --compact`
