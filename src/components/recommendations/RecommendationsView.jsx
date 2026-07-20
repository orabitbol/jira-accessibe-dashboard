import { useMemo } from "react";
import { buildRecommendations } from "../../domain/recommendations.js";
import { RecommendationCard } from "./RecommendationCard.jsx";

export function RecommendationsView({ base, openData, sprintIssuesById, recentSprints, loading, mode = "points" }) {
  const recs = useMemo(
    () => buildRecommendations({
      active: base.active, resolved: base.resolved, openBugs: base.openBugs,
      openData, sprintIssuesById, recentSprints, mode,
    }),
    [base, openData, sprintIssuesById, recentSprints, mode]
  );

  return (
    <>
      <h2 className="bigtitle">Recommendations to improve the team
        <span className="bigtitle-sub">Based on the data — every recommendation comes with the evidence behind it.</span>
      </h2>
      {loading && <div className="banner load">Loading additional data to compute recommendations…</div>}
      <div className="recs">
        {recs.map((r) => <RecommendationCard key={r.id} rec={r} />)}
      </div>
      <p className="muted small" style={{ marginTop: 14 }}>
        Recommendations are computed from the available data (recent sprints, open bugs, active items, and planning tickets).
        Thresholds are configurable in code (domain/recommendations.js).
      </p>
    </>
  );
}
