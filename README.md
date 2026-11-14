# jakarta-northshore
Jakarta Northshore simulator hosted with GitHub Pages

## Operations (the "Operations" button)
**Incidents happen by themselves; you react.** A deterministic generator (a pure function of the date and the *disruption level*:
Off / Calm / Realistic / Chaos) creates weather at airports (climate and season dependent, Jakarta thunderstorms in the rainy season,
winter fog in northern Europe, typhoons, monsoon), aircraft failures at the turn, late inbound flights, and rare multi-day strikes.
Incidents known at the current clock apply automatically (delays, holds, closures, aircraft out of service); for today they are revealed as
the real clock passes (a banner announces a new one, and applying it reloads the page). The **Alerts** list at the top of the hub shows
what is open, with a *Handle* button that opens the recovery screen pre-filled (wait, swap aircraft, bring in a spare). Only your
*decisions* are saved (linked to the incident); the incidents themselves are regenerated identically from the date, so history is stable.
`?incidents=off|calm|realistic|chaos` overrides the saved level.

**Scenario clock.** By default time is live. In the hub (*Scenario clock*) pick a date and time and press *Start*, or open the page with
`?clock=2026-10-29T14:00` (Jakarta time): the whole app, map included, treats that moment as "now", and time runs from there. You can pause, run
10x or 60x, jump 15 minutes or an hour (reloads the simulation), and *Back to live* (`?clock=real`). The state is kept in sessionStorage, so
decisions (which reload the page) do not reset it. As the clock runs, new incidents and passed deadlines show a banner to apply them. A decided
item stays on the **Watching** tab, with the current state of the flights it protects, until those flights have gone, and is flagged if the
protected departure is still 15+ minutes late.

**Effective dates.** A service added "from" a date does not exist before it, in history either: flight and aircraft pages start at the effective date, and a long round trip's
return flight starts only once the first outbound has gone and come back (`retFrom`, set by the Add form). Cancels and amendments are not yet history-aware: an amended or cancelled
flight shows its new form in the days before the change.

**Weekly and multi-day services.** The ground simulation takes its arrival/departure pairing from the same plan as the aircraft rotations (built from the full-week
timetable) and keeps the pairs whose flights operate on the viewed day, so a service that runs only some weekdays cannot disagree with the aircraft plan. A round trip
that lands on a later weekday needs its return flight's operating days shifted accordingly (the Add form now does this). New services are listed in
`schedule-changes.js` (Taipei GA 938/939, Amsterdam GA 44/45, Wellington GA 56/57, AlUla GA 52/53, Baku GA 54/55, Ankara GA 46/47, Marrakech GA 48/49,
Casablanca GA 50/51), from 2026-11-07.

**Multi-leg timing and allocation.** All ten intermediate-stop services use the same physical model in `index.html`:
`V104_SECTORS` defines the airports, `V186_MULTILEG` defines the flight pairs, four sector block times and three stop times,
and `multiItinerary(outbound, day)` expands the rotation in absolute Jakarta-based minutes. The outbound timetable supplies
its Jakarta departure, operating weekdays and effective dates. Every later milestone is the previous arrival plus the defined
stop and next sector block; inbound Jakarta times, weekdays and first operating dates are derived from that chain. The old
independent inbound clock and `retFrom` are superseded for these services. IANA airport zones convert each event to its local
date/time, including DST and date-line crossings.

The allocator reserves the complete Jakarta → intermediate → final → intermediate → Jakarta itinerary on one aircraft.
Daily departures form a pipeline; today's inbound belongs to an earlier outbound and its original registration. Jakarta
arrivals and departures remain separate ground movements. Aircraft history, flight history and operational delay propagation
consume these physical sectors directly; completed sectors do not inherit a boundary flight's LIVE status.

Timing inputs are fictional schedule assumptions: existing first-sector block estimates and onward blocks/stops are now explicit;
return blocks are symmetric. The final-airport turn is 180 minutes, except Lisbon at 120 minutes. Change those minute values to
retime the whole rotation; there is no fixed return-day offset. For GA10 departing Jakarta on 6 November 2026 at 11:30 WIB,
the model reaches Chicago at 23:20 CST that evening, turns for three hours, departs as GA11 at 02:20 CST on 7 November,
and reaches Jakarta at 16:10 WIB on 8 November. The 6 November A350-1000 requirement changes from 49 operating + 2 spare
aircraft to 54 + 2. The World map still draws the Jakarta-boundary route; onward map geometry is not part of this change.

**Map timing lookup.** The map passes the scheduled absolute departure time, flight-instance day and physical sector
endpoints to history. Matching is exact; a missing instance returns no history times rather than another day's actuals.
Timing caches include that identity, and flight selection chooses the active instance even when its Jakarta arrival is tomorrow.
Airborne cards show ETA; ATA is reserved for a completed flight. Boston uses `America/New_York` (UTC−5 in winter, UTC−4 in summer),
and physical airport codes come from the multi-stop airport definitions. Run `node tools/tests/map-flight-lookup.cjs` for these regressions.

**Multi-leg regression checks.** Run `node tools/tests/multileg.cjs` with Playwright and Chromium installed
(`CHROMIUM_PATH` can override `/usr/bin/chromium`). It syntax-checks every embedded script and runs the app from intercepted
local files. Checks cover six dates, all ten routes after their effective starts, GA10/11 aircraft history and page rendering,
physical sector/turn continuity, simulated actuals/status, ground registrations, derived return days, weekday patterns, DST,
input retiming and delay propagation. In the managed workspace Chromium requires execution outside the sandbox because
crashpad's socket setup is denied inside it.

