# jakarta-northshore
Jakarta Northshore simulator hosted with GitHub Pages

## Operations (the "Operations" button)
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
