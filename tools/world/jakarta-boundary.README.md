# Jakarta procedure avoidance

`jakarta-boundary.geojson` contains the Jakarta Special Capital Region feature
from geoBoundaries gbOpen IDN ADM1 (2017 boundary data, December 2023 build).
The feature includes the mainland and the coastal polygons supplied in that
dataset. This is a land-boundary reference, not an offshore maritime boundary.

Source: https://github.com/wmgeolab/geoBoundaries/blob/main/releaseData/gbOpen/IDN/ADM1/geoBoundaries-IDN-ADM1_simplified.geojson

Attribution: OpenStreetMap contributors and Wambacher, distributed through
geoBoundaries. The data is licensed under the Open Data Commons Open Database
License 1.0: https://opendatacommons.org/licenses/odbl/1-0/
See also https://www.openstreetmap.org/copyright and the upstream metadata in
`jakarta-boundary-metadata.json`.

The simulator uses a conservative rectangle enclosing these polygons, with
several kilometres of margin. Departure and arrival paths route around it. Turning fixes
sit a further 10 km outside that rectangle so rounded SID bends retain
clearance. Early SID exit and STAR entry connectors must also clear the rectangle. Initial
runway alignment and final approach remain intact. This is a fictional routing preference for
the simulator, not a claim of published SIDs or an official no-fly zone.

Run `node tools/tests/jakarta-departures.cjs` to check all 72 SID and 96 STAR combinations,
the live departure tracks and arrival/departure connectors against the
source polygons, independently of the runtime rectangle check.
