import { Explainer } from "./Explainer.jsx";

const TERM_KEYS = [
  ["glossary.sp.term", "glossary.sp.def"],
  ["glossary.velocity.term", "glossary.velocity.def"],
  ["glossary.throughput.term", "glossary.throughput.def"],
  ["glossary.lead.term", "glossary.lead.def"],
  ["glossary.cycle.term", "glossary.cycle.def"],
  ["glossary.attainment.term", "glossary.attainment.def"],
  ["glossary.carryover.term", "glossary.carryover.def"],
  ["glossary.added.term", "glossary.added.def"],
  ["glossary.removed.term", "glossary.removed.def"],
  ["glossary.bugratio.term", "glossary.bugratio.def"],
  ["glossary.states.term", "glossary.states.def"],
];

export function Glossary({ t }) {
  return (
    <Explainer label={t("glossary.label")} t={t}>
      <ul className="gloss">
        {TERM_KEYS.map(([termKey, defKey]) => <li key={termKey}><b>{t(termKey)}:</b> {t(defKey)}</li>)}
      </ul>
    </Explainer>
  );
}
