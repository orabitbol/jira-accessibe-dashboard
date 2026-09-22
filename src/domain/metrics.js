// Pure aggregation helpers (no React, no network).
import { teamForIssue, myTeam, sprintOnMyBoard, stripSprintPrefix } from "../../teams.config.js";

export const DAY = 86400000;
export const STUCK_DAYS = 5;          // time in ONE WORKING status longer than this => "stuck" flag
export const NOT_STARTED_FLAG_DAYS = 2; // still in To Do with <= this many days left in sprint => "at risk"
export const MISS_THRESHOLD = 0.8;    // delivered < 80% of committed => "missed"

// Non-working days for "workdays" math — Sunday=0 ... Saturday=6 (JS Date#getDay).
// Israeli work week: Sun–Thu, weekend = Fri+Sat. This is what Stage Analysis
// uses to match eazyBI's own "workdays" cycle-time convention (eazyBI's
// account-level calendar setting itself could not be independently verified —
// no admin access to eazyBI's Source Data settings — so this is our best,
// team-appropriate assumption; flagged in the eazyBI comparison notes).
export const WEEKEND_DAYS = new Set([5, 6]); // Fri, Sat

// ms of the [from,to) interval that fall on a workday — closed-form (full
// weeks counted directly, at most a 6-day remainder walked), NOT a day-by-day
// loop across the whole span. This matters: it's called both on sprint-sized
// windows (Stage Analysis, a couple weeks) AND on a ticket's FULL lifetime
// (My Impact's lead time, which for an old carried-over ticket can be months
// or years) — a per-day loop over a multi-year span, or over bad/garbled
// date data, would be slow enough to visibly freeze the page. This is O(1).
export function workdayMs(fromMs, toMs) {
  if (fromMs == null || toMs == null || !Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) return 0;

  const workdaysPerWeek = 7 - WEEKEND_DAYS.size;
  const dayStartOf = (t) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
  const isWorkday = (t) => !WEEKEND_DAYS.has(new Date(t).getDay());

  const fromDayStart = dayStartOf(fromMs);
  const toDayStart = dayStartOf(toMs);

  if (fromDayStart === toDayStart) return isWorkday(fromMs) ? toMs - fromMs : 0;

  let total = 0;
  // Partial first day: [fromMs, end of that calendar day).
  if (isWorkday(fromMs)) total += (fromDayStart + DAY) - fromMs;

  // Full calendar days in between: [fromDayStart + DAY, toDayStart) — counted
  // in whole weeks, plus at most a 6-day remainder (never the full span).
  const fullDaysStart = fromDayStart + DAY;
  const fullDaysCount = Math.round((toDayStart - fullDaysStart) / DAY);
  if (fullDaysCount > 0) {
    const startWeekday = new Date(fullDaysStart).getDay();
    const fullWeeks = Math.floor(fullDaysCount / 7);
    const remainder = fullDaysCount % 7;
    total += fullWeeks * workdaysPerWeek * DAY;
    for (let i = 0; i < remainder; i++) {
      if (!WEEKEND_DAYS.has((startWeekday + i) % 7)) total += DAY;
    }
  }

  // Partial last day: [toDayStart, toMs).
  if (isWorkday(toDayStart)) total += toMs - toDayStart;

  return total;
}

export const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Story Points: the team fills "Story Points" (customfield_10032); some older
// items only have "Story point estimate" (customfield_10016). Prefer 10032,
// fall back to 10016. Returns 0 when neither is set (treated as unestimated).
export const storyPoints = (issue) => num(issue.fields.customfield_10032 ?? issue.fields.customfield_10016);

