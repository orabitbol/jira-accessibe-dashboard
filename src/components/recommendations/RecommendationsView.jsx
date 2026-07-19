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
      <h2 className="bigtitle">המלצות לשיפור הצוות
        <span className="bigtitle-sub">מבוסס על הנתונים — לכל המלצה מצורפת ההוכחה שמאחוריה.</span>
      </h2>
      {loading && <div className="banner load">טוען נתונים נוספים לחישוב המלצות…</div>}
      <div className="recs">
        {recs.map((r) => <RecommendationCard key={r.id} rec={r} />)}
      </div>
      <p className="muted small" style={{ marginTop: 14 }}>
        ההמלצות מחושבות מהנתונים הזמינים (ספרינטים אחרונים, באגים פתוחים, איטמים פעילים, וכרטיסיות בתכנון).
        ספים ניתנים לכוונון בקוד (domain/recommendations.js).
      </p>
    </>
  );
}
