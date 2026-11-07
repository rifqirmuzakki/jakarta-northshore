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

Shows the Jakarta flights that are in the air right now on a world map (Natural Earth basemap, public domain), all airlines, Garuda highlighted ("GA only" filter). Aircraft sit on typical routings, not great-circle arcs: each destination follows a hand-curated corridor graph (`tools/world/graph.js`) chosen with a small jet-stream cost (eastbound is cheaper than westbound, so the track out and the track back can differ). Long routes have up to three genuinely different airways (for example Europe via Central Asia or via the Gulf and Egypt); each flight keeps one of them for the day, the usual track taking most flights. Outbound keeps to the right of its track and inbound to the left, and inbound leans to the other airway, so the two directions are mostly flown apart. Airspace we do not route through (Russia, Ukraine and Belarus, Iran, Iraq, Syria, the Black Sea) simply has no node. Routes are approximate, not real airways. Multi-stop destinations are drawn to the first city.

Position is derived from the timetable (airborne from STD+14 min to STA−8 min), delays of the viewed day included. Tap an aircraft for its card (arrival in local time, time to go, links to flight and aircraft history). Pan, pinch or wheel to zoom; Esc closes the card, then the view.

Routing runs over a network of about 3,600 real VOR beacons (OurAirports `navaids.csv`, public domain), each joined to its near neighbours, plus a few hand-made waypoints over oceans and sparse regions. Each destination gets the cheapest paths through it (distance, with a jet-stream bias so eastbound is cheaper than westbound), up to three genuinely different corridors per direction; Russia, Ukraine, Belarus, Iran, Iraq, Syria and the Black Sea are never crossed (Natural Earth borders). Selected flights show the beacon names along their track. The tracks are inferred from beacon positions, not the published airway database, which is not open data. Aircraft fly a speed profile (slow climb and descent, full speed in cruise) and a flight number keeps its airway.

Regenerate the data: `node tools/world/build-routes.js --embed` (routes; reads `beacons.json` and `avoid.json`, which `node tools/world/prep-data.js <navaids.csv> <node_modules>` produces from OurAirports and `world-atlas`) (routes, after editing the graph or timetable) and `node tools/world/build-basemap.js <node_modules>` (basemap; needs `world-atlas@2.0.2` and `topojson-client@3.1.0`).
