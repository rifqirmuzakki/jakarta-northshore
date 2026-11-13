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

These use the Unsplash licence linked above. Downloads were resized/cropped to 1000 × 600 and compressed to JPEG (under 200 KB each). The shared `DESTINATION_IMAGES` catalogue in `garuda/index.html` maps airports to the correct city, source file, alternative text and crop position. Bali and Amsterdam retain their existing files. Photography is served locally across Home, Search, Results, Review, Confirmation and Trips; no external image requests are needed at runtime. Destinations without a curated photo, and failed image loads, retain route text/location icons in compact Search and Results contexts, or a blue branded city treatment on larger journey cards, rather than borrowing another city's photograph.

Expanded city library (13 November 2026, all under the Unsplash licence above):

| City / airport | Local file | Photographer and source |
| --- | --- | --- |
| Jakarta / JKT | `jakarta.jpg` | [David Kristianto — Jakarta skyline at sunset](https://unsplash.com/photos/a-city-skyline-against-a-warm-sunset-PISn314t3KU), image `1752040698228-2d9e80fc9d3d` |
| Surabaya / SUB | `surabaya.jpg` | [Inzulators Photowork Projects — Grahadi Building](https://unsplash.com/photos/white-building-with-columns-and-indonesian-flag-UXI2B-NaPZo), image `1768783034899-3d71781a6f74` |
| Medan / KNO | `medan.jpg` | [Iqbal Pohan — Medan railway station](https://unsplash.com/photos/a-large-white-building-with-palm-trees-in-front-of-it-ijBIp6bl-co), image `1676876873156-1caa1db86df9` |
| Yogyakarta / YIA, JOG | `yogyakarta.jpg` | [Fauzan Azizi — Yogyakarta Zero Point](https://unsplash.com/photos/a-large-white-building-with-a-red-roof-IE9-4g_L-VI), image `1703643511092-956e85a3c783` |
| Bangkok / BKK | `bangkok.jpg` | [Suhwa Lee — Wat Arun](https://unsplash.com/photos/a-very-tall-building-sitting-on-top-of-a-body-of-water-qxfM0lTTghM), image `1722700407861-89597bcef6ca` |
| Kuala Lumpur / KUL | `kuala-lumpur.jpg` | [Izuddin Helmi Adnan — Kuala Lumpur skyline](https://unsplash.com/photos/kuala-lumpur-tower-and-petronas-towers-4gLtZI213Dk), image `1531819177115-428566ccfb50` |
| Hong Kong / HKG | `hong-kong.jpg` | [ZHENYU LUO — Victoria Harbour skyline](https://unsplash.com/photos/hong-kong-skyline-reflected-in-the-water-xed0MeuKCRo), image `1751562292279-bca4634fe1bd` |
| Paris / CDG | `paris.jpg` | [Unsplash source image — Eiffel Tower and Seine](https://images.unsplash.com/photo-1502602898657-3e91760cbb34) |

Each added file is a compressed 1000 × 600 JPEG below 200 KB, served locally. These eight additions bring the catalogue to 15 distinct city photographs. The compact Search/Results treatment and existing larger journey covers share this catalogue.
