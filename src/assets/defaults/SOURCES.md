# Default pictures: where they come from

The dashboard shows one of these while a campaign has no banner or a group has
no crest (T074). Each is picked by the campaign's or group's id
(`pages/layouts/dashboard/sections/defaultPictures.ts`), shown, and **never
stored**.

All eight are from **The Metropolitan Museum of Art's Open Access** programme,
which releases the images of its public-domain works under **CC0 1.0**, so no
attribution is owed (see the Met's collection API, <https://metmuseum.github.io/>).
Each object below reported `isPublicDomain: true` in that API on 2026-10-07.
The sources are recorded anyway, so anyone can check a picture and find the
original.

## Banners

Downloaded at the Met's full size (2026-10-07), the painted frame trimmed,
scaled to 1440 px wide and saved as WebP (quality 62; *Heart of the Andes* 50,
whose canopy costs more bytes).

| File | Work | Met object |
|---|---|---|
| `banner-rocky-mountains.webp` | Albert Bierstadt, *The Rocky Mountains, Lander's Peak*, 1863 | [10154](https://www.metmuseum.org/art/collection/search/10154) |
| `banner-heart-of-the-andes.webp` | Frederic Edwin Church, *Heart of the Andes*, 1859 | [10481](https://www.metmuseum.org/art/collection/search/10481) |
| `banner-the-oxbow.webp` | Thomas Cole, *View from Mount Holyoke, Northampton, Massachusetts, after a Thunderstorm—The Oxbow*, 1836 | [10497](https://www.metmuseum.org/art/collection/search/10497) |
| `banner-contemplating-the-moon.webp` | Caspar David Friedrich, *Two Men Contemplating the Moon*, ca. 1825–30 | [438417](https://www.metmuseum.org/art/collection/search/438417) |

`banner-brightness.json` holds each banner's brightness grid: what
`measureBrightness` (`core/utils/band-dimming.ts`) records for an uploaded
banner, measured on these exact files, so the band dims its text no more than
the picture needs. **Replace a banner and measure it again**: a grid that no
longer matches its picture dims for the wrong picture.

## Crests

The crest slot is a wide strip, and coats of arms are tall, so each print sits
whole in the middle of a 768 × 240 canvas filled with its own paper's tone
(the median of the print's side edges), its sides feathered into it. Saved as
WebP, quality 70.

| File | Work | Met object |
|---|---|---|
| `crest-durer-cock.webp` | Albrecht Dürer, *Coat of Arms with Cock*, ca. 1502 | [384647](https://www.metmuseum.org/art/collection/search/384647) |
| `crest-beham-eagle.webp` | Sebald Beham, *Coat of Arms with an Eagle Surrounded by Foliage*, 1543 | [415027](https://www.metmuseum.org/art/collection/search/415027) |
| `crest-beham-cock.webp` | Sebald Beham, *Coat of Arms with a Cock*, 1543 | [418368](https://www.metmuseum.org/art/collection/search/418368) |
| `crest-meckenem-lion.webp` | Israhel van Meckenem, *Coat of Arms with a Lion*, undated | [641801](https://www.metmuseum.org/art/collection/search/641801) |
