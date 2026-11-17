import type { AdaptiveConceptState } from "../../lib/adaptive-mastery";

export function MasterySummary({ concepts }: { concepts: AdaptiveConceptState[] }) {
  const metrics = [
    {
      label: "Ổn định",
      value: concepts.filter(
        (item) => item.state === "mastered" && !item.risks.includes("stale"),
      ).length,
    },
    {
      label: "Đến hạn",
      value: concepts.filter(
        (item) => item.state === "review_due" || item.risks.includes("stale"),
      ).length,
    },
    {
      label: "Cần sửa",
      value: concepts.filter((item) => item.risks.includes("misconception_open")).length,
    },
    {
      label: "Bị khóa",
      value: concepts.filter((item) => item.unlocked === false).length,
    },
  ];

  return (
    <section className="mastery-pulse" aria-labelledby="mastery-pulse-title">
      <div>
        <span className="mono-label">MASTERY PULSE</span>
        <h2 id="mastery-pulse-title">Sức khỏe kiến thức</h2>
      </div>
      <dl>
        {metrics.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
