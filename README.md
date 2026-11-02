# Cicada Ubud · Festive Digital Booklet 2026

An interactive, 3D page-turning booklet built with React, Vite and [Motion](https://motion.dev). The supplied PDF artwork is preserved as crisp page images; each landscape spread was split into its two square leaves.

The flipbook (`src/components/FlipBook.jsx`) animates only `transform` and `opacity`, so page turns run on the GPU without repainting. Pages are served as WebP in three widths, every page is pre-decoded before it is needed, and the book is sized from the available space so it always sits centred — including when only the front or back cover is showing.

## Local development

Requires Node.js 20.19+.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (typically `http://localhost:5173`).

## Deploy to Vercel

1. Push the project files to a GitHub repository, omitting `node_modules` and `dist`.
2. Import the repository into Vercel and choose **Vite** (or let it auto-detect).
3. Build command: `npm run build`. Output directory: `dist`.
4. Deploy. This is a static site and requires no backend or API keys.

`vercel.json` sets long-lived caching for hashed build assets and a 7-day cache for page images, brand assets and audio. If you replace an image but keep its file name, returning visitors may see the old one for up to a week; give the new file a new name to update it immediately.

Alternatively, run `npm run build` and deploy the `dist` folder to any static host.

## Content and customization

- `source-images/` — original full-resolution artwork and logo (not deployed).
- `public/pages/` — optimised WebP pages: `-720` and `-1100` for the book, `-1650` for the zoom view.
- `public/brand/` — Cicada logo crops used by the header and intro screen; favicons live in `public/`.
- `public/Festive_2026_Cicada_Ubud.pdf` — visitor download.
- `src/data.js` — page list and chapters.
- `src/App.jsx` — layout, controls, intro, sound player.
- `src/components/` — `FlipBook`, `ZoomViewer`, `Splash` (intro curtain, first visit per session) and `Ambient` (background).
- `src/styles.css` — colors, decorative elements, layout and responsive styling.
- `public/audio/festive-ambient.mp3` — original ambient instrumental created for this project.
- `scripts/compose_soundtrack.py` — optional deterministic music-generation script.

To change the artwork, replace or add files in `source-images/`, update the list in `scripts/optimize_images.py` and `src/data.js`, then run `python scripts/optimize_images.py` (requires Pillow) to regenerate `public/pages/` and `public/brand/`.

To use a different licensed soundtrack, replace `public/audio/festive-ambient.mp3` with an audio file of the same name. Music begins only after a visitor taps **Open the Book** or enables sound, in keeping with browser autoplay restrictions.

No tracking, cookies, database or paid third-party integration is required.
