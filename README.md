# 🎹 Web Piano

A single-page, responsive, touch-friendly piano you can play in any modern browser — desktop or mobile. No build step, no dependencies, works offline. Sound is synthesized live with the Web Audio API.

**▶ Play it: https://brunolm.github.io/piano-web/**

## Features

- **Touch & multi-touch** — play chords with several fingers on a phone or tablet; slide across keys to glissando.
- **Mouse & computer keyboard** — click keys, or use the `A W S E D F T G…` row.
- **Responsive layout** — adapts to portrait, landscape, phones, and large screens.
- **Configurable** — pick the starting octave, number of octaves (1–4), toggle note labels, and adjust volume.
- **Zero install** — a static site (`index.html` + `style.css` + `script.js`).

## Run locally

Just open `index.html` in a browser, or serve the folder:

```powershell
python -m http.server 8000
# then open http://localhost:8000
```

## Deploy

Hosted on **GitHub Pages** from the `main` branch root. Push to `main` and the site updates automatically.

## License

MIT