**Operations log** (hub > Log). A timeline of everything on the viewed day: incidents as they became known, controller decisions, and your own decisions,
each linked to the incident it answers, with the outcome (the flight's delay and its next departure now). Filter by incidents / controller / you; routine
"no action needed" controller notes are hidden unless asked for. *Copy handover* and *Download .txt* produce a plain-text shift summary. *My changes and
events* remains the place to undo, export or import saved records.

**The inbox** has three tabs: *Needs you* (flights whose lateness knocks on to something, with the cost of waiting on the row and a deadline),
*No knock-on* (late arrivals nothing else depends on) and *Handled*. Weather and closure events are collapsed under "What is happening". A
decision shows a sticky bar with the chosen action and its effect; cancelling asks for confirmation. Saving reloads the simulation, reopens
the hub and shows the result ("GA 656: +30m -> on time") before and after.

**Triggers and impacts.** Weather, technical faults, crew, airport closures, strikes and air traffic restrictions are *triggers*: they
are context ("What is happening"), not something to resolve. What you act on are the *impacts*: a late inbound flight, a late
outbound flight, an aircraft that cannot operate its next departure. The inbox ("Flights affected") lists those, each tagged with its
cause. A weather event lists the flights it makes late (at least 30 minutes, the ten worst per event) as soon as it is announced.

**Jakarta queue and sequence.** The hub has a *Jakarta queue* screen: per hour, who is held to land and to take off (read straight from the
ground simulation, so it includes runway closures), with *Move up* (the flight is handled ahead of the others waiting for the same
runway, saved as a `prio` record) and *Cancel*. A new trigger closes one runway for 45-120 minutes (disabled aircraft, bird-strike
inspection, lighting fault); the remaining runway queues the traffic. Moving a flight up does not help one that waits for a stand. The same screen sets the **runway configuration for the day** (flexible, mixed or strict; saved as an `rwmode` record, applied when the page loads) and can **hold a departure at the gate** for 15 or 30 minutes (a `delay` record) to ease the take-off queue. With one runway closed, mixed copes best and strict worst.

**You decide; the controller is the fallback.** Each open impact shows a deadline ("decide by 17:55 or the controller acts"): 60 minutes
after it is known, shortened when the next departure is close (never under 15 minutes). In *Handle* you choose **wait**, **swap
equipment**, **bring in a spare** (aircraft out of service) or **cancel**, and see the effect first. Cancelling a late inbound cancels it
and its next departure; for an aircraft out of service it cancels the next departure. A cancelled flight has no stand, runway or
movement, and shows *Cancelled* on the flight and aircraft pages (saved as a `cancelflt` record). Swapping equipment concerns the *next* departure of the late or unserviceable aircraft, never the flight already under way: the
screen is split into "this flight" (wait or cancel) and "its next departure" (swap or spare). Suggested aircraft are those that save
delay, but the controller can pick *any* aircraft of the same type from a list and sees the exact effect first, including when it makes
things worse. The two aircraft exchange their next flights; terminals follow the flight. If nobody decides before the deadline, the rule-based controller acts (swap if it saves 30+ minutes, spare for long outages,
otherwise wait; it never cancels). Decisions depend only on the incident, never on the viewed date, so past days always play out the
same way. Alerts show them as *Handled by the controller*; *Review* explains the choice and *Stand the controller down* reopens it
(saved as a `veto` record). Deciding first wins. Set the controller to *Never* in the hub (or `?controller=manual`) to decide everything.

The hub also has manual tools, below, for building a scenario yourself (under *Create a scenario yourself*).

One hub with two kinds of records, both stored in the same dated log:

**Something happened (reactive disruptions)**
* *A flight is delayed*: pick an inbound flight, how late and why. The app shows the knock-on (the aircraft's next departure cannot
  leave before the late arrival plus the minimum turn) and the recovery options, for example *swap aircraft*: another aircraft of the
  same type that is free at Jakarta takes the delayed aircraft's next departure and the delayed aircraft takes its later one.
  Recording it applies the delay and the swap to the live ground simulation, the aircraft pages and the flight pages.
* *An aircraft is out of service*: pick an aircraft that is on the ground at Jakarta between an arrival and its next departure, when it
  became unserviceable and for how long. It cannot leave before it is repaired, which is a forced delay on its departures in that window
  (knock-on included). Recovery options: **wait**, **swap** with another same-type aircraft whose next departure is later, or **bring in a
  spare** from the maintenance pool (the spare takes over the aircraft's line, the broken one sits out for the repair duration; on the
  ground the arriving aircraft stays parked and the spare departs).
* *Weather or an airport issue*: choose an airport, closed or slow, a time window in that airport's local time, and a cause. At a remote
  airport, flights leaving it in the window leave late and flights landing in the window hold and land late (and the delay carries along
  the aircraft's rotation; inbound flights reach Jakarta late the next day, so view that date). At **Jakarta** a closure is a real runway
  closure in the ground simulation: nothing lands or takes off in the window, aircraft hold and queue, and the backlog is released after it.
* Delays shown are only what the events add; turns that are already short in the schedule do not create phantom delays.
* Disruptions apply to the date being viewed (`?date=YYYY-MM-DD`, default today).

**Change the timetable (planned)**
* *Change a flight*, *Add a new service*, *Cancel a flight*, each from a start date (and optionally until a date). The built-in schedule is
  never edited; changes apply when the viewed date is inside `[from, to]`.
* *Check impact* runs the whole simulation with the candidate change in a hidden copy of the app (fleet size, flights without an aircraft,
  weekly round trips, stands) before you save.

**Storage and recovery**
* Records are saved in this browser (`localStorage`). *My changes and events > Export for repo* downloads `schedule-changes.js`; commit it
  to the repo root to share everything across devices (it is loaded before the simulator starts).
* Open the page with `?nochanges=1` to ignore all changes and events.

Record shapes: timetable `{id, v:1, scope:'timetable', kind:'add'|'amend'|'cancel', from, to, ...}`; operational
`{id, v:1, scope:'ops', kind:'delay'|'swap'|'aog'|'spare'|'weather', date, at, ...}`. The log is meant to be persisted as history later.

### Swap the aircraft on any departure

Operations hub > "Swap the aircraft on a departure" puts a different aircraft on any flight that has not left Jakarta yet, with or without an incident. Pick the departure, then choose an aircraft: the best few are suggested (aircraft of the same type on the ground in time), and any other can be chosen from the list. It records the same aircraft-swap decision as the incident flows, so it shows in the log, can be undone from "My changes and events", and the other flight takes the aircraft you replaced. Swaps work on the aircraft that is really on the ground (not the planned pairing), so a departure whose aircraft arrived on a different flight after the day's random swaps can still be swapped; the swap is recorded against the two departures and applied on top of those random swaps.

Aircraft-out-of-service incidents are actionable whenever the aircraft flies out of Jakarta again the same day, including long stays; where there is nothing to decide, the incident now says why (no tracked aircraft, or the aircraft does not fly out again today).

## World view (the "World" button)

Shows Jakarta flights on a world map (Natural Earth basemap, public domain), all airlines with Garuda highlighted.
Routes are fictional corridors, not published airways. The generator uses the beacon/waypoint network in `tools/world`,
chooses one corridor per direction using distance plus sharp-turn and backtracking penalties, and removes redundant points while preserving regional anchors and bounded waypoint legs. Shortcuts must clear the configured exclusions. It does not manufacture alternatives, assign detours by flight number, apply a pretend wind discount, or shift
inbound/outbound paths sideways. Multi-stop destinations are still drawn to their Jakarta-boundary stop.

`tools/world/geometry.js` checks geodesic edges in short segments against exclusion polygon boundaries, including endpoint
checks. Every exported route is validated after rounding. These are the model's fixed fictional exclusions, not current NOTAMs.
For comparison, the revised Melbourne–Jakarta route is about 5,418 km instead of QF39's previous 6,152 km alternative;
Medina–Jakarta is about 8,406 km instead of GA969's 8,637 km alternative. Northern Europe retains diversions around excluded areas.

Flights can leave a SID or join a STAR inside the outer gate when corridor geometry permits. Nearby services use their airport as the connector target; long services use a local point on the filed corridor, so Auckland flights are eligible too. The transition is selected from the actual
runway-specific procedure geometry to reduce total distance, with a forward-facing connector and clearance around the airport.
Initial climb and final approach remain intact; a required hold retains its metering fix. For TKG, the four runway/procedure
combinations tested leave the SID after about 15–23 km and join the STAR with about 36–49 km remaining, rather than visiting
the outer gate first. Selected-route lines include the shortened procedure and its connector. World/terminal handoffs share
an endpoint, project onto the actual route, and use bounded curve handles to avoid large S-bends.

Position is derived from the timetable and the terminal simulation. Tap an aircraft for local arrival time, remaining time,
and flight/aircraft history. Aircraft use a simulated climb/cruise/descent speed profile.

Route search retains the incoming segment as part of its state, so it can compare arrival headings before choosing the next
sector. Shortcut selection uses the same distance/turn cost instead of greedily taking the farthest visible point. Regional anchors remain mandatory, and shortcuts span at most 900 km. Long curated legs are filled at roughly 800 km intervals with nearby beacons where suitable, otherwise fictional coordinate fixes (`FIC`); these labels are not a claim of published real airways. Turn costs
are fictional equivalent-distance preferences, not fuel or wind calculations. `tools/world/route-quality.json` records physical
length, great-circle ratio, turn-aware score, enroute/terminal bends and exclusion checks for every direction and variant.
Run `node tools/world/audit-routes.js` to print a fresh report. Detours over 15% are review flags; Helsinki's diversion remains
because of the configured exclusions. Terminal-gate turns are distinguished from enroute doglegs because actual SID/STAR
geometry, including TKG's partial transitions, replaces that boundary connector in the simulator.

Run `node tools/tests/routing.cjs` to validate turn penalties, non-greedy shortcuts, coverage of every alternative, report freshness, all generated corridors, the former missed Iran/Black Sea crossings, TKG
partial procedures on both runway directions and both parallel runways, live track joins, and World handoff geometry.

Regenerate the data: `node tools/world/build-routes.js --embed` (routes; reads `beacons.json` and `avoid.json`, which `node tools/world/prep-data.js <navaids.csv> <node_modules>` produces from OurAirports and `world-atlas`) (routes, after editing the graph or timetable) and `node tools/world/build-basemap.js <node_modules>` (basemap; needs `world-atlas@2.0.2` and `topojson-client@3.1.0`).

**Destination runway terminals.** `tools/world/terminal-profiles.json` stores runway-end coordinates and headings for every scheduled destination. Build it from an OurAirports export with `node tools/world/build-terminal-profiles.js <airports.csv> <runways.csv>`, then rerun `node tools/world/build-routes.js --embed`. The route builder chooses the runway end that best matches each corridor's arrival or departure course and adds a 28 km runway-aligned final or 18 km initial climb segment. These terminal legs are simulated connectors, not published SIDs, STARs, or instrument approaches. A small number of source rows omit threshold coordinates; their derived threshold positions are marked `inferredThresholds` in the profile data.

### One map, three zoom levels (live tracking)

The World, airspace and airport maps now hand over to each other:
- **Zoom handoff.** Zoom the World view in over Jakarta (about 1 km per pixel) and the airspace map takes over at the same spot; zoom out of the airspace map and the World view returns. Ground and airspace already share one coordinate frame; the World view joins it through latitude/longitude.
- **One position per flight.** Arrivals leave the World map where their airspace track starts, and departures join it where their airspace track ends, so a flight is never in two places. The World view also draws the airspace-phase flights, at the positions the airspace map uses.
- **Track live.** Pick a flight on the flight board, press "Track live" on a live leg of the flight or aircraft history pages, or use "On world map" on the airport flight card. The map that suits the flight is chosen (world while it is far away, airspace in the terminal area, airport on the ground), the camera follows it, and the view changes as the flight passes from one to the next. Dragging the map stops the following; the card's Follow button resumes it.
- **Selected flight path.** The World view draws the selected flight's flown trail solid and a direct great-circle line from its current position to the destination dashed. Aircraft still follow the filed waypoints and procedure transitions; the dashed line is only a destination guide. Waypoint dots and fix labels are hidden; the solid trail still follows the actual routing. Other flights' routes stay hidden.
- **One marker.** The World view uses the airspace map's marker: the airline badge in a ring coloured by phase (arriving blue, departing orange, holding purple, 15+ min late red) with a heading pointer, and the same `GA45 FL390` tag. The airport map keeps the same airline badge on its aircraft, with its own ground-state ring colours (taxiing, pushback, holding, under tow, late).
- **Whole journey in the airspace map.** A selected arrival in the airspace map also shows its trail back to the origin along the World route; a departure shows its remaining dashed path towards the destination. In the World view the trail of a flight in the terminal area follows the airspace map's own flown path instead of a straight segment.
- **Gates follow the corridor.** The route generator selects the Jakarta gate for the default corridor, shared by World and terminal maps. Flights may use an interior SID/STAR transition when geometry permits; their route is not forced through that outer gate. The old per-city side in `AIR_CITY` remains a fallback.
- **Globe or flat map.** The World view has a Globe / Flat map button. The globe is an orthographic projection of the same data (land, borders, routes, trails, aircraft and the selected flight's trail): drag to rotate, wheel or pinch to zoom, and aircraft behind the horizon are hidden. Following a flight turns the globe to keep it centred, and zooming in over Jakarta hands over to the airspace map exactly as on the flat map. The choice is remembered in the browser.
- **One flight card.** The World view uses the same flight card as the airport and airspace maps (compact strip, tap to expand): airline, aircraft and registration, route progress, status, altitude, ground speed, heading, ATD / ETA in local time (as on the history pages), time to go, and links to the flight and aircraft history. Altitude and ground speed are estimates from the flight profile while the flight is on the World map. Jakarta is always JKT.
- **Selected flight stands out.** Selecting a flight fades every other aircraft on all three maps.
- **No corner at the handoff.** The world route joins the airspace track with a smooth curve that arrives along the airspace track's own heading, so the trail is one continuous line in both views.

Run `node tools/tests/world-tracking.cjs` to check terminal/timetable overlaps for GA731, GA847 and GA877, marker and altitude ownership, trail continuity and rewinds, rebuilt handoffs, and altitude-appropriate arrival status. Terminal poses take precedence over overlapping timetable estimates. When a handoff is unavailable, the selected trail shows the known terminal history until that shared endpoint is ready.
The same test checks KL7941, 5X6260 and GA736 around midnight: trails start on the runway, sample the complete simulated SID up to the aircraft, and retain the SID after the World handoff, including departures from the previous calendar day.

Run `node tools/tests/flight-telemetry.cjs` to check climb/descent continuity at terminal handoffs, GA24's altitude after its SID, bounded GA20/GA2 arrival estimates, and exact registration/sector agreement with aircraft history. The checks cover 7 and 10 November, including GA23's rendered registration link and the airborne ID7121 compact card. World altitude profiles inherit terminal entry/exit altitude and use elapsed climb time and remaining route distance. Overnight source arrivals do not carry their end-of-day stand locks into the daytime queue; arrival-delay averages and propagated aircraft histories therefore use finite operational delays. Aircraft pages identify the current airborne sector and label future sectors Scheduled.

**Jakarta departure bypass.** SIDs and early-exit connectors avoid a buffered envelope around Jakarta's mainland and the coastal polygons in the geoBoundaries reference. Southbound departures pass west or east of the province according to runway direction, retaining the initial runway-aligned climb. Rounded turns are checked for clearance too. These are simulator procedures, not published SIDs or official airspace restrictions. Run `node tools/tests/jakarta-departures.cjs` for all 72 SID variants and the live departure tracks. Boundary provenance and ODbL attribution are in `tools/world/jakarta-boundary.README.md`.

Southern arrivals retain the gate used by their filed World corridor, with the STAR and entry connector routed clear of the Jakarta envelope rather than substituting a western gate. The boundary test also covers 96 STAR variants and live entry connectors. Route generation includes literal additions and corrections to the live airport table, covering Samarinda and every scheduled destination. When a custom airport has no generated World route, its known terminal trail still draws.

Run `node tools/tests/arrival-trails-controls.cjs` for destination coverage, GA552's runway trail and missing-route fallback, QF1000/GA725 corridor handoffs, unresolved historical-event labels, and mobile tracking-button layout and actions. Past departures whose scheduled arrival has passed but whose inferred timeline remains unresolved show “Historical timing unavailable,” with blank event times, rather than an indefinite awaiting-departure state; explicit cancellations and recorded events retain their own status.

### Garuda European expansion — 9 November 2026

All five services use the Boeing 787-9 and Jakarta Terminal 2. Operating days below refer to departures from Jakarta; the paired inbound arrives in Jakarta the next day, after a planned two-hour outstation turn in the simulator's block-time model.

| Destination | Flights | Weekly returns | Jakarta departure days | JKT departure | JKT arrival next day |
| --- | --- | --- | --- | --- | --- |
| Vienna (VIE) | GA64 / GA65 | 4 | Mon, Wed, Fri, Sun | 00:20 | 04:40 |
| Athens (ATH) | GA66 / GA67 | 3 | Tue, Thu, Sat | 00:45 | 03:25 |
| Oslo (OSL) | GA68 / GA69 | 3 | Tue, Thu, Sat | 00:35 | 05:55 |
| Helsinki (HEL) | GA70 / GA71 | 4 | Mon, Wed, Fri, Sun | 00:55 | 04:25 |
| Prague (PRG) | GA72 / GA73 | 4 | Mon, Wed, Fri, Sun | 01:10 | 06:00 |

Times in the table are WIB. These are 18 round trips per week; existing Austrian and Finnair services remain. New airport records include IANA time zones and OurAirports runway profiles, and all five destinations have World corridors. An unused 737-800 registration reserve block is reassigned to 787-9 expansion; existing aircraft registrations are preserved. Weekly departures remain present on the ground even when their previous-day inbound does not operate on the viewed day.

Run `node tools/tests/europe-expansion.cjs` to check launch dates, all seven operating days, exact weekly totals, next-day returns on the same physical aircraft, two-hour outstation turns, stable fleet sizing and preservation of existing registrations.

### Arrival turn and final-approach model

Arrival connectors curve into the STAR along its heading. STARs pass the holding fix exactly, with matching entry/exit tangents and speed; holding-level changes are spread over time. Turn speeds are limited using a 25° coordinated-bank model and 0.5 m/s² acceleration/deceleration. Holding turns use the lower of standard rate or the same bank limit. The existing 72 m/s minimum approach speed is retained in the checked procedure set.

The STAR ends at the start of the runway simulation's final approach, approximately 6 km before the runway. Its last 13 km blend smoothly into that final segment's actual altitude and glide slope, rather than descending to zero and jumping back up at the handoff. The runway simulation still owns touchdown timing. Selected routes split at the current aircraft position, including curved connectors, holding loops and the remaining final approach.

Run `node tools/tests/approach-dynamics.cjs` for all 96 STAR variants, live arrival phase continuity, connector bank/speed bounds, QZ815's sampled turn/descent rates and selected-route endpoints. Set `APPROACH_CLOCK=2026-11-16T08:33` to check the expanded timetable. These are kinematic simulator checks, not a real-world aircraft-separation or flight-safety certification.

### Standard A350-900 allocation (8 November 2026)

The dated equipment amendment transfers 20 Garuda service pairs from A35K to standard A359. GA904/905 and GA906/907 Singapore retain A35K. Flight times and operating days are preserved, including existing approved retimings. Aircraft and flight histories display A359.

Run `node tools/tests/a359-reallocation.cjs` to check the effective-date boundary, schedule preservation, unique registrations and fleet allocation (27 A35K + 31 A359 including reserves).

### Garuda registration series

A35K: GJ/GW (GL overflow for larger historical fleets); A359: GT/GK; B789: GC/GO/GE; A339: GP/GH/GQ; B738: GM/GF/GN/GU/GD. GE and GQ are approved overflow blocks. Prefix each with PK- and append the allocator’s final letter (B excluded). The unused MAX allocation uses GR/GX so GD is reserved for B738. Registration assignments are shared by the map, aircraft history and flight history.

### Flight playback (single flight)
Every departed flight in the flight history and aircraft history has a "▶ Playback" button. It replays the flight across the airport, airspace and World maps with the existing tracker following it from map to map. A compact bar sits just below the map's own top controls (it moves out of the way of banners and chips): a play/pause button, a scrubber whose track is a ribbon of the flight's altitude with off-block and on-block marks, the clock, and a speed button that cycles 10×, 60×, 300× and 1200×. Space plays or pauses and the arrow keys step 5 minutes. The chart button opens more controls: back and forward 15 minutes, a segmented speed control, and a modelled altitude and ground-speed profile with a cursor you can drag. The flown trail is coloured by altitude (grey on the ground, then teal, blue, violet, pink and amber toward FL400; the legend is in the bar); the remainder stays dashed. Playback runs on a separate clock (`JN_CLK`) that the whole app reads as "now", so nothing is stored and it only works for dates the simulator can build. A flight from another day reloads the page on that date, and Exit returns to where you were. A link like `?pb=GA856&pbstd=<scheduled departure minute>&date=2026-11-10` opens straight into a replay. Altitude and speed are the simulator's model, not recorded data.

### Simple SID / STAR at destination airports
Every destination route now ends with a short simulated STAR and starts with a short simulated SID, so flights bend onto the runway instead of running straight into the airport. Arrival: an initial approach fix about 58 km out, an intermediate fix at 40 km and a final fix at 22 km on the centreline (labelled TERM-IAF / TERM-IF / TERM-ARR), then the threshold. Departure: the runway, a climb-out fix at 18 km and two SID fixes at 42 and 68 km that bend toward the first en-route fix (TERM-SID1 / TERM-SID2). The runway end is the one that best matches the route direction. Airports without runway data get a straight-in runway aligned with the route. These are generated by `tools/world/build-routes.js`, not published procedures; any procedure that would cross excluded airspace or turn too sharply falls back to the old straight final.

### Runway in use follows a preset wind
Each destination has its two runway directions built (the default end and the reciprocal, with its own STAR / SID). The World view picks the end in use from a simplified, deterministic preset wind: each region has a prevailing wind that changes with the season (monsoon, winter westerlies, trade winds), shifted by up to 45 degrees and by about half its speed per airport, day and eight-hour block of local solar time. The end with at least 4 knots more headwind is used, for arrivals and departures alike, and the flight card shows it ("RWY 06L at KIX · wind 329°/9 kt"). If the airport is passed first, the STAR flies a downwind and base leg; a take-off towards the wrong side turns back after a short climb. This is not real weather and it does not change Jakarta's own runway mode.

### Flight numbering (GA)
Flights are numbered in blocks by region, outbound even and the return the next odd number: 0xx Europe and long-haul, 1xx Sumatra, 2xx Java, 3xx Surabaya (328–399 are free and are the overflow block for new regional international services), 4xx Bali and Nusa Tenggara, 5xx Kalimantan (Johannesburg 558/559, Nairobi 560/561 and Addis Ababa 562/563 were renumbered here from 7xx, effective 1 Oct 2026), 6xx Sulawesi, Maluku and Papua, 7xx/8xx/9xx Asia, Oceania and the Middle East (full). A renumbering is a cancel plus a new service with the same times from the same date, so the old number keeps its history.

## Garuda app concept (`garuda/`)
A passenger-app concept built on the simulated Garuda timetable. Open `/garuda/`.

- **Search:** any origin and destination from the 153 cities Garuda serves, one way or return, adults / children / infants, cabin preference, and a price calendar showing the lowest fare per day.
- **Itineraries:** nonstop flights, and connections through Jakarta with minimum connection times (shorter for domestic, longer when changing between domestic and international, plus a terminal-change allowance). Arrival times are in local time with day offsets.
- **Results:** sort and filter, a date strip, flight details (legs, aircraft, layover, terminal change), inline fare families per cabin with consistently presented baggage, seat, change and refund rules.
- **Return trips:** pick the outbound, then the return, with the outbound kept visible.
- **Booking:** passenger names, a price breakdown (child 75%, infant 10%, taxes, airport charges), mock payment, and a booking record with one or more flights. Seats sold in this browser reduce availability.
- **Manage:** trips, trip details per leg, boarding pass per leg, and demo scenarios under Profile that simulate a delay, gate change, boarding or cancellation and the rebooking choices.

The timetable is `garuda/network.js`, generated by `node tools/garuda/build-network.js` from `tools/garuda/ga_raw.json` (the simulator's Garuda flights; multi-city tag flights are skipped). Fares are a deterministic model, not real prices. Simulated and not affiliated with Garuda Indonesia; nothing is booked or charged.

### Garuda Home redesign

Home uses Switzer, a deep-blue wing header and a next-journey card before the booking entry. The card selects the earliest ongoing/upcoming journey across saved bookings and changes its action for future travel, the simulated check-in window, boarding, airborne travel, delays and cancellations. Simulated check-in lets selected travellers review their assigned seats and baggage for the selected leg before opening their boarding passes. Other screens retain their existing layouts.

Navigation has Home, Book, Trips and Profile, with Inbox behind the bell and journey-updates shortcut. Profile contains the existing demo scenario menu. Two locally stored destination photographs link into booking. Font and photo sources are documented in `garuda/assets/README.md`.

Run `node tools/tests/garuda-home.cjs` for Home navigation, check-in/pass actions, journey states, destination links, image loading, keyboard activation, 320–1280px layout checks and demo-menu access. Booking/check-in state remains local to the running prototype.

### Garuda search redesign

Flight search follows Home’s Switzer typography and blue/white palette. A full-height airport picker supports city/code search, clearing, keyboard selection and cancellation; the route card provides a swap action. Dates share one range picker with departure/return tabs, two visible months, month navigation, fare hints, a night-count summary and an explicit Apply action. Traveller counts and preferred cabin share a draft sheet with the nine-seated-traveller and one-infant-per-adult limits. Closing either sheet discards its draft, including an unconfirmed change from one-way to return.

The search button stays below the scrolling form and above the safe area. Form selections survive airport-picker cancellation and navigation to results/Home and back. Search sheets trap keyboard focus, close with Escape and restore focus; cabin radios support arrow keys. Results retain their existing layout.

Run `node tools/tests/garuda-search.cjs` for picker/search/swap, date ranges, one-way/return drafts, passenger limits, cabin selection, keyboard behaviour, preserved form state and 320–1280px layouts. `garuda-home.cjs` covers the unchanged Home actions.

### Garuda results redesign

Results use Switzer and the same white/blue design as Home and Search. Flight cards show local times, journey duration, connections, explicit arrival-day changes and inclusive prices for the whole travelling party. Cabin and fare-family choices expand inside the card; checked baggage, seat selection, change and refund rules use the same fields for every fare. Nearby dates, sorting, filters, clear-filter recovery and flight-detail dialogs remain available.

During return selection, the chosen outbound stays visible and prices show the combined trip total. Returning to outbound restores its selected fare. Return options preceding the outbound arrival are excluded. A shared price calculation is used by results, review and mock booking confirmation. Browser-local cabin availability is computed consistently per flight leg and checked against the party’s seated travellers before selection and payment. This remains a simulated, session/browser-local booking model.

Run `node tools/tests/garuda-results.cjs` for inclusive adult/child/infant pricing through mock payment, inline fares, sort/filter behaviour, return selection and back navigation, connections/day offsets, availability guards and 320–1280px layout checks. Home and Search regressions also pass.

### Garuda review and traveller details

Booking now separates flight review, traveller details and final review/payment into three explicit steps. Flight review shows the itinerary and fare conditions; traveller entry contains grouped adult/child/infant cards and contact email; final review shows read-only traveller details, the itinerary, price breakdown and payment choice. A compact progress indicator and fixed action explain the next step. Names, birth dates, email and payment choice survive back navigation and fare changes; inactive traveller drafts retain their type/index association when counts change.

Names support single-name travellers. Children need a birth date matching age 2–11 at first departure; lap infants must remain under two through the last flight departure and are associated with an adult. Inline errors identify name, email and birth-date issues and move focus to the first invalid field. Submission validates inventory again, blocks incomplete flight selections and guards duplicate confirmation. The mock booking retains traveller/contact/payment metadata for later trip views. Details remain in the running prototype’s memory; no real payment or email is sent.

Billable fare and tax components are rounded to IDR 1,000 before summing, matching the UI’s currency precision so the displayed breakdown, results, review and confirmation reconcile.

Run `node tools/tests/garuda-review.cjs` for grouped drafts, payment/fare/back persistence, inline validation, birthday boundaries, price arithmetic, fixed confirmation layout and duplicate/incomplete submission guards. Results, Search and Home suites cover the surrounding flow.

### Garuda confirmation and empty startup

Fresh sessions start without bookings, past-trip fixtures or sample journey notifications. The previous automatic Osaka trip is removed; confirmation, trip and pass preview links and demo updates do not create a replacement. Home and Trips provide empty states, and demo operations require a booking the user creates. “Clear demo trips” clears session trips/updates and returns Home.

Confirmation shows the official Garuda logo, a unique session booking reference with copy/manual-selection fallback, actual outbound/return flights, traveller names, contact email, payment method and the confirmed total. The next-step message reflects the flight’s check-in/boarding state. “View your trip” remains visible below the scrolling receipt. Notifications resolve their booking by reference so adding another trip does not redirect an older notification to the wrong booking. This is still a browser/session prototype: no real payment or confirmation email is sent.

Run `node tools/tests/garuda-confirmation.cjs` for empty startup/history, a full round-trip booking, receipt data, copy fallback, next steps, unique references, notification targeting, no-booking preview/reset safety and 320–1280px layouts. Home’s booked-trip tests now create their fixture explicitly instead of depending on production sample data.

### Garuda Trips redesign

Trips groups actual bookings into upcoming and completed journeys, preserving booking identity when sorting. Cards show travel dates, route, status and a contextual check-in, boarding-pass, flight-update or booking-details action. Each booking has Overview, Manage and Booking details tabs. Overview groups outbound and return legs into a local-time timeline with connection duration, terminal changes and missed-connection warnings. Manage keeps flight/traveller selectors with seat, baggage and meal actions, contact-email editing and fare-rule support. Booking details holds the reference, traveller list and receipt information.

Services are scoped to the selected flight and traveller. Eligible seat changes use an interactive cabin map and update the assigned seat; baggage shows the booked allowance and meals retain the preference flow. Economy Lite and Value seat selection opens with check-in, while Standard, Flexi and other free-selection fares can select earlier. Draft seat/contact changes cancel without saving. Infants and past/cancelled flights have appropriate read-only handling. Bookings, seat assignments and preferences remain session-local prototype data. Normal date changes and refund requests are support-led; the app exposes fare rules and existing disruption options rather than claiming a request was completed.

Run `node tools/tests/garuda-trips.cjs` for actual booking grouping and identity, timeline/connection states, contextual actions, traveller/flight preference isolation, draft cancellation, infant/past handling, unique seats and 320–1280px layouts. Home, Search, Results, Review and Confirmation browser suites also pass.

### Garuda Home

Home uses a compact Garuda header and a journey card with the destination photograph behind readable flight details. When there is no upcoming flight, a manually controlled destination carousel presents four local-photo stories and links directly to flight search; recent searches can influence its order and featured cities are excluded from the separate discovery list. Book, trips, check-in and journey updates are available in both booked and unbooked states. Home keeps the next journey and its relevant check-in, boarding-pass or disruption action prominent. Checked-in departures display known terminal and gate details. Booking, check-in, trip management and journey updates are accessible from Home, including an unread update count. With no upcoming booking, check-in opens Trips rather than implying that a real booking can be retrieved in this session-only prototype. On desktop, the journey and travel essentials appear side by side.

### Desktop web layout

The Garuda app adapts to desktop screens with a branded top navigation bar, wider journey content and appropriately sized dialogs. Booking, check-in, trip management and updates use the same session and flows as the mobile layout. Mobile navigation and screen layouts remain available on smaller screens.

### Journey updates

Home, Trips, Inbox and boarding passes show flight-specific delay, gate and cancellation updates. The update screen compares scheduled and revised local times or gates, flags affected connections, and offers an explicit choice to keep a delayed flight. Short delays show the booked fare’s change rule and a possible fare difference; cancellations and simulated delays of at least three hours offer a same-cabin change with charges waived when the rest of the itinerary permits it. Waiting assistance varies with delay length, and compensation is described as dependent on the circumstances and applicable rules, not guaranteed. These thresholds and waivers are illustrative simulation policy, not legal eligibility determinations. A changed flight requires check-in again. Inbox messages identify their booking and flight, including when an older message refers to a flight that has since changed.

Refund information shows the booked fare rule without promising an amount or processing time. These actions and messages use session-local simulation data; no real booking change, refund or notification is sent. Run `node tools/tests/garuda-updates.cjs` for disruption consistency, choices, replacement-flight checks, notification identity and responsive layouts.

### Destination imagery throughout the passenger journey

A shared city-photo catalogue now connects Home discovery and the next-trip card with Search, Results, Review, Confirmation, Trips cards and trip details. Search follows the selected destination and route swaps; Results follows the active outbound/return direction. Connecting journeys use the final city, while Home's next-trip card follows the current journey direction. Review and confirmation use compact city/photo panels, leaving operational details and primary actions on solid surfaces.

The initial curated set covers Bali, Amsterdam, Osaka, Tokyo, Singapore, London and Sydney, with multiple airports sharing a photo only when they serve the same city. Destinations without a curated photo use the existing route text in Results and the location icon in Search; larger journey cards retain a branded city panel. Failed images hide cleanly without losing the destination name or changing the form layout. Files are local, compressed, explicitly sized, and listed with their sources/licence in `garuda/assets/README.md`; Trips card covers load lazily.

Run `node tools/tests/garuda-destinations.cjs` for catalogue decoding, search/swap, connection and return destination identity, booking-to-trip continuity, failed-image recovery and 320–1280px layouts. The six existing passenger browser suites also pass.

Return-results spacing: the selected outbound is an inset card, with a 16px gap before consistently sized date cards. The active date centres horizontally without scrolling the page; Change has a 44px minimum tap target. Results tests include the reported KNO–SUB return itinerary at 320, 390, 430 and 1280px, checking the gap, equal date-card heights, selected-date visibility and overflow. Return-flight prices explicitly say “Return trip total”.

Search and Results use compact destination thumbnails within their existing route information, replacing the separate city hero and repeated city title. Search retains its route-row height; Results uses a 64px image (52px on narrow screens), and hides the image area when no photo is available. Review and Confirmation panels are reduced to 76px. Larger destination covers remain in Home and Trips. Destination tests verify that Search and Results contain no separate destination panel, alongside route identity, failure recovery and responsive layout checks.

The city-photo library now covers 39 cities. The latest batch adds 12 Indonesian and 12 international destinations; the earlier set added Jakarta, Surabaya, Medan, Yogyakarta, Bangkok, Kuala Lumpur, Hong Kong and Paris. Sources, photographers, licences and cropping are documented in the asset README and linked from Photo credits in the app. Jakarta imagery is available when it is the selected or returning destination.

Fresh flight searches keep Jakarta as origin and leave the destination unselected (“Choose destination”); Osaka is no longer prefilled. Search and Swap remain disabled until both airports are valid, with no premature validation alert. Dates/travellers can still be edited, and calendar fare hints appear only after a route is chosen. Explicit Home destination links and a customer's selected route remain preserved. Browser fixtures choose their own destinations instead of relying on an application default.


### Garuda check-in and boarding passes

Check-in has four draft steps: travellers, seat selection, baggage review and confirmation. Only selected travellers on the selected flight are checked in, and their seat choices commit together with check-in. Closing before confirmation discards the draft; already checked-in travellers stay checked in. Lap infants stay linked to their accompanying adult and receive no separate seat. Baggage acknowledgement is required before final review, and booking totals stay unchanged.

Boarding passes use the shared Switzer/blue-and-white design and official logo. Flight and traveller selectors, previous/next controls, checked-in counts and a remaining-travellers action support families and connecting/return flights. The pass keeps the traveller name in its original order and shows the local departure date/time, flight, seat, boarding time, fare and booking reference. Jakarta gates/terminals use the simulator values; other departure airports remain unconfirmed. Baggage is accessible below the pass. The inactive Wallet button is removed.

A static demo QR code appears only for a checked-in traveller on a non-cancelled flight that has not departed. It contains a generic demo message, no passenger data, and is explicitly marked **DEMO — NOT VALID FOR TRAVEL**. Cancelled/departed passes are inactive, unchecked travellers see a check-in state, and rebooking clears the previous flight’s check-in. The 48-hour opening window and domestic/international cutoffs are rechecked at confirmation. Check-in/pass state remains session-local, with no real airline integration or travel document issuance.

Run `node tools/tests/garuda-checkin.cjs` for partial issuance, cancelled drafts, zero selection, adult/infant linkage, seat/baggage review, traveller/flight switching, live delay/gate updates, cancellation/departure/rebooking states, cutoff revalidation, long names and 320–1280px layouts. The existing seven passenger browser suites also pass, with Home and Trips covering the guided check-in entry.


### Simulated cabin maps and guided journeys

`garuda/seat-map.js` provides one seat model for booking defaults, Manage booking, check-in and boarding passes. It includes ATR 72-600, 737-800, 787-9, A330-900, A350-900 and A350-1000 layouts, scoped to the booked cabin. Narrow-body Economy uses 3–3, ATR uses 2–2, A330 Economy uses 2–4–2, and 787/A350 Economy uses 3–3–3; Premium and Business use their own banks and row ranges. These are explicitly simulated configurations, not certified cabin plans. No real airline inventory is consulted.

The map shows rows, seat letters, aisles, window/aisle positions, available seats, the current choice, other members of the party and unavailable seats. Keyboard arrows/Home/End navigate available buttons; choosing a seat is a separate action. Assignments are stored by traveller and flight leg. Other bookings in the same browser session reserve their seats on the same scheduled flight and date. Saving revalidates occupancy, cabin, duplicate assignments and selection eligibility; a conflict returns check-in to the map. Changing to another flight requires reopening the draft. Rebooking clears old check-in and seat assignments, and new assignments are generated for the replacement cabin.

`garuda/flows.css` holds the shared progress indicators, maps and Manage booking layout. A seat change made in Manage booking or confirmed during check-in is reflected on that traveller’s pass. Free choices do not change the fare, and infants never receive a separate seat. Flight alternatives preserve cabin availability. Contact updates validate email and remain local to the simulated booking; no message is sent.

Run `node tools/tests/garuda-guided-journeys.cjs` for separated checkout steps, draft/back persistence, four-step check-in, all aircraft/cabin models, seat changes/cancellation, occupancy conflict recovery, fare restrictions, keyboard navigation, contact actions, booking tabs and 320–1280px layouts. The eight surrounding passenger suites also pass. `tools/tests/garuda-flow-helpers.cjs` advances the explicit steps in end-to-end fixtures.

The guided flow also preserves the Economy cabin-experience page and its four Economy fare families (Lite, Value, Standard and Flexi). Its trip seat action opens the current flight’s actual seat map. Outbound round-trip pricing, additional-fare return selection and layovers up to 18 hours remain as defined in the latest timetable/search flow.


### Passenger journey refinements

The Economy fare selector links to the cabin experience through a compact photo preview for widebodies and an icon for aircraft without representative cabin photography. Booking management uses the same deep-blue journey header, soft surfaces and rounded service cards as Home and Trips; Overview retains its destination photograph. Flight/traveller selectors appear when a choice exists.

Seat maps keep their traveller/seat summary in the fixed footer instead of covering scrolling rows. Single-traveller seat selection avoids an unnecessary dropdown; selectors for groups and multi-leg journeys use a clearly sized, keyboard-accessible control. Boarding passes omit selectors when there is only one traveller and flight, and show the static demo QR code described above. Search, fare rules, seat assignment and traveller/pass switching behaviour remain covered by the existing browser suites.

## Garuda loader (`garuda/loader.css`, `garuda/loader.js`)
A branded wait (an animated wing mark, a message and a progress bar) shown on the steps that would take a moment in a real app: a short splash once per browser session, "Finding flights for you" after Search, "Confirming your seats / Issuing your e-tickets" on payment, "Checking you in", and "Updating your booking" when rebooking. It respects `prefers-reduced-motion`. Automated test runs skip the waits; add `?loader=1` to a URL to force them.

## Garuda e-ticket (`garuda/eticket.css`, `garuda/eticket.js`)
Every confirmed booking has a travel itinerary and receipt, laid out on the Singapore Airlines receipt pattern in Garuda colours: passenger names, a reference box (booking reference, one ticket number per traveller, date and place of issue, payment, total), a teal bar per flight with times, terminals, status, aircraft, baggage and seats, and the fare conditions for each fare type. It opens from the confirmation screen and from a trip (Manage and Booking details tabs) and is hidden for fully cancelled bookings. "Print or save as PDF" uses the browser's print function, and the print styles lay it out as one A4 page. Ticket numbers (126-…) are made up from the booking reference, the airport is shown as "Jakarta International", and the page carries a "Simulated – not valid for travel" mark in the footer. The colour logo is `garuda/assets/garuda-logo-colour.png`. Test: `tools/tests/garuda-eticket.cjs`.

## Pricing settings and the Pricing Lab (`garuda/pricing-lab.html`)
All fare constants live in one object, `PRICE_CFG`, in `garuda/index.html` (defaults in `PRICE_DEFAULTS`): base fare per minute in the air for international and domestic flights, time-of-day multipliers, a booking curve by days before departure (piecewise between 0, 1, 3, 7, 14, 21, 30 and 60 days), a day-of-week multiplier, holiday-season multipliers (year-end, Chinese New Year, Lebaran, mid-year school holidays; the dates are illustrative and live in `SEASON_WINDOWS`), a small random demand factor, the fare-type multipliers (Lite, Value, Standard, Flexi, Premium Economy, Business), child and infant percentages, PPN, airport charges and the connection discount. A connection is priced as one trip from its great-circle distance (never below its longest flight, never above the two flights added less 6%); airports carry coordinates for this (`tools/garuda/build-network.js` writes them into `garuda/network.js`). A return trip gets a discount that depends on the market (5% domestic, 8% international up to five flying hours, 12% long-haul; settings also hold 8% for open-jaw and circle trips, used once multi-city booking exists), 6% more when the stay is two nights or fewer, 7% less when the stay includes a Saturday night, and 4% more beyond 30 nights (each direction is still priced on its own date, with its own season, weekday and booking curve). Children pay 75% of the adult fare on trips with an international flight and 100% on domestic trips, PPN has separate settings for domestic and international trips (both 11% for now), and airport charges depend on the departure airport (Jakarta international, Jakarta domestic, other Indonesian airports, airports abroad). The airport charge amounts, the child and round-trip percentages and PPN on international trips are assumptions to be checked against Garuda's real rules. In the Pricing Lab, the "Original model" button restores the first version of the prices (flat calendar, flights simply added, flat charges).

`/garuda/pricing-lab.html` is an internal page that loads the app's own engine and lets you review it: a step-by-step price breakdown for any route and date, a booking curve (with and without the day-to-day demand factor), a 120-day calendar heat map and a route table. Every setting can be edited live. "Save to this browser" makes the app use the edited values on that device, and "Reset to defaults" clears them. The page is not linked from the app. Test: `tools/tests/garuda-pricing.cjs`.

### Seat inventory and load
Each flight has a seat capacity per cabin, taken from the cabin layouts in `garuda/seat-map.js` (`seatLayout`, less the seats the map blocks). Every flight and date gets an expected final load factor (by cabin, raised by peak times, weekdays and holidays, with a little random spread) and a share of that load that is sold by each day before departure. The cabin's sold share moves along a price ladder, so a flight that is filling costs more than an empty one, and a last-minute premium sits on top. Seats booked in the app (and seats moved by a rebooking or a cancellation) change the sold count, so booking a flight makes it dearer and "Full" appears when the cabin is sold out. "Left at this fare" is the number of seats before the next price step. The Pricing Lab shows capacity, expected load, seats sold and the ladder for each flight, and the settings let you tune them; the "Original model" button switches the load model off.

## Sales counter (`garuda/agent.html`, `garuda/agent.css`, `garuda/agent.js`)
A desktop tool for staff who sell and issue tickets in person (a ticket office or airport counter). It is deliberately plain and dense, unlike the passenger app.
- **Sell**: quick entry (`JKT SIN 12DEC 19DEC 2A1C`, press `/` to focus it) or a form; one table per direction with all fare families side by side, seats left and "seats at this fare"; a price strip for the days either side; a sticky quote with the fare, PPN, airport charges, round-trip adjustments and the fare rules to read to the customer; then passengers, payment (cash with change, EDC card, QRIS, bank transfer) and issue, with the e-ticket printed from the engine frame (place of issue shows the counter).
- **Bookings**: find by reference, name or route; print the e-ticket; cancel and refund by the fare rules (seats go back on sale).
- **Shift**: sales, refunds and net by payment method, a cash drawer with opening float, expected cash and difference, and close shift.
- **Shared with the passenger app**: it loads `index.html` in a hidden frame and uses its pricing engine, seat inventory (`ga-sold`) and e-ticket, so a seat sold here changes prices there. The Pricing Lab settings apply too.
- **Storage**: counter bookings are in this browser (`ga-agent-bookings`, `ga-agent-shift`, `ga-agent-closed`). The passenger app keeps its own bookings in memory only, so counter bookings do not yet appear in its "Trips". A shared backend (Supabase) is the planned next step.
- Not built yet: sign-in, seat selection at the counter, changes and reissues, discount overrides with approval, commissions, multi-city.
- Test: `tools/tests/garuda-agent.cjs`. This guided flow is the "Guided sell" tab.

### Sales terminal (the default tab of `garuda/agent.html`, `garuda/agent-term.js`)
A GDS-style command screen (Amadeus, Sabre and Galileo flavour) on the same engine. The command set is simplified and Garuda-specific, not real GDS syntax. Type `HE` for the list.
- Availability and sell: `AN21DECJKTSIN` (class letters with seats per line, equipment, duration, via), `AN28DEC` (reverses the pair for the return), `SS2Y1` (2 seats, class Y, line 1). Classes: Y Flexi, S Standard, V Value, L Lite, W Premium Economy, C Business Saver, J Business Flex.
- Booking elements: `NM2WIJAYA/RINA/BUDI`, child `NM1WIJAYA/SARI(CHD/01JUN18)`, infant `(INF/20AUG25)`, `AP+62...`, `APE-x@y.com`, `TKOK` or `TKTL25NOV`, `RFRINA`, `XE3` and `XE2-3`, `IG`. Elements are numbered and shown in the side panel with a live quote and a "next" hint.
- `FQD` fare quote (with round-trip adjustments), `FQN` fare rules, `ER` save (needs name, itinerary, contact, ticketing and received-from; creates a **held** booking: seats are taken now and released when the ticketing time limit passes), `FPCASH[/amount]`, `FPCC`, `FPDC`, `FPQRIS`, `FPTRF`, `ET` issue (ticket numbers), `EP` print the e-ticket.
- `RT<locator>`, `RT<surname>` (pick from a list with `RT<line>`), `XI` then `XIY` (refund by fare rules, or release seats for a held booking), `QT` held bookings by time limit, `RH` history, `DACSIN`, `DAN SINGAPORE`, `JD`, `CL`. Arrow up and down recall earlier entries.
- Held bookings expire by themselves (checked at load and every minute). The Bookings tab shows Held, Ticketed, Cancelled and Expired.
- Not built yet: work areas, sign-in, seat map (`SM`), changes and reissues (`XI` and rebuild only), ticketing queues beyond `QT`, SSR and remarks elements.
- Test: `tools/tests/garuda-agent-terminal.cjs`.
