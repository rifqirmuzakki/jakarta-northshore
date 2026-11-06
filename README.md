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
