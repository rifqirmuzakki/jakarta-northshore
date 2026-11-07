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

### One map, three zoom levels (live tracking)

The World, airspace and airport maps now hand over to each other:
- **Zoom handoff.** Zoom the World view in over Jakarta (about 1 km per pixel) and the airspace map takes over at the same spot; zoom out of the airspace map and the World view returns. Ground and airspace already share one coordinate frame; the World view joins it through latitude/longitude.
- **One position per flight.** Arrivals leave the World map where their airspace track starts, and departures join it where their airspace track ends, so a flight is never in two places. The World view also draws the airspace-phase flights, at the positions the airspace map uses.
- **Track live.** Pick a flight on the flight board, press "Track live" on a live leg of the flight or aircraft history pages, or use "On world map" on the airport flight card. The map that suits the flight is chosen (world while it is far away, airspace in the terminal area, airport on the ground), the camera follows it, and the view changes as the flight passes from one to the next. Dragging the map stops the following; the card's Follow button resumes it.
- **Selected flight path.** The World view draws the selected flight's flown trail solid and a direct great-circle line from its current position to the destination dashed. Aircraft still follow the filed waypoints and procedure transitions; the dashed line is only a destination guide. Selected-route fixes appear as dots, with labels when zoom and spacing permit; other flights' routes stay hidden.
- **One marker.** The World view uses the airspace map's marker: the airline badge in a ring coloured by phase (arriving blue, departing orange, holding purple, 15+ min late red) with a heading pointer, and the same `GA45 FL390` tag. The airport map keeps the same airline badge on its aircraft, with its own ground-state ring colours (taxiing, pushback, holding, under tow, late).
- **Whole journey in the airspace map.** A selected arrival in the airspace map also shows its trail back to the origin along the World route; a departure shows its remaining dashed path towards the destination. In the World view the trail of a flight in the terminal area follows the airspace map's own flown path instead of a straight segment.
- **Gates follow the corridor.** The route generator selects the Jakarta gate for the default corridor, shared by World and terminal maps. Flights may use an interior SID/STAR transition when geometry permits; their route is not forced through that outer gate. The old per-city side in `AIR_CITY` remains a fallback.
- **One flight card.** The World view uses the same flight card as the airport and airspace maps (compact strip, tap to expand): airline, aircraft and registration, route progress, status, altitude, ground speed, heading, ATD / ETA in local time (as on the history pages), time to go, and links to the flight and aircraft history. Altitude and ground speed are estimates from the flight profile while the flight is on the World map. Jakarta is always JKT.
- **Selected flight stands out.** Selecting a flight fades every other aircraft on all three maps.
- **No corner at the handoff.** The world route joins the airspace track with a smooth curve that arrives along the airspace track's own heading, so the trail is one continuous line in both views.
