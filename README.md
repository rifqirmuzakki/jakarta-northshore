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

**You decide; the controller is the fallback.** Each open alert shows a deadline ("decide by 17:55 or the controller acts"): 60 minutes
after the incident is known, shortened when the next departure is close (never under 15 minutes). In *Handle* you pick the intervention
(swap equipment, bring in a spare, or wait) and see its effect on both aircraft first. Any aircraft of the same type that is on the ground
at Jakarta and ready in time (arrival plus minimum turn) can take over a departure; the two aircraft exchange their next flights, terminals
follow the flight. If nobody decides before the deadline, the rule-based controller acts (swap if it saves 30+ minutes, spare for long
outages, otherwise wait). Decisions depend only on the incident, never on the viewed date, so past days always play out the same way.
Alerts show them as *Handled by the controller*; *Review* explains the choice and *Stand the controller down* reopens the incident
(saved as a `veto` record). Deciding first wins. Set the controller to *Never* in the hub (or `?controller=manual`) to decide everything yourself.

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