export const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
export function median(a) {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
export const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const ms = (s) => (s ? new Date(s).getTime() : null);
const isDone = (issue) => {
  const st = issue.fields && issue.fields.status;
  return !!(st && st.statusCategory && st.statusCategory.key === "done");
};

// Was this ticket ever moved BACK OUT of Done (found not actually finished,
// a bug slipped through, etc.)? "Done" is the only statusCategory=done
// status on this workflow (see the STATUS_MAP / colorForStatus comment
// below), so a transition with `from === "Done"` is unambiguous — no
// separate per-transition category data exists in Jira's changelog, so this
// is the only way to tell without an extra API call. Purely a visibility
// signal: it does NOT change committed/added/removed/done math anywhere —
// isDone()/doneInSprint already reflect the ticket's CURRENT status, so a
// reopened-and-still-open ticket already correctly shows as open, not done.
// This just makes the fact that it regressed visible instead of silent.
function wasReopened(cl) {
  return !!(cl && Array.isArray(cl.transitions) && cl.transitions.some((tr) => tr.from === "Done"));
}

export function latestSprint(issue) {
  const arr = issue.fields && issue.fields.customfield_10020;
  if (!Array.isArray(arr) || !arr.length) return null;
  return arr.reduce((a, b) => (b && (!a || b.id > a.id) ? b : a), null);
}
// Workdays from creation to resolution (weekends excluded — same convention
// as Stage Analysis, so "lead time" here and "cycle time" there don't quietly
// use two different day-conventions for the same underlying idea).
export function leadDays(issue) {
  const c = issue.fields && issue.fields.created;
  const r = issue.fields && issue.fields.resolutiondate;
  if (!c || !r) return null;
  const cMs = new Date(c).getTime(), rMs = new Date(r).getTime();
  if (rMs < cMs) return null;
  const d = workdayMs(cMs, rMs) / DAY;
  return d >= 0 ? d : null;
}
export const shortSprint = (name) => stripSprintPrefix(name).replace(/Sprint /i, "S");
// True if a sprint belongs to my team's board (filters out other-project sprints
// a teammate happened to work in). Defined in teams.config.js because it also
// has to honour a team's LEGACY board — the board it lived on before a split —
// so history doesn't disappear the day the team moves. When boardId is unknown,
// don't filter.
const onMyBoard = sprintOnMyBoard;

/* ----------------------------- Sprints ----------------------------------- */
// Build my team's sprint list from the sprint field across issues.
export function myTeamSprints(issues) {
  const map = new Map();
  for (const n of issues) {
    if (teamForIssue(n) !== myTeam.name) continue;
    const arr = n.fields && n.fields.customfield_10020;
    if (!Array.isArray(arr)) continue;
    for (const sp of arr) {
      if (!sp || sp.id == null || !onMyBoard(sp)) continue;
      if (!map.has(sp.id)) map.set(sp.id, { id: sp.id, name: sp.name, state: sp.state, startDate: sp.startDate, endDate: sp.endDate, completeDate: sp.completeDate });
    }
  }
  return [...map.values()].sort((a, b) => (ms(a.startDate) || a.id) - (ms(b.startDate) || b.id));
}
export function currentSprint(sprints) {
  const active = sprints.filter((s) => s.state === "active");
  if (active.length) return active[active.length - 1];
  const closed = sprints.filter((s) => s.state === "closed");
  if (closed.length) return closed[closed.length - 1];
  return sprints[sprints.length - 1] || null;
}

// Where the sprint is right now — the shared timeline anchor every duration
// on this page should be read against (e.g. "5 days in review" only means
// something once you know whether 5 days is 10% or 80% of the sprint).
export function sprintProgress(sprint, now = Date.now()) {
  if (!sprint) return null;
  const start = ms(sprint.startDate);
  const end = ms(sprint.endDate);
  if (start == null || end == null) return null;
  const totalDays = Math.max(1, round((end - start) / DAY, 1));
  const elapsedMs = clamp(now, start, end) - start;
  const elapsedDays = round(elapsedMs / DAY, 1);
  const pct = clamp(Math.round((elapsedMs / (end - start)) * 100), 0, 100);
  const daysLeft = Math.ceil((end - now) / DAY);
  const done = sprint.state === "closed" || now > end;
  return { totalDays, elapsedDays, pct, daysLeft, done, dayNumber: Math.min(totalDays, Math.max(1, Math.ceil(elapsedMs / DAY))) };
}

// Workday-only counterpart to sprintProgress's elapsedDays, used specifically
// to read Stage Analysis's workday figures against "how much of the sprint
// has elapsed" on the SAME unit (workdays) — sprintProgress itself stays
// calendar-based since the sprint clock/countdown is a calendar concept.
export function sprintElapsedWorkdays(sprint, now = Date.now()) {
  const start = ms(sprint && sprint.startDate);
  if (start == null) return null;
  const end = ms(sprint && (sprint.completeDate || sprint.endDate));
  const clampedNow = end != null ? Math.min(now, end) : now;
  if (clampedNow <= start) return 0;
  return round(workdayMs(start, clampedNow) / DAY, 1);
}

// First sprint counted as "under your leadership" for the My Impact tab.
// A leadership transition rarely lands exactly on a sprint boundary, so if
// managerSince falls INSIDE a sprint's window, credit starts from the sprint
// right before it too (you were already substantively running that one).
// This resolves to a fixed point in time (anchored to managerSince + the
// historical sprint list), so it does NOT keep sliding forward as later
// sprints become active. Expects `sprints` sorted ascending by start date.
export function leadershipStartSprint(sprints, managerSince) {
  if (!sprints.length) return null;
  const managerMs = new Date(managerSince).getTime();
  const containingIdx = sprints.findIndex((s) => {
    const start = ms(s.startDate);
    const end = ms(s.completeDate || s.endDate);
    return start != null && end != null && managerMs >= start && managerMs < end;
  });
  if (containingIdx >= 0) return sprints[containingIdx - 1] || sprints[containingIdx];
  // managerSince falls in a gap (or after the last known sprint) — first sprint starting on/after it.
  return sprints.find((s) => { const start = ms(s.startDate); return start != null && start >= managerMs; }) || null;
}

/* --------------------------- Status board (light) ------------------------- */
// "Time in current status" from statuscategorychangedate — NO changelog needed.
export function enrichBoard(issues, now = Date.now()) {
  return issues.map((n) => {
    const f = n.fields;
    const sinceCat = ms(f.statuscategorychangedate) || ms(f.updated) || ms(f.created);
    const inCurrentDays = round((now - sinceCat) / DAY, 1);
    const ageDays = round((now - ms(f.created)) / DAY, 1);
    const sp = latestSprint(n);
    const due = f.duedate ? new Date(f.duedate + "T23:59:59").getTime() : null;
    const sprintEnd = sp && sp.endDate ? ms(sp.endDate) : null;
    const target = due != null ? due : sprintEnd;
    const remainingDays = target != null ? round((target - now) / DAY, 1) : null;
    const statusName = f.status && f.status.name;

    // A To-Do/backlog item simply hasn't started — that's NOT a delay.
    // "Stuck" only counts for working statuses; "not started" only escalates
    // when the sprint is almost over.
    const notStarted = NOT_STARTED.has(statusName);
    const blockers = blockersOf(n);
    const dueOver = due != null && now > due;
    const sprintEnded = sprintEnd != null && now > sprintEnd;
    const stuckInWork = !notStarted && inCurrentDays >= STUCK_DAYS;
    const daysLeftSprint = sprintEnd != null ? round((sprintEnd - now) / DAY, 1) : null;
    const notStartedLate = notStarted && daysLeftSprint != null && daysLeftSprint >= 0 && daysLeftSprint <= NOT_STARTED_FLAG_DAYS;

    const reasons = [];
    if (dueOver) reasons.push(`Past due date by ${Math.abs(remainingDays)}d`);
    if (blockers.length) reasons.push(`Blocked by ${blockers.join(", ")}`);
    if (stuckInWork) reasons.push(`Stuck in "${statusName}" for ${inCurrentDays}d`);
    if (sprintEnded) reasons.push("Sprint ended and item is still open");
    if (notStartedLate) reasons.push(`Not started, ${daysLeftSprint}d left in sprint`);

    let level = "ok";
    if (dueOver || blockers.length || stuckInWork || sprintEnded) level = "bad";
    else if (notStartedLate) level = "warn";

    let stateLabel = null, stateClass = null;
    if (level === "bad") { stateClass = "bad"; stateLabel = blockers.length ? "Blocked" : "Delayed"; }
    else if (level === "warn") { stateClass = "warn"; stateLabel = "At risk"; }
    else if (notStarted) { stateClass = "neutral"; stateLabel = "Not started"; }
    // normal working items get no chip — the status pill already says it

    return {
      key: n.key, webUrl: n.webUrl, summary: f.summary,
      assignee: f.assignee ? f.assignee.displayName : "Unassigned",
      assigneeId: f.assignee ? f.assignee.accountId : "none",
      avatar: f.assignee && f.assignee.avatarUrls ? f.assignee.avatarUrls["24x24"] : null,
      team: teamForIssue(n), type: f.issuetype && f.issuetype.name, priority: f.priority && f.priority.name,
      project: f.project && f.project.key, status: statusName, created: f.created,
      inActiveSprint: !!(sp && sp.state === "active"), sprintName: sp ? sp.name : null,
      sprintStart: sp ? sp.startDate : null, sprintEnd: sp ? sp.endDate : null,
      points: storyPoints(n), inCurrentDays, ageDays, remainingDays,
      remainingBasis: due != null ? "due" : sprintEnd != null ? "sprint" : null,
      notStarted, level, stateLabel, stateClass,
      delayed: level === "bad", reasons,
    };
  });
}
export function blockersOf(issue) {
  const links = (issue.fields && issue.fields.issuelinks) || [];
  const out = [];
  for (const l of links) {
    if (l.type && l.type.inward === "is blocked by" && l.inwardIssue) {
      const st = l.inwardIssue.fields && l.inwardIssue.fields.status;
      if (!(st && st.statusCategory && st.statusCategory.key === "done")) out.push(l.inwardIssue.key);
    }
  }
  return out;
}

/* ---------------------- Sprint commitment / health ------------------------ */
// Was `sprintId` part of this comma-set of sprint IDs (from the "Sprint"
// changelog field — see splitIds() in lib/jira-core.js)?
const inSprintSet = (ids, sprintId) => Array.isArray(ids) && ids.includes(String(sprintId));

// The real answer to "was this issue part of the ORIGINAL commitment when
// the sprint started, added to the plan later, or pulled back out again?" —
// replayed from the issue's own "Sprint" field changelog (`cl.sprintChanges`)
// rather than guessed from its creation date. An issue moved into an already-
// running sprint from the backlog, or pulled back out mid-sprint, is exactly
// the case the old created-date heuristic got wrong: it only ever noticed
// issues that were CREATED after the sprint started, and had no way at all to
// notice a pre-existing issue being dragged in or out later.
//
// `cl` (that issue's changelog) is loaded LAZILY today (Stage Analysis's
// "load" button) — until it is, this falls back to the previous heuristic so
// nothing regresses; once loaded, the real history takes over automatically.
export function sprintMembership(issue, cl, sprint) {
  const start = ms(sprint && sprint.startDate);
  const created = ms(issue.fields && issue.fields.created);
  const sprintId = sprint && sprint.id;
  const events = cl && Array.isArray(cl.sprintChanges) && cl.sprintChanges.length
    ? [...cl.sprintChanges].sort((a, b) => new Date(a.at) - new Date(b.at))
    : null;

  if (!events || sprintId == null || start == null) {
    const addedDuringSprint = start != null && created != null && created > start + DAY;
    return { committedAtStart: !addedDuringSprint, addedDuringSprint, removedDuringSprint: false, known: false };
  }

  let state = events[0].fromIds; // membership right before the earliest logged change
  let committedAtStart = null;
  let removedDuringSprint = false;
  for (const ev of events) {
    const at = new Date(ev.at).getTime();
    const wasIn = inSprintSet(state, sprintId);
    if (committedAtStart == null && at > start) committedAtStart = wasIn;
    if (at > start && wasIn && !inSprintSet(ev.toIds, sprintId)) removedDuringSprint = true;
    state = ev.toIds;
  }
  if (committedAtStart == null) committedAtStart = inSprintSet(state, sprintId); // sprint started after every logged event

  return { committedAtStart, addedDuringSprint: !committedAtStart, removedDuringSprint, known: true };
}

// Sprint-commitment state (met/missed/ontrack/atrisk/behind) for one attainment ratio.
function commitmentState(attainment, closed, elapsed) {
  if (closed) return attainment >= MISS_THRESHOLD ? "met" : "missed";
  if (attainment >= elapsed - 0.05) return "ontrack";
  if (attainment >= elapsed - 0.25) return "atrisk";
  return "behind";
}

// Per-developer commitment vs delivery for one sprint. Two INDEPENDENT
// attainment lenses are always computed: `pointsAttainment` (SP done ÷ SP
// committed) and `completionAttainment` (items done ÷ items committed,
// ignoring points entirely). `mode` ("points" | "completion") just picks
// which one drives the back-compat `attainment`/`state` fields.
// `changelogByKey` (optional, keyed by issue key) supplies each issue's real
// "Sprint" field history — see sprintMembership() above. Pass in whatever's
// already been loaded (e.g. Stage Analysis's lazy changelog cache); issues
// without a loaded changelog yet still get a sane answer via the fallback
// heuristic inside sprintMembership(), they just don't benefit from the real
// add/remove detection until it's fetched.
export function sprintCommitment(sprintIssues, sprint, mode = "points", now = Date.now(), onlyTeam = myTeam.name, changelogByKey = {}) {
  const start = ms(sprint && sprint.startDate);
  const end = ms(sprint && (sprint.completeDate || sprint.endDate));
  const closed = sprint && sprint.state === "closed";
  const people = new Map();
  const get = (a) => {
    const id = a ? a.accountId : "none";
    if (!people.has(id)) people.set(id, {
      id, name: a ? a.displayName : "Unassigned", avatar: a && a.avatarUrls ? a.avatarUrls["24x24"] : null,
      committedPts: 0, addedPts: 0, removedPts: 0, donePts: 0, totalPts: 0, committedItems: 0,
      totalItems: 0, doneItems: 0, carryOver: 0, addedMid: 0, removedItems: 0, noEstimate: 0,
      addedDoneItems: 0, addedDonePts: 0, reopenedItems: 0,
      openItems: [], doneList: [], lateList: [], removedList: [], addedDoneList: [], reopenedList: [], carryOverList: [],
    });
    return people.get(id);
  };
  for (const n of sprintIssues) {
    if (onlyTeam && teamForIssue(n) !== onlyTeam) continue;
    const f = n.fields;
    const p = get(f.assignee);
    const pts = storyPoints(n);
    // committedAtStart / addedDuringSprint / removedDuringSprint — see
    // sprintMembership() for how this is derived. Deliberately does NOT feed
    // committedPts/committedItems for a removed item: what was pulled back
    // out of the sprint after being committed shouldn't count against what
    // the developer is being measured on, but it's still tracked (removed*)
    // so the churn itself stays visible.
    const cl = changelogByKey[n.key];
    const mem = sprintMembership(n, cl, sprint);
    const done = isDone(n);
    const doneInSprint = done && (!closed || (ms(f.resolutiondate) != null && (end == null || ms(f.resolutiondate) <= end + DAY)));
    // How many sprints (total) has this ticket EVER been assigned to —
    // Jira's Sprint field just keeps accumulating every sprint an issue was
    // ever in, so length > 1 means "carried over at least once", and the
    // exact count is "this is its Nth sprint" — e.g. sprintCount: 3 means
    // this is the third sprint in a row it's shown up in, unfinished each
    // time. We only MEASURE a person against the CURRENT sprint (this
    // function is always called scoped to one sprint); an unfinished ticket
    // simply becomes part of next sprint's OWN committed baseline once it's
    // carried there — sprintCount is purely a visibility label on top of
    // that, so a manager can tell "still open" apart from "still open for
    // the 4th sprint running" at a glance.
    const sprintCount = Array.isArray(f.customfield_10020) ? f.customfield_10020.length : 1;
    const carried = sprintCount > 1;
    const reopened = wasReopened(cl);

    p.totalItems += 1; p.totalPts += pts;
    if (pts === 0) p.noEstimate += 1;
    const item = { key: n.key, webUrl: n.webUrl, summary: f.summary, status: f.status && f.status.name, pts, missing: pts === 0, type: f.issuetype && f.issuetype.name, reopened, sprintCount };
    // Cuts ACROSS the added/removed/committed split below — a reopened
    // ticket can be in any of those three buckets. Visibility only (see
    // wasReopened() above for why this never touches the attainment math).
    if (reopened) { p.reopenedItems += 1; p.reopenedList.push(item); }
    if (carried) { p.carryOver += 1; p.carryOverList.push(item); }

    // Three mutually-exclusive buckets — added / removed / original-commitment
    // — each carries its OWN done/late/open split. This matters: an item
    // ADDED mid-sprint that then gets closed must NOT land in `doneItems`/
    // `donePts` (the attainment numerator), because it was never part of
    // `committedItems`/`committedPts` (the denominator) — mixing them let a
    // developer's attainment climb past 100% just by closing extra,
    // never-committed-to work (e.g. "6/5 tasks · 120%"). Finished added
    // items are real, visible work — tracked in addedDone* — they just don't
    // feed the say/do ratio, same principle as removed items not hurting it.
    if (mem.addedDuringSprint) {
      p.addedMid += 1; p.addedPts += pts;
      if (doneInSprint) { p.addedDoneItems += 1; p.addedDonePts += pts; p.addedDoneList.push(item); }
      else if (done) p.lateList.push(item);
      else p.openItems.push(item);
    } else if (mem.removedDuringSprint) {
      p.removedItems += 1; p.removedPts += pts; p.removedList.push(item);
    } else {
      p.committedPts += pts; p.committedItems += 1;
      if (doneInSprint) { p.doneItems += 1; p.donePts += pts; p.doneList.push(item); }
      else if (done) p.lateList.push(item); // done now, but completed after the sprint ended — carry-over
      else p.openItems.push(item);
    }
  }
  const elapsed = start != null && end != null && end > start ? clamp((now - start) / (end - start), 0, 1) : 0.5;
  // finalize
  return [...people.values()].map((p) => {
    const pointsBase = p.committedPts || p.totalPts || 0;
    const pointsAttainment = pointsBase > 0 ? p.donePts / pointsBase : (p.totalItems ? p.doneItems / p.totalItems : 0);
    const itemsBase = p.committedItems || p.totalItems || 0;
    const completionAttainment = itemsBase > 0 ? p.doneItems / itemsBase : 0;
    const pointsState = commitmentState(pointsAttainment, closed, elapsed);
    const completionState = commitmentState(completionAttainment, closed, elapsed);
    const attainment = mode === "completion" ? completionAttainment : pointsAttainment;
    const state = mode === "completion" ? completionState : pointsState;
    return {
      ...p,
      committedPts: round(p.committedPts, 1), addedPts: round(p.addedPts, 1), removedPts: round(p.removedPts, 1),
      donePts: round(p.donePts, 1), totalPts: round(p.totalPts, 1), addedDonePts: round(p.addedDonePts, 1),
      pointsAttainment: round(pointsAttainment * 100, 0), completionAttainment: round(completionAttainment * 100, 0),
      pointsState, completionState,
      attainment: round(attainment * 100, 0), state,
    };
  }).filter((p) => p.totalItems > 0).sort((a, b) => a.attainment - b.attainment);
}

// All of the team's tickets in one sprint, grouped done / not-done (for drill-down).
export function sprintTickets(sprintIssues, sprint, onlyTeam = myTeam.name) {
  const start = ms(sprint && sprint.startDate);
  const end = ms(sprint && (sprint.completeDate || sprint.endDate));
  const closed = sprint && sprint.state === "closed";
  const done = [], late = [], open = [];
  let noEstimate = 0;
  for (const n of sprintIssues || []) {
    if (onlyTeam && teamForIssue(n) !== onlyTeam) continue;
    const f = n.fields;
    const pts = storyPoints(n);
    if (pts === 0) noEstimate += 1;
    const doneNow = isDone(n);
    const inSprint = doneNow && (!closed || (ms(f.resolutiondate) != null && (end == null || ms(f.resolutiondate) <= end + DAY)));
    const item = {
      key: n.key, webUrl: n.webUrl, summary: f.summary, status: f.status && f.status.name,
      pts, missing: pts === 0, type: f.issuetype && f.issuetype.name,
      assignee: f.assignee ? f.assignee.displayName : "Unassigned",
    };
    if (inSprint) done.push(item);
    else if (doneNow) late.push(item);
    else open.push(item);
  }
  return { done, late, open, noEstimate };
}

// Multi-sprint commitment matrix + recurring-miss detection.
export function commitmentTrend(perSprint) {
  // perSprint: [{ sprint, rows: sprintCommitment(...) }] oldest->newest, closed sprints meaningful
  const devs = new Map();
  for (const { sprint, rows } of perSprint) {
    for (const r of rows) {
      if (r.id === "none") continue;
      if (!devs.has(r.id)) devs.set(r.id, { id: r.id, name: r.name, points: [] });
      devs.get(r.id).points.push({ sprint: sprint.name, attainment: r.attainment, state: r.state, closed: sprint.state === "closed" });
    }
  }
  return [...devs.values()].map((d) => {
    const closed = d.points.filter((p) => p.closed);
    const misses = closed.filter((p) => p.state === "missed").length;
    // Average only over COMPLETED sprints — the in-progress sprint is partial
    // and would otherwise drag the average down misleadingly.
    const avg = closed.length ? round(mean(closed.map((p) => p.attainment)), 0) : null;
    const recurring = closed.length >= 2 && misses >= Math.ceil(closed.length / 2);
    return { ...d, avg, misses, closedCount: closed.length, recurring };
  }).sort((a, b) => (b.recurring - a.recurring) || ((a.avg == null ? 101 : a.avg) - (b.avg == null ? 101 : b.avg)));
}

// Team-level committed vs. actually-delivered, one pair per sprint — the
// literal "what we promised next to what we finished" chart a manager would
// ask for, at a glance across sprints (as opposed to commitmentTrend()
// above, which is the per-developer % breakdown). Both lenses (points and
// items) are always returned side by side, same convention as sprintCommitment.
export function teamCommitmentSeries(perSprint) {
  // perSprint: [{ sprint, rows: sprintCommitment(...) }] oldest->newest
  return perSprint.map(({ sprint, rows }) => ({
    id: sprint.id, name: sprint.name, closed: sprint.state === "closed",
    committedPts: round(rows.reduce((a, r) => a + r.committedPts, 0), 1),
    donePts: round(rows.reduce((a, r) => a + r.donePts, 0), 1),
    committedItems: rows.reduce((a, r) => a + r.committedItems, 0),
    doneItems: rows.reduce((a, r) => a + r.doneItems, 0),
  }));
}

/* --------------------------- Planning (future) ---------------------------- */
// My team's upcoming sprints (active or future) derived from open issues.
export function planningSprints(openIssues) {
  const map = new Map();
  for (const n of openIssues) {
    if ((n.fields.project && n.fields.project.key) !== myTeam.key) continue;
    const arr = n.fields.customfield_10020;
    if (!Array.isArray(arr)) continue;
    for (const sp of arr) {
      if (!sp || sp.id == null || !onMyBoard(sp)) continue;
      if (sp.state !== "active" && sp.state !== "future") continue;
      if (!map.has(sp.id)) map.set(sp.id, { id: sp.id, name: sp.name, state: sp.state, startDate: sp.startDate, endDate: sp.endDate });
    }
  }
  // active first, then future by start/id
  return [...map.values()].sort((a, b) => {
    if (a.state !== b.state) return a.state === "active" ? -1 : 1;
    return (ms(a.startDate) || a.id) - (ms(b.startDate) || b.id);
  });
}
export function defaultPlanningSprint(sprints) {
  return sprints.find((s) => s.state === "future") || sprints.find((s) => s.state === "active") || sprints[0] || null;
}
const hasEstimate = (issue) => storyPoints(issue) > 0;

export function planningRows(openIssues, sprintId) {
  return openIssues
    .filter((n) => { const sp = latestSprint(n); return sp && sp.id === sprintId; })
    .map((n) => {
      const f = n.fields;
      return {
        key: n.key, webUrl: n.webUrl, summary: f.summary,
        assigneeId: f.assignee ? f.assignee.accountId : "none",
        assignee: f.assignee ? f.assignee.displayName : "Unassigned",
        avatar: f.assignee && f.assignee.avatarUrls ? f.assignee.avatarUrls["24x24"] : null,
        type: f.issuetype && f.issuetype.name, status: f.status && f.status.name,
        priority: f.priority && f.priority.name,
        points: storyPoints(n), missing: !hasEstimate(n),
      };
    })
    .sort((a, b) => (b.missing - a.missing) || a.assignee.localeCompare(b.assignee));
}
export function planningStats(rows) {
  const missing = rows.filter((r) => r.missing).length;
  const people = new Set(rows.map((r) => r.assignee)).size;
  const points = round(rows.reduce((a, r) => a + r.points, 0), 1);
  return { total: rows.length, missing, estimated: rows.length - missing, people, points };
}

/* -------------------- Manager impact (before / after) --------------------- */
// Per-sprint team summary (velocity / attainment / lead / bugs), tagged
// before/after the manager date. Needs sprint issues loaded. Both attainment
// lenses are always computed; `mode` picks which one drives `attainment`.
export function sprintSummaries(sprints, sprintIssuesById, managerMs, mode = "points") {
  const out = [];
  for (const sp of sprints) {
    const issues = sprintIssuesById[sp.id];
    if (!issues) continue;
    const rows = sprintCommitment(issues, sp, mode);
    const committedPts = rows.reduce((a, r) => a + r.committedPts, 0);
    const donePts = rows.reduce((a, r) => a + r.donePts, 0);
    const committedItems = rows.reduce((a, r) => a + r.committedItems, 0);
    const doneItems = rows.reduce((a, r) => a + r.doneItems, 0);
    const totalItems = rows.reduce((a, r) => a + r.totalItems, 0);
    const mineDone = issues.filter((n) => teamForIssue(n) === myTeam.name && isDone(n));
    const leads = mineDone.map(leadDays).filter((v) => v != null);
    const bugsDone = mineDone.filter((n) => n.fields.issuetype && n.fields.issuetype.name === "Bug").length;
    const when = ms(sp.startDate);
    const pointsAttainment = committedPts ? Math.round((donePts / committedPts) * 100) : (totalItems ? Math.round((doneItems / totalItems) * 100) : 0);
    const completionAttainment = committedItems ? Math.round((doneItems / committedItems) * 100) : (totalItems ? Math.round((doneItems / totalItems) * 100) : 0);
    out.push({
      id: sp.id, name: sp.name, startDate: sp.startDate, endDate: sp.endDate, state: sp.state,
      hasDate: when != null, after: when != null && when >= managerMs,
      committedPts: round(committedPts, 1), donePts: round(donePts, 1), committedItems,
      pointsAttainment, completionAttainment,
      attainment: mode === "completion" ? completionAttainment : pointsAttainment,
      doneItems, totalItems,
      leadMedian: round(median(leads), 1),
      bugRatio: mineDone.length ? Math.round((bugsDone / mineDone.length) * 100) : 0,
    });
  }
  return out.sort((a, b) => (ms(a.startDate) || a.id) - (ms(b.startDate) || b.id));
}

// Average a list of per-sprint summaries (used for baseline vs since-leadership).
export function averageSummaries(list) {
  if (!list || !list.length) return null;
  const avg = (sel) => round(mean(list.map(sel)), 1);
  return {
    count: list.length,
    attainment: Math.round(mean(list.map((s) => s.attainment))),
    pointsAttainment: Math.round(mean(list.map((s) => s.pointsAttainment))),
    completionAttainment: Math.round(mean(list.map((s) => s.completionAttainment))),
    velocity: avg((s) => s.donePts),
    throughput: avg((s) => s.doneItems),
    lead: avg((s) => s.leadMedian),
    bug: Math.round(mean(list.map((s) => s.bugRatio))),
  };
}

/* ----------------- Time-in-status from changelog (windowed) --------------- */
// Accumulates time per status, CLIPPED to [windowStart, endRef] so a sprint
// view only counts time that actually elapsed inside the sprint (this is what
// stops "To Do" from showing months of pre-sprint backlog time).
export function statusDurations(transitions, createdISO, fallbackStatus, opts = {}) {
  const now = opts.now != null ? opts.now : Date.now();
  const endRef = opts.endRef != null ? opts.endRef : now;
  const created = new Date(createdISO).getTime();
  const windowStart = opts.windowStart != null ? opts.windowStart : created;
  const byStatus = {};
  // Workday-only clip (excludes weekends) to match eazyBI's cycle-time convention.
  const clip = (a, b) => workdayMs(Math.max(a, windowStart), Math.min(b, endRef));
  const add = (st, a, b) => { if (st) byStatus[st] = (byStatus[st] || 0) + clip(a, b); };
  const tr = [...(transitions || [])].sort((a, b) => new Date(a.at) - new Date(b.at));
  if (!tr.length) { add(fallbackStatus, created, endRef); return { byStatus, currentStatus: fallbackStatus, currentSince: created }; }
  let prev = created, cur = tr[0].from || fallbackStatus;
  for (const t of tr) { const at = new Date(t.at).getTime(); add(cur, prev, at); prev = at; cur = t.to; }
  add(cur, prev, endRef);
  return { byStatus, currentStatus: cur || fallbackStatus, currentSince: prev };
}

// Chronological lifecycle of one ticket: ordered segments [{status, days, from, to}].
// Includes the To-Do/wait time so it can be shown distinctly on a timeline.
export function statusSegments(transitions, createdISO, fallbackStatus, now = Date.now()) {
  const created = new Date(createdISO).getTime();
  const tr = [...(transitions || [])].sort((a, b) => new Date(a.at) - new Date(b.at));
  const raw = [];
  if (!tr.length) {
    raw.push({ status: fallbackStatus, from: created, to: now });
  } else {
    let prev = created, cur = tr[0].from || fallbackStatus;
    for (const t of tr) { const at = new Date(t.at).getTime(); raw.push({ status: cur, from: prev, to: at }); prev = at; cur = t.to; }
    raw.push({ status: cur, from: prev, to: now });
  }
  // merge consecutive same-status, drop empties
  const merged = [];
  for (const s of raw) {
    const last = merged[merged.length - 1];
    if (last && last.status === s.status) last.to = s.to;
    else merged.push({ ...s });
  }
  // `from`/`to` stay real calendar timestamps (milestone dates need them),
  // but `days` is workdays — same convention as Stage Analysis, so the same
  // ticket can't show two different day-counts in two different views.
  return merged
    .map((s) => ({ status: s.status, from: s.from, to: s.to, days: round(workdayMs(s.from, s.to) / DAY, 1) }))
    .filter((s) => s.to - s.from > 0);
}

// Generic: given a sorted-by-time list of change events ({at, from, to}) and
// an initial value (falls back to the first event's `from` when present,
// else `fallbackInitial`), builds contiguous UNMERGED segments
// [{value, from, to}] (ms epoch) spanning the whole [createdMs, nowMs] life
// of the ticket. Shared by the status timeline and the ownership timeline
// below so the two can be intersected minute-for-minute.
function rawSegments(events, createdMs, fallbackInitial, nowMs) {
  const sorted = [...(events || [])].sort((a, b) => new Date(a.at) - new Date(b.at));
  if (!sorted.length) return [{ value: fallbackInitial, from: createdMs, to: nowMs }];
  const out = [];
  let prev = createdMs, cur = sorted[0].from != null ? sorted[0].from : fallbackInitial;
  for (const e of sorted) { const at = new Date(e.at).getTime(); out.push({ value: cur, from: prev, to: at }); prev = at; cur = e.to; }
  out.push({ value: cur, from: prev, to: nowMs });
  return out;
}

// Sweep-line intersection of two segment lists spanning the SAME overall
// range. Returns [{from, to, a, b}] — `a`/`b` are the two lists' values
// active during that slice.
function intersectSegments(a, b) {
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    const from = Math.max(a[i].from, b[j].from);
    const to = Math.min(a[i].to, b[j].to);
    if (to > from) out.push({ from, to, a: a[i].value, b: b[j].value });
    if (a[i].to < b[j].to) i++;
    else if (b[j].to < a[i].to) j++;
    else { i++; j++; }
  }
  return out;
}

