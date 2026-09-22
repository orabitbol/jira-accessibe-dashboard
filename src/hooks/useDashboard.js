import { useEffect, useMemo, useState } from "react";
import { usePersistentState } from "./usePersistentState.js";
import { fetchAll, fetchSprintIssues, fetchChangelogs } from "../services/jiraApi.js";
import { myTeam, leadTeams, setActiveTeam, resolveTeamId, withTeam } from "../../teams.config.js";
import { myTeamSprints, mergeSprints, currentSprint, planningSprints, defaultPlanningSprint, sprintCommitment, teamCommitmentSeries, predictabilityRows, predictabilityAverage } from "../domain/metrics.js";
import { makeT, RTL_LANGS } from "../i18n.js";

// Central orchestration: owns all dashboard state + data loading.
export function useDashboard() {
  // Active lead-team (persisted). Apply synchronously so every computation this
  // render reads the right team (teams.config.myTeam is a live binding).
  const [storedTeamId, setStoredTeamId] = usePersistentState("we.team", leadTeams[0].id);
  // A team id saved before the 2026-08 split (e.g. "we") still resolves to a
  // real team, so an old browser doesn't silently fall back to a blank header.
  const activeTeamId = resolveTeamId(storedTeamId);
  setActiveTeam(activeTeamId);
  useEffect(() => { if (storedTeamId !== activeTeamId) setStoredTeamId(activeTeamId); }, [storedTeamId, activeTeamId]);

  // Persisted UI state — survives a browser refresh.
  const [tab, setTab] = usePersistentState("we.tab", "sprint");
  // Sprint selections are deliberately NOT persisted: "which sprint" is a
  // moving target, and a value saved weeks ago used to leave the dashboard
  // opening on a long-closed sprint. They reset to the CURRENT sprint on every
  // load, while still surviving tab switches inside the session.
  const [sprintId, setSprintId] = useState(null);
  const [planSprintId, setPlanSprintId] = useState(null);
  const [managerSince, setManagerSince] = usePersistentState("we.managerSince", myTeam.managerSince);
  // Which lens drives goal-attainment: "points" (Story Points) or "completion"
  // (# tasks done). Default is "completion" — simpler to reason about and
  // doesn't get skewed by missing/inconsistent estimates.
  const [attainmentMode, setAttainmentMode] = usePersistentState("we.attainmentMode", "completion");
  // UI language (he/en) — persisted the same way. Flips <html dir/lang> so
  // Hebrew renders RTL without every component needing to know about it.
  // Default is English; the toggle in the header switches to Hebrew.
  const [lang, setLang] = usePersistentState("we.lang", "en");
  useEffect(() => {
    document.documentElement.dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);
  const t = useMemo(() => makeT(lang), [lang]);

  const [phase, setPhase] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");
  const [base, setBase] = useState(null);        // { resolved, active, openBugs, open }
  const [updatedAt, setUpdatedAt] = useState(null);

  // lazy caches
  const [sprintIssuesById, setSprintIssuesById] = useState({});
  const [sprintLoading, setSprintLoading] = useState(false);
  const [stageData, setStageData] = useState(null);   // { sprintId, byKey }
  const [stageLoading, setStageLoading] = useState(null);
  const [openData, setOpenData] = useState(null);
  const [openLoading, setOpenLoading] = useState(false);
  // Cross-team delivery comparison (%Done from Committed, every lead-team).
  // Lazy + explicit: it needs one Jira query per sprint per team, so it loads
  // on demand behind a button rather than on every page view.
  const [compare, setCompare] = useState(null);
  const [compareLoading, setCompareLoading] = useState(null); // { done, total } | null

  async function reload() {
    setPhase("loading"); setError("");
    // Clear lazy caches so a refresh truly refreshes EVERYTHING — recommendations
    // and metrics recompute from fresh data, and anything no longer relevant drops.
    setSprintIssuesById({}); setOpenData(null); setStageData(null); setCompare(null);
    try {
      // `open` is part of the BASE load (not lazy) because it is the only feed
      // that reaches a sprint whose tickets are all still To Do — i.e. a sprint
      // that just started. Without it the dashboard can't even see the current
      // sprint on day one and falls back to the previous, closed one.
      const [resolved, active, openBugs, open] = await Promise.all([
        fetchAll("resolved"), fetchAll("active"), fetchAll("openBugs"), fetchAll("open"),
      ]);
      setBase({ resolved, active, openBugs, open });
      setOpenData(open);
      setUpdatedAt(new Date());
      setPhase("ready");
    } catch (e) {
      setError(String(e && e.message ? e.message : e));
      setPhase("error");
    }
  }
  // Initial load, and full reload whenever the active team changes.
  useEffect(() => { reload(); }, [activeTeamId]);

  const sprints = useMemo(() => (base ? mergeSprints(
    myTeamSprints([...base.resolved, ...base.active]),
    // Open items add the just-started sprint; future sprints stay out of the
    // sprint picker (they belong to the Planning tab).
    myTeamSprints(base.open || [], { includeFuture: false }),
  ) : []), [base]);
  const cur = useMemo(() => currentSprint(sprints), [sprints]);
  // Pick the current sprint on first load — and RE-pick it whenever the saved
  // sprint id isn't in the list any more (switching teams, or a sprint that now
  // lives on another board after the split). Without this the views would keep
  // pointing at a sprint that no longer exists for this team.
  useEffect(() => {
    if (!sprints.length) return;
    if (sprintId != null && sprints.some((s) => s.id === sprintId)) return;
    const fallback = cur || sprints[sprints.length - 1];
    if (fallback) setSprintId(fallback.id);
  }, [sprints, cur, sprintId]);

  const recentSprints = useMemo(() => {
    if (!sprints.length) return [];
    const idx = sprints.findIndex((s) => s.id === sprintId);
    const upto = idx >= 0 ? idx + 1 : sprints.length;
    return sprints.slice(Math.max(0, upto - 5), upto);
  }, [sprints, sprintId]);

  // lazy: sprint issues for the Sprint Health + Recommendations tabs
  useEffect(() => {
    if ((tab !== "sprint" && tab !== "recommendations") || !recentSprints.length) return;
    const missing = recentSprints.filter((s) => !sprintIssuesById[s.id]);
    if (!missing.length) return;
    let cancelled = false;
    (async () => {
      setSprintLoading(true); setError("");
      try {
        const entries = await Promise.all(missing.map(async (s) => [s.id, await fetchSprintIssues(s.id)]));
        if (!cancelled) setSprintIssuesById((m) => ({ ...m, ...Object.fromEntries(entries) }));
      } catch (e) { if (!cancelled) setError(String(e.message || e)); }
      finally { if (!cancelled) setSprintLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [tab, recentSprints, sprintIssuesById]);

  // lazy: ALL my-team sprint issues for the My Impact tab (before/after attainment)
  useEffect(() => {
    if (tab !== "impact" || !sprints.length) return;
    const missing = sprints.filter((s) => !sprintIssuesById[s.id]);
    if (!missing.length) return;
    let cancelled = false;
    (async () => {
      setSprintLoading(true); setError("");
      try {
        const entries = await Promise.all(missing.map(async (s) => [s.id, await fetchSprintIssues(s.id)]));
        if (!cancelled) setSprintIssuesById((m) => ({ ...m, ...Object.fromEntries(entries) }));
      } catch (e) { if (!cancelled) setError(String(e.message || e)); }
      finally { if (!cancelled) setSprintLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [tab, sprints, sprintIssuesById]);

  // lazy: open (sprint-assigned) items for the Planning + Recommendations tabs
  useEffect(() => {
    if ((tab !== "planning" && tab !== "recommendations") || openData) return;
    let cancelled = false;
    (async () => {
      setOpenLoading(true); setError("");
      try { const items = await fetchAll("open"); if (!cancelled) setOpenData(items); }
      catch (e) { if (!cancelled) setError(String(e.message || e)); }
      finally { setOpenLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [tab, openData]);

  const planSprints = useMemo(() => (openData ? planningSprints(openData) : []), [openData]);
  useEffect(() => {
    if (!planSprints.length) return;
    if (planSprintId != null && planSprints.some((s) => s.id === planSprintId)) return;
    const d = defaultPlanningSprint(planSprints);
    if (d) setPlanSprintId(d.id);
  }, [planSprints, planSprintId]);

  // The comparison is computed in one specific lens (points vs tasks); flipping
  // the lens must not leave stale numbers labelled with the new one.
  useEffect(() => { setCompare(null); }, [attainmentMode]);

  // Builds "%Done from Committed" per sprint for EVERY lead-team, reusing the
  // exact same metric code as the single-team view by running it once per team
  // through withTeam() — so the comparison can never drift from the number
  // shown on the team's own card.
  async function loadCompare() {
    if (!base || compareLoading) return;
    const plan = leadTeams.map((team) => ({
      team,
      sprints: withTeam(team.id, () => mergeSprints(
        myTeamSprints([...base.resolved, ...base.active]),
        myTeamSprints(base.open || [], { includeFuture: false }),
      )).slice(-6),
    }));
    const needed = [...new Set(plan.flatMap((p) => p.sprints.map((s) => s.id)))].filter((id) => !sprintIssuesById[id]);
    setCompareLoading({ done: 0, total: needed.length });
    try {
      const fetched = {};
      let done = 0;
      // Sequential on purpose: each call is itself paged, and firing a dozen
      // paged searches at Jira at once is how you get rate-limited.
      for (const id of needed) {
        fetched[id] = await fetchSprintIssues(id);
        setCompareLoading({ done: ++done, total: needed.length });
      }
      const byId = { ...sprintIssuesById, ...fetched };
      setSprintIssuesById(byId);
      const mode = attainmentMode;
      const byTeam = plan.map(({ team, sprints }) => withTeam(team.id, () => {
        const per = sprints
          .filter((sp) => byId[sp.id])
          .map((sp) => ({ sprint: sp, rows: sprintCommitment(byId[sp.id], sp, mode) }));
        const rows = predictabilityRows(teamCommitmentSeries(per.filter((x) => x.rows.length)), mode);
        return { id: team.id, name: team.name, project: team.key, rows, avg: predictabilityAverage(rows) };
      }));
      setCompare({ byTeam, mode });
    } catch (e) {
      setError(String(e && e.message ? e.message : e));
    } finally {
      setCompareLoading(null);
    }
  }

  async function loadStages() {
    const issues = sprintIssuesById[sprintId] || [];
    const mine = issues.filter((n) => n.fields.assignee && myTeam.members.some((m) => m.id === n.fields.assignee.accountId));
    const keys = mine.map((i) => i.key);
    setStageLoading({ done: 0, total: keys.length });
    const byKey = await fetchChangelogs(keys, { onProgress: (done, total) => setStageLoading({ done, total }) });
    setStageData({ sprintId, byKey });
    setStageLoading(null);
  }

  const selectedSprint = sprints.find((s) => s.id === sprintId) || cur;
  const stageDataForSelected = stageData && stageData.sprintId === sprintId ? stageData : null;

  return {
    tab, setTab, phase, error, base, updatedAt, reload,
    sprints, selectedSprint, sprintId, setSprintId,
    recentSprints, sprintIssuesById, sprintLoading,
    stageData: stageDataForSelected, stageLoading, loadStages,
    compare, compareLoading, loadCompare,
    openData, openLoading, planSprints, planSprintId, setPlanSprintId,
    managerSince, setManagerSince,
    leadTeams, activeTeamId, setActiveTeamId: setStoredTeamId,
    projectTitle: myTeam.projectName || myTeam.name,
    attainmentMode, setAttainmentMode,
    lang, setLang, t,
  };
}
