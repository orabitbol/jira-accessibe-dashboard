import { useEffect, useMemo, useState } from "react";
import { usePersistentState } from "./usePersistentState.js";
import { fetchAll, fetchSprintIssues, fetchChangelogs } from "../services/jiraApi.js";
import { myTeam, leadTeams, setActiveTeam } from "../../teams.config.js";
import { myTeamSprints, currentSprint, planningSprints, defaultPlanningSprint } from "../domain/metrics.js";

// Central orchestration: owns all dashboard state + data loading.
export function useDashboard() {
  // Active lead-team (persisted). Apply synchronously so every computation this
  // render reads the right team (teams.config.myTeam is a live binding).
  const [activeTeamId, setActiveTeamId] = usePersistentState("we.team", leadTeams[0].id);
  setActiveTeam(activeTeamId);

  // Persisted UI state — survives a browser refresh.
  const [tab, setTab] = usePersistentState("we.tab", "sprint");
  const [sprintId, setSprintId] = usePersistentState("we.sprintId", null);
  const [planSprintId, setPlanSprintId] = usePersistentState("we.planSprintId", null);
  const [managerSince, setManagerSince] = usePersistentState("we.managerSince", myTeam.managerSince);
  // Which lens drives goal-attainment: "points" (Story Points) or "completion" (# tasks done).
  const [attainmentMode, setAttainmentMode] = usePersistentState("we.attainmentMode", "points");

  const [phase, setPhase] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");
  const [base, setBase] = useState(null);        // { resolved, active, openBugs }
  const [updatedAt, setUpdatedAt] = useState(null);

  // lazy caches
  const [sprintIssuesById, setSprintIssuesById] = useState({});
  const [sprintLoading, setSprintLoading] = useState(false);
  const [stageData, setStageData] = useState(null);   // { sprintId, byKey }
  const [stageLoading, setStageLoading] = useState(null);
  const [openData, setOpenData] = useState(null);
  const [openLoading, setOpenLoading] = useState(false);

  async function reload() {
    setPhase("loading"); setError("");
    // Clear lazy caches so a refresh truly refreshes EVERYTHING — recommendations
    // and metrics recompute from fresh data, and anything no longer relevant drops.
    setSprintIssuesById({}); setOpenData(null); setStageData(null);
    try {
      const [resolved, active, openBugs] = await Promise.all([
        fetchAll("resolved"), fetchAll("active"), fetchAll("openBugs"),
      ]);
      setBase({ resolved, active, openBugs });
      setUpdatedAt(new Date());
      setPhase("ready");
    } catch (e) {
      setError(String(e && e.message ? e.message : e));
      setPhase("error");
    }
  }
  // Initial load, and full reload whenever the active team changes.
  useEffect(() => { reload(); }, [activeTeamId]);

  const sprints = useMemo(() => (base ? myTeamSprints([...base.resolved, ...base.active]) : []), [base]);
  const cur = useMemo(() => currentSprint(sprints), [sprints]);
  useEffect(() => { if (cur && sprintId == null) setSprintId(cur.id); }, [cur, sprintId]);

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
    if (planSprints.length && planSprintId == null) {
      const d = defaultPlanningSprint(planSprints);
      if (d) setPlanSprintId(d.id);
    }
  }, [planSprints, planSprintId]);

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
    openData, openLoading, planSprints, planSprintId, setPlanSprintId,
    managerSince, setManagerSince,
    leadTeams, activeTeamId, setActiveTeamId,
    attainmentMode, setAttainmentMode,
  };
}