// Per-person time-in-status, scoped to a single sprint's window.
//
// Tickets currently sitting in a "non-work" status (Archived, etc. — see
// NON_WORK_STATUSES) are shelved/no-longer-relevant, not real engineering
// effort. They're pulled out of `stages`/`items`/`cycleDays` entirely so they
// can't masquerade as a work stage or drag the average cycle time around —
// but they are NOT silently dropped: each person gets an `excluded` list
// (ticket + status) and `excludedCount` so the UI can show exactly what was
// left out and why. Any historical time a still-active ticket spent in a
// non-work status (e.g. briefly archived, then reopened) is stripped from
// its segments the same way, for the same reason.
//
// A ticket that changed hands mid-sprint (reassigned) has its time-in-status
// split between whoever actually held it when — NOT credited/blamed entirely
// on whoever holds it right now. `items` (the "N items" count) still counts
// against the CURRENT assignee only, since that reflects what's on their
// plate today; only the historical time itself is split.
export function stageStatsByPerson(issues, changelogByKey, sprint, now = Date.now()) {
  const windowStart = ms(sprint && sprint.startDate);
  const sprintEnd = ms(sprint && (sprint.completeDate || sprint.endDate));
  const windowEnd = sprintEnd != null ? Math.min(sprintEnd, now) : now;
  const people = new Map();
  const getPerson = (id, name, avatar) => {
    if (!people.has(id)) people.set(id, { id, name, avatar, byStatus: {}, items: 0, excluded: [], changed: [], reopened: [] });
    return people.get(id);
  };
  for (const n of issues) {
    const a = n.fields.assignee; if (!a) continue;
    const p = getPerson(a.accountId, a.displayName, a.avatarUrls ? a.avatarUrls["24x24"] : null);
    const statusName = n.fields.status && n.fields.status.name;
    if (NON_WORK_STATUSES.has(statusName)) {
      p.excluded.push({ key: n.key, webUrl: n.webUrl, summary: n.fields.summary, status: statusName });
      continue;
    }
    p.items += 1;
    const cl = changelogByKey[n.key];
    // Reassigned / re-estimated / re-scoped mid-flight? Tracked against the
    // CURRENT owner (who you'd click into from this card) so nothing about
    // this ticket's history is hidden — see changeSummary().
    const cs = changeSummary(cl);
    if (cs.changed) p.changed.push({ key: n.key, webUrl: n.webUrl, summary: n.fields.summary, ...cs });
    // Same "was this ever moved back out of Done" signal used in
    // sprintCommitment() — see wasReopened() — surfaced here too so Stage
    // Analysis and Goal Attainment agree on which tickets regressed instead
    // of each section only knowing about its own half of the picture.
    if (wasReopened(cl)) p.reopened.push({ key: n.key, webUrl: n.webUrl, summary: n.fields.summary, status: statusName });
    const created = ms(n.fields.created);
    const res = ms(n.fields.resolutiondate);
    const endRef = res != null ? Math.min(res, windowEnd) : windowEnd;
    const reassignments = cl && cl.reassignments;

    if (!reassignments || !reassignments.length) {
      // Fast path: this ticket had one owner the whole time — same as before.
      const dur = statusDurations(cl && cl.transitions, n.fields.created, statusName, { windowStart, endRef, now });
      for (const [st, m] of Object.entries(dur.byStatus)) {
        if (NON_WORK_STATUSES.has(st)) continue;
        p.byStatus[st] = (p.byStatus[st] || 0) + m;
      }
      continue;
    }

    // Reassigned at some point: build the status timeline and the ownership
    // timeline independently, then intersect them so each slice of time is
    // attributed to (whoever held it) × (whatever status it was in).
    const statusRaw = rawSegments(cl.transitions, created, statusName, now);
    const ownerRaw = rawSegments(
      reassignments.map((r) => ({ at: r.at, from: r.fromId, to: r.toId })),
      created, "none", now
    );
    const ownerNames = { [a.accountId]: { name: a.displayName, avatar: a.avatarUrls ? a.avatarUrls["24x24"] : null } };
    for (const r of reassignments) {
      if (r.fromId && !ownerNames[r.fromId]) ownerNames[r.fromId] = { name: r.fromName, avatar: null };
      if (r.toId && !ownerNames[r.toId]) ownerNames[r.toId] = { name: r.toName, avatar: null };
    }
    const clip = (x, y) => workdayMs(Math.max(x, windowStart), Math.min(y, endRef));
    for (const seg of intersectSegments(statusRaw, ownerRaw)) {
      const dur2 = clip(seg.from, seg.to);
      if (dur2 <= 0) continue;
      if (NON_WORK_STATUSES.has(seg.a)) continue; // seg.a = status at that slice
      const ownerId = seg.b; // seg.b = owner (accountId) at that slice
      if (!ownerId || ownerId === "none") continue; // unassigned gap — nobody to credit
      const info = ownerNames[ownerId] || { name: "Unknown", avatar: null };
      const op = getPerson(ownerId, info.name, info.avatar);
      op.byStatus[seg.a] = (op.byStatus[seg.a] || 0) + dur2;
    }
  }
  return [...people.values()].map((p) => {
    const stages = Object.entries(p.byStatus).map(([status, m]) => ({ status, days: round(m / DAY, 1) })).filter((s) => s.days > 0).sort((a, b) => b.days - a.days);
    const total = round(stages.reduce((a, b) => a + b.days, 0), 1);
    // Roll the detailed per-status stages up into eazyBI's own stage buckets
    // (Development / Code Review / QA / Product Review / Release) so the two
    // can be compared apples-to-apples. To-Do/Backlog (NOT_STARTED) and
    // Blocked (PAUSED_STATUSES — the board groups it with pre-work, not
    // active development) never get a bucket. Anything else genuinely
    // unmapped (a status the board config didn't have at research time)
    // falls into "Other active work" rather than silently vanishing, so this
    // total can never quietly drift from `cycleDays` below.
    const groupTotals = {};
    let otherDays = 0;
    for (const s of stages) {
      if (NOT_STARTED.has(s.status) || PAUSED_STATUSES.has(s.status)) continue;
      const g = stageGroupForStatus(s.status);
      if (g) groupTotals[g] = (groupTotals[g] || 0) + s.days;
      else otherDays += s.days;
    }
    const groups = STAGE_GROUPS.map((g) => ({ key: g.key, label: g.label, days: round(groupTotals[g.key] || 0, 1) })).filter((g) => g.days > 0);
    if (otherDays > 0) groups.push({ key: "other", label: "Other active work", days: round(otherDays, 1) });
    // Cycle time = time once work actually started — excludes To-Do/backlog
    // wait and Blocked/paused time. Defined as the sum of `groups` (not
    // filtered independently) so the two numbers can never disagree.
    const cycle = round(groups.reduce((a, g) => a + g.days, 0), 1);
    return { ...p, stages, groups, total, cycleDays: cycle, cyclePerItem: p.items ? round(cycle / p.items, 1) : 0, excludedCount: p.excluded.length, changedCount: p.changed.length, reopenedCount: p.reopened.length };
  }).sort((a, b) => b.total - a.total);
}

