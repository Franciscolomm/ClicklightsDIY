# Clicklights for Everlights — landing page

Static landing page (HTML + CSS + JavaScript, no build step).

## Structure

```
clicklight-landing/
├── index.html                  Page markup
├── styles/
│   ├── main.css                Global tokens, base, type, buttons, placeholders, reveal
│   └── blocks/                 One file per section
│       ├── clicklight-3d.css   Clicklights 3D section (original styles)
│       ├── nav.css             Landing nav (sticky)
│       ├── hero.css            Hero + sticky Buy button
│       ├── highlights.css      Get the highlights (gallery + RGBW color picker)
│       ├── installation.css    Installation types (Outward, Downward)
│       ├── design.css          Design: 3D switch + image mode
│       ├── buy.css             Product selector
│       └── footer.css          Footer
├── scripts/
│   ├── main.js                 Nav, hero video, highlights, RGBW color picker, tabs, Design image mode, Buy selector
│   └── clicklight-3d.js        3D section (three.js, ES module)
└── assets/
    ├── video/                  Hero, highlights, Design and channel videos (H.264, no audio)
    ├── images/                 Posters, Design images, RGBW base frame + LED mask, length images (50–450 ft)
    └── models/clicklight_hd.glb   3D model (unmodified)
```

## Run locally

Open it through a local web server, not by double-clicking `index.html`
(browsers block loading the 3D model and some video features from `file://`):

```
npx serve .
# or
python3 -m http.server 8000
```

Then open http://localhost:8000. On GitHub, enable **Settings → Pages** to publish it.

## Things to set

- **Checkout URL** — `scripts/main.js`, constant `CHECKOUT_URL` (now `#checkout`).
  The chosen options are sent as `?product=clicklight&length=…&channel=…&cap=…`.
- **Prices** — `scripts/main.js`, `PRICES` (sale price) and `REGULAR` (struck-through price) per length.
- **three.js** is loaded from the jsDelivr CDN (import map in `index.html`).

## RGBW color picker (Get the highlights)

Only the 4 RGB LEDs change color. The page draws the video's first frame
(`assets/images/highlights-rgbw-off.jpg`) and lights the LED faces marked in
`assets/images/highlights-rgbw-mask.png` (red = LED faces, green = glow), following
the on/off timing of `highlights-rgbw.mp4`. If that video is replaced with a new shot,
both images must be regenerated from it.
