Home destination photography is stored locally so the cards do not depend on image requests at runtime.

- Bali: https://images.unsplash.com/photo-1537996194471-e657df975ab4
- Amsterdam: https://images.unsplash.com/photo-1512470876302-972faa2aa9a4
- Photography licence: https://unsplash.com/license

Switzer is served from the official Fontshare API rather than redistributing its font files in this repository. It is free for personal and commercial use under the ITF Free Font License: https://www.fontshare.com/licenses/itf-ffl. Home falls back to Arial/sans-serif if the font service is unavailable.

Home’s white Garuda logo is the unmodified SVG from the header of https://www.garuda-indonesia.com/ (retrieved 13 November 2026). It includes the official wordmark, wing and tagline, and is served locally at its original aspect ratio.

Destination photography catalogue (added 13 November 2026):

- Osaka: https://images.unsplash.com/photo-1590559899731-a382839e5549 — shopping street, used for KIX.
- Tokyo: https://images.unsplash.com/photo-1540959733332-eab4deabeeaf — neon-lit city streets, shared by HND and NRT.
- Singapore: https://images.unsplash.com/photo-1525625293386-3f8f99389edd — Marina Bay, used for SIN.
- London: https://images.unsplash.com/photo-1513635269975-59663e0ac1ad — Thames and Tower Bridge, shared by LHR and LGW.
- Sydney: https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9 — Opera House and harbour, used for SYD.

These use the Unsplash licence linked above. Downloads were resized/cropped to 1000 × 600 and compressed to JPEG (under 200 KB each). The shared `DESTINATION_IMAGES` catalogue in `garuda/index.html` maps airports to the correct city, source file, alternative text and crop position. Bali and Amsterdam retain their existing files. Photography is served locally across Home, Search, Results, Review, Confirmation and Trips; no external image requests are needed at runtime. Destinations without a curated photo, and failed image loads, retain a blue branded city treatment rather than borrowing another city's photograph.