// Ensure every declared team member shows up in a CURRENT-sprint view, even
// with zero items — e.g. a manager who does little hands-on coding some
// sprints shouldn't just vanish from the roster. `makeEmpty(member)` builds
// the zero-stat placeholder shape expected by the specific view (DevCard row
// vs Stage Analysis card). Intentionally NOT used for historical trend data
// (commitmentTrend/sprintSummaries) — there, "no row" correctly means "no
// data for that sprint" and forcing a 0% entry would be misleading.
export function fillMissingMembers(rows, members, makeEmpty) {
  const have = new Set(rows.map((r) => r.id));
  const extra = (members || []).filter((m) => !have.has(m.id)).map(makeEmpty);
  return [...rows, ...extra];
}

// Did this ticket change hands, get re-estimated, or have its content edited
// mid-flight? Used for the "changed" badge + drill-down on ticket cards.
// Purely derived from the same changelog already fetched for stage analysis
// — no extra Jira calls.
export function changeSummary(changelog) {
  const reassignments = (changelog && changelog.reassignments) || [];
  const pointsChanges = (changelog && changelog.pointsChanges) || [];
  const contentChanges = (changelog && changelog.contentChanges) || [];
  return {
    reassignments, pointsChanges, contentChanges,
    changed: reassignments.length > 0 || pointsChanges.length > 0 || contentChanges.length > 0,
  };
}
// Statuses that represent "not started yet" — excluded from cycle time.
export const NOT_STARTED = new Set(["To Do", "Backlog", "Selected for Development", "Open", "Reopened"]);
// Statuses that mean the ticket was shelved/cancelled/no-longer-relevant —
// not real work. Kept out of Stage Analysis (see stageStatsByPerson above).
// Extend this list if the workflow grows more dead-end statuses
// (e.g. "Won't Do", "Duplicate", "Rejected").
export const NON_WORK_STATUSES = new Set(["Archived"]);

