import { Explainer } from "./Explainer.jsx";

const TERMS = [
  ["Story Points (SP)", "A relative effort estimate the developer gives the task themselves."],
  ["Velocity", "Total Story Points completed in a period / sprint."],
  ["Throughput", "Number of items completed (regardless of SP)."],
  ["Lead time", "Days from Created (item opened) to Resolved — including backlog wait time."],
  ["Cycle time", "From the moment work actually started until closed — excluding To Do wait time."],
  ["Goal attainment (say/do)", "Two independent measurement methods, per the toggle at the top of the page: by Story Points (SP closed ÷ SP committed at planning), or by tasks completed (number of tasks closed ÷ number of tasks committed at planning, regardless of SP)."],
  ["Carry-over", "An item that spilled over from a previous sprint (was in more than one sprint)."],
  ["Added mid-sprint", "An item created after the sprint started — wasn't in the plan (scope creep)."],
  ["Bug ratio", "Percentage of bugs out of all items closed."],
  ["States", "Not started (in To Do) · At risk (not started, little time left in sprint) · Delayed/blocked (past due / blocked / stuck in a working status)."],
];

export function Glossary() {
  return (
    <Explainer label="Glossary">
      <ul className="gloss">
        {TERMS.map(([t, d]) => <li key={t}><b>{t}:</b> {d}</li>)}
      </ul>
    </Explainer>
  );
}
