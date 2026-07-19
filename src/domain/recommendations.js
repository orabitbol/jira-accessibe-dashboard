// Rule-based, transparent recommendations derived from the data. Each rec
// carries the evidence behind it so nothing is a black box.
import { teamForIssue, myTeam } from "../../teams.config.js";
import { enrichBoard, sprintCommitment, commitmentTrend, storyPoints, mean, round, DAY } from "./metrics.js";

const isMine = (n) => teamForIssue(n) === myTeam.name;
const SEV_ORDER = { high: 0, med: 1, low: 2 };

export function buildRecommendations({ active = [], resolved = [], openBugs = [], openData = null, sprintIssuesById = {}, recentSprints = [], now = Date.now(), mode = "points" }) {
  const recs = [];

  // 1) Estimation gaps — sprint-assigned open items with no Story Points.
  if (openData) {
    const missing = openData.filter((n) => isMine(n) && storyPoints(n) === 0);
    if (missing.length) {
      recs.push({
        id: "estimation", severity: missing.length >= 5 ? "high" : "med",
        title: `${missing.length} כרטיסיות בספרינט ללא הערכת Story Points`,
        detail: "בלי הערכה אי אפשר לתכנן עומס נכון או למדוד עמידה ביעד. כדאי להשלים בפגישת ה‑pre‑planning.",
        evidence: missing.slice(0, 8).map((n) => ({ label: n.key, url: n.webUrl })),
      });
    }
  }

  // Recent sprints commitment (for the next few rules)
  const per = recentSprints.filter((s) => sprintIssuesById[s.id]).map((s) => ({ sprint: s, rows: sprintCommitment(sprintIssuesById[s.id], s, mode) }));
  const closed = per.filter((p) => p.sprint.state === "closed");

  // 2) Recurring missers — with a per-sprint breakdown so the manager can show
  //    the person exactly where they fell short.
  for (const d of commitmentTrend(per).filter((x) => x.recurring)) {
    const breakdown = per
      .map((p) => {
        const row = p.rows.find((r) => r.id === d.id);
        if (!row) return null;
        return {
          sprint: p.sprint.name, state: p.sprint.state,
          committedAmount: mode === "completion" ? row.committedItems : row.committedPts,
          doneAmount: mode === "completion" ? row.doneItems : row.donePts,
          unit: mode === "completion" ? "משימות" : "SP",
          attainment: row.attainment,
          done: row.doneList, late: row.lateList, open: row.openItems, noEstimate: row.noEstimate,
        };
      })
      .filter(Boolean)
      .reverse(); // newest first
    recs.push({
      id: "recurring-" + d.id, severity: "high",
      title: `${d.name} מסיים מתחת ליעד שוב ושוב`,
      detail: `פספס את היעד ב‑${d.misses} מתוך ${d.closedCount} הספרינטים הסגורים (ממוצע ${d.avg}%). שווה שיחת 1:1 — לבדוק עומס, חסמים או התחייבות גדולה מדי, ולפצל משימות גדולות.`,
      evidence: [`ממוצע עמידה ${d.avg}%`, `${d.misses}/${d.closedCount} פספוסים`],
      details: { kind: "sprints", rows: breakdown },
    });
  }

  // 3) Team over-commitment + 4) scope creep.
  if (closed.length >= 2) {
    const commitAvg = round(mean(closed.map((p) => p.rows.reduce((a, r) => a + r.committedPts, 0))), 1);
    const doneAvg = round(mean(closed.map((p) => p.rows.reduce((a, r) => a + r.donePts, 0))), 1);
    const addedAvg = round(mean(closed.map((p) => p.rows.reduce((a, r) => a + r.addedPts, 0))), 1);
    if (commitAvg > 0 && doneAvg / commitAvg < 0.8) {
      recs.push({
        id: "overcommit", severity: "med",
        title: "הצוות מתחייב ליותר ממה שנסגר",
        detail: `בממוצע מתחייבים ${commitAvg} SP אך נסגרים ${doneAvg} SP לספרינט. שקול להוריד את ההתחייבות ל‑~${doneAvg} SP כדי להגדיל צפיוּת ולעמוד ביעדים.`,
        evidence: [`התחייבות ממוצעת ${commitAvg} SP`, `נסגר בממוצע ${doneAvg} SP`],
      });
    }
    if (commitAvg > 0 && addedAvg / commitAvg > 0.2) {
      recs.push({
        id: "scopecreep", severity: "med",
        title: "הרבה עבודה נכנסת באמצע הספרינט",
        detail: `בממוצע ${addedAvg} SP נוספים אחרי תחילת הספרינט. שקול buffer מתוכנן או lane נפרד לבקשות דחופות, כדי להגן על ההתחייבות.`,
        evidence: [`${addedAvg} SP נוספים בממוצע באמצע`],
      });
    }
  }

  // 5) Bug load.
  const openMineBugs = openBugs.filter(isMine).length;
  const cut30 = now - 30 * DAY;
  const done30 = resolved.filter((n) => isMine(n) && n.fields.resolutiondate && new Date(n.fields.resolutiondate).getTime() >= cut30);
  const bugs30 = done30.filter((n) => n.fields.issuetype && n.fields.issuetype.name === "Bug").length;
  const bugRatio = done30.length ? Math.round((bugs30 / done30.length) * 100) : 0;
  if (openMineBugs >= 10 || bugRatio >= 40) {
    recs.push({
      id: "bugs", severity: openMineBugs >= 20 || bugRatio >= 60 ? "high" : "med",
      title: "עומס באגים גבוה",
      detail: `${openMineBugs} באגים פתוחים כרגע, ו‑${bugRatio}% מהעבודה שנסגרה ב‑30 הימים האחרונים היו באגים. שווה לשקול זמן ייעודי לאיכות / חיזוק בדיקות.`,
      evidence: [`${openMineBugs} באגים פתוחים`, `${bugRatio}% bug ratio (30 ימים)`],
    });
  }

  // 6) Blocked / stuck right now.
  const stuck = enrichBoard(active).filter((a) => a.team === myTeam.name && a.delayed);
  if (stuck.length) {
    recs.push({
      id: "blocked", severity: "high",
      title: `${stuck.length} איטמים תקועים או חסומים כרגע`,
      detail: "אלה פוגעים ישירות ביכולת לסגור את הספרינט. שווה לטפל בהם ראשונים בדיילי הקרוב.",
      evidence: stuck.slice(0, 8).map((a) => ({ label: `${a.key} — ${a.reasons[0]}`, url: a.webUrl })),
    });
  }

  if (!recs.length) {
    recs.push({ id: "all-good", severity: "low", title: "הכול נראה תקין", detail: "לא זוהו דגלים אדומים בנתונים הזמינים כרגע. המשך כך.", evidence: [] });
  }
  return recs.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
}