// Statuses the board itself treats as pre-work, not active development —
// source: board column mapping (ACR board 2022, inherited unchanged from the
// Engine & Widget board 397 it was split out of) → Board settings → Columns →
// "Blocked" is mapped into the same "To Do" column as Open/To Do, not into
// "In Progress". Excluded from cycle time for the same reason NOT_STARTED
// is: paused/waiting time isn't work actually happening on the ticket.
export const PAUSED_STATUSES = new Set(["Blocked"]);

// Raw Jira statuses rolled up into eazyBI's own cycle-time stage buckets.
// Derived from the same board's column mapping (Board settings → Columns,
// checked 2026-07-20): "Research" shares the IN PROGRESS column with
// "In Progress" → both are "Development"; "Ready for QA" + "In QA" share the
// QA column; "Product review" + "Ready for release" share the PRE-RELEASE
// column but eazyBI's own Workflow Distribution report tracks them as two
// separate measures ("Product Review %" / "Release %"), so they're kept
// separate here too. Statuses with no bucket (To Do, Blocked, Done, Archived)
// intentionally have no active-work stage.
//
// NOTE: the Board settings page renders every status name in ALL CAPS
// (a CSS text-transform, not the real value) — it already caused one real
// mismatch here ("Product review" is lowercase in Jira, not "Product
// Review"). stageGroupForStatus() below matches case-insensitively so a
// future casing quirk like that one can't silently create an "unmapped"
// status again.
export const STAGE_GROUPS = [
  { key: "development", label: "Development", statuses: ["Research", "In Progress"] },
  { key: "codeReview", label: "Code Review", statuses: ["Code Review", "In Review"] },
  { key: "qa", label: "QA", statuses: ["Ready for QA", "In QA", "QA"] },
  { key: "productReview", label: "Product Review", statuses: ["Product Review", "Product review"] },
  { key: "release", label: "Release", statuses: ["Ready for release", "Ready for Release"] },
];
export function stageGroupForStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  if (!s) return null;
  for (const g of STAGE_GROUPS) if (g.statuses.some((x) => x.toLowerCase() === s)) return g.key;
  return null;
}

