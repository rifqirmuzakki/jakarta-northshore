# jakarta-northshore
Jakarta Northshore simulator hosted with GitHub Pages

## Schedule changes (Flight Manager)
The built-in schedule is never edited. Changes are small dated records (`add`, `amend`, `cancel`) applied on top of it when the
viewed date falls inside `[from, to]`:

* **Browser**: use *Manage flights* in the app. Changes are saved in this browser (`localStorage`).
* **Repo**: *Changes > Export for repo* downloads `schedule-changes.js`; commit it to the repo root to share the changes on every device,
  then clear your local copy. The file is loaded before the simulator starts.
* **Impact preview**: *Preview impact* runs the whole simulation with the candidate change in a hidden copy of the app and shows the
  effect on fleet size, flights without an aircraft, weekly round trips and stands before you save.
* **Recovery**: open the page with `?nochanges=1` to ignore all changes.

Record shape: `{id, v:1, scope:'timetable', kind, from:'YYYY-MM-DD', to:null|'YYYY-MM-DD', note, createdAt, ...}`. The same log is
meant to carry operational events later (delays, strikes, aircraft swaps) and to be persisted as history.
