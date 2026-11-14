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


Destination photography batch (14 November 2026). Each image was resized and cropped to 1000 × 600; source and licence are listed below. Attribution is also available to app visitors via Photo credits.

| Destination | Photograph and photographer | Licence |
| --- | --- | --- |
| manado | [Sunset at Bunaken Island, Sulawesi, 2016.jpg](https://commons.wikimedia.org/wiki/File:Sunset_at_Bunaken_Island,_Sulawesi,_2016.jpg) — Niek van Son | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| lombok | [Lombok, Island beach in the bay, Indonesia.jpg](https://commons.wikimedia.org/wiki/File:Lombok,_Island_beach_in_the_bay,_Indonesia.jpg) — Vyacheslav Argenberg | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| palembang | [LRT Palembang Ampera Bridge.jpg](https://commons.wikimedia.org/wiki/File:LRT_Palembang_Ampera_Bridge.jpg) — Gaudi Renanda | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| semarang | [Semarang - Lawang Sewu 01.jpg](https://commons.wikimedia.org/wiki/File:Semarang_-_Lawang_Sewu_01.jpg) — P. Hughes | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| padang | [An afternoon view from Gado-Gado Hill, Padang City, West Sumatra, Indonesia.jpg](https://commons.wikimedia.org/wiki/File:An_afternoon_view_from_Gado-Gado_Hill,_Padang_City,_West_Sumatra,_Indonesia.jpg) — Dave Is Killa | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| batam | [Barelang Bridge in Indonesia.jpg](https://commons.wikimedia.org/wiki/File:Barelang_Bridge_in_Indonesia.jpg) — Cabajar | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| pontianak | [Pontianak Kapuas Bridge.jpg](https://commons.wikimedia.org/wiki/File:Pontianak_Kapuas_Bridge.jpg) — Liuzhary | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| solo | [Keraton Kasunanan Surakarta Hadiningrat.jpg](https://commons.wikimedia.org/wiki/File:Keraton_Kasunanan_Surakarta_Hadiningrat.jpg) — Jo Chryst | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| melbourne | [Melbourne Docklands - Yarras Edge - marina panorama.jpg](https://commons.wikimedia.org/wiki/File:Melbourne_Docklands_-_Yarras_Edge_-_marina_panorama.jpg) — Diliff | [CC BY 2.5](https://creativecommons.org/licenses/by/2.5) |
| perth | [Perth (AU), View from Kings Park -- 2019 -- 0525-30.jpg](https://commons.wikimedia.org/wiki/File:Perth_(AU),_View_from_Kings_Park_--_2019_--_0525-30.jpg) — Dietmar Rabich | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| dubai | [Dubai Skyline mit Burj Khalifa (18241030269).jpg](https://commons.wikimedia.org/wiki/File:Dubai_Skyline_mit_Burj_Khalifa_(18241030269).jpg) — Tim Reckmann from Hamm, Deutschland | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| manila | [Manila Skyline March 2020.jpg](https://commons.wikimedia.org/wiki/File:Manila_Skyline_March_2020.jpg) — Lawrence Ruiz | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| taipei | [Taipei Taiwan Taipei-101-Tower-01.jpg](https://commons.wikimedia.org/wiki/File:Taipei_Taiwan_Taipei-101-Tower-01.jpg) — CEphoto, Uwe Aranas | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| shanghai | [Pudong Shanghai November 2017 panorama.jpg](https://commons.wikimedia.org/wiki/File:Pudong_Shanghai_November_2017_panorama.jpg) — King of Hearts | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| beijing | [Sunset of the Forbidden City 2006.JPG](https://commons.wikimedia.org/wiki/File:Sunset_of_the_Forbidden_City_2006.JPG) — User:kallgan | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| ho-chi-minh-city | [Ho Chi Minh City Skyline at Night.jpg](https://commons.wikimedia.org/wiki/File:Ho_Chi_Minh_City_Skyline_at_Night.jpg) — Tran Van Ngoc | [CC0](https://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| seoul | [Gyeonghoeru (Royal Banquet Hall) at Gyeongbokgung Palace, Seoul.jpg](https://commons.wikimedia.org/wiki/File:Gyeonghoeru_(Royal_Banquet_Hall)_at_Gyeongbokgung_Palace,_Seoul.jpg) — Frank Schulenburg | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| banda-aceh | [Masjid Raya Baiturrahman di Banda Aceh.jpg](https://commons.wikimedia.org/wiki/File:Masjid_Raya_Baiturrahman_di_Banda_Aceh.jpg) — Felianiwiki | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| istanbul | [Hagia Sophia Mars 2013.jpg](https://commons.wikimedia.org/wiki/File:Hagia_Sophia_Mars_2013.jpg) — Arild Vågen | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| labuan-bajo | [Padar Island, Komodo National Park, Indonesia, 20250822 0929 2659.jpg](https://commons.wikimedia.org/wiki/File:Padar_Island,_Komodo_National_Park,_Indonesia,_20250822_0929_2659.jpg) — Jakub Hałun | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| makassar | [Pantai Losari Makassar.jpg](https://commons.wikimedia.org/wiki/File:Pantai_Losari_Makassar.jpg) — Fhikri Latifi | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| balikpapan | [2018-02-18 Pantai Kemala Balikpapan.jpg](https://commons.wikimedia.org/wiki/File:2018-02-18_Pantai_Kemala_Balikpapan.jpg) — consigliere ivan from Bontang, Indonesia | [CC0](https://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| jeddah | [Jeddah waterfront.jpg](https://commons.wikimedia.org/wiki/File:Jeddah_waterfront.jpg) — SUAAD | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| phuket | [Patong Beach (1).jpg](https://commons.wikimedia.org/wiki/File:Patong_Beach_(1).jpg) — Wolfgang Holzem | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