// Cross-project "also on their plate" signal — visibility only, never mixed
// into the measured totals above. For each roster member, lists currently
// ACTIVE tickets (statusCategory = In Progress, any project) that are NOT
// already part of the scope being measured (`countedKeys`) — e.g. a roster
// member who picked up a Portal ticket, or has other open items in their own
// project outside this sprint. Lets a manager see when someone's real workload extends
// beyond what this view measures, without diluting the measurement itself.
export function otherWorkByPerson(activeIssues, members, countedKeys) {
  const counted = new Set(countedKeys || []);
  const out = new Map();
  for (const m of members || []) out.set(m.id, []);
  for (const n of activeIssues || []) {
    const a = n.fields && n.fields.assignee;
    if (!a || !out.has(a.accountId)) continue;
    if (counted.has(n.key)) continue;
    out.get(a.accountId).push({
      key: n.key, webUrl: n.webUrl, summary: n.fields.summary,
      project: n.fields.project && n.fields.project.key,
      status: n.fields.status && n.fields.status.name,
    });
  }
  return out;
}

// High-contrast, deterministic colors. Known statuses get hand-picked, very
// distinct hues; anything else falls back to a distinct palette.
const STATUS_MAP = {
  "To Do": "#94a3b8",            // slate
  "Backlog": "#64748b",
  "Selected for Development": "#0891b2",
  "In Progress": "#2563eb",      // blue
  // Deliberately calm, not alarm-orange/red: review time is usually waiting
  // on someone ELSE (a reviewer), not a red flag on the assignee.
  "Code Review": "#4338ca",      // indigo
  "In Review": "#4338ca",
  "Ready for QA": "#eab308",     // amber/yellow
  "In QA": "#9333ea",            // purple
  "QA": "#9333ea",
  "Ready for release": "#14b8a6",// teal
  "Research": "#ec4899",         // pink
  "Blocked": "#dc2626",          // red
  "Done": "#16a34a",             // green
};
const FALLBACK = ["#2563eb", "#f97316", "#9333ea", "#14b8a6", "#ec4899", "#eab308", "#dc2626", "#0891b2", "#94a3b8"];
export const STATUS_COLORS = {};
export function colorForStatus(status) {
  if (STATUS_MAP[status]) return STATUS_MAP[status];
  if (!STATUS_COLORS[status]) STATUS_COLORS[status] = FALLBACK[Object.keys(STATUS_COLORS).length % FALLBACK.length];
  return STATUS_COLORS[status];
}
