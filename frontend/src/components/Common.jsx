import { ArrowRight, ChevronDown, CircleHelp, FileChartColumnIncreasing, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

export const formatPercent = (value) => {
  if (value === null || value === undefined) return "—";
  const num = value * 100;
  if (num > 99 && num < 100) return `${num.toFixed(1)}%`;
  if (num > 0 && num < 1) return `${num.toFixed(1)}%`;
  return `${Math.round(num)}%`;
};

export function Eyebrow({ children }) {
  return (
    <div className="eyebrow">
      <span />
      {children}
    </div>
  );
}

export function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function FeatureCard({ icon, number, title, copy, tint, link, label }) {
  return (
    <article className="feature-card">
      <div className="feature-card-top">
        <span className={`feature-icon ${tint}`}>{icon}</span>
        <span className="feature-number">{number}</span>
      </div>
      <h3>{title}</h3>
      <p>{copy}</p>
      <Link to={link}>
        {label}
        <ArrowRight size={15} />
      </Link>
    </article>
  );
}

export function NumberField({ label, value, min, max, step = 1, prefix, suffix, onChange }) {
  const inputId = label.toLowerCase().replaceAll(" ", "-");
  return (
    <label className="field" htmlFor={inputId}>
      <span className="field-label">{label}</span>
      <span className="input-shell">
        {prefix && <span className="input-affix">{prefix}</span>}
        <input
          id={inputId}
          type="number"
          required
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </span>
      <span className="field-hint">
        Between {prefix ? formatINR(min) : min.toLocaleString("en-IN")} and{" "}
        {prefix ? formatINR(max) : max.toLocaleString("en-IN")}
        {suffix ? ` ${suffix}` : ""}
      </span>
    </label>
  );
}

export function SelectField({ label, value, options, onChange }) {
  const inputId = label.toLowerCase().replaceAll(" ", "-");
  return (
    <label className="field" htmlFor={inputId}>
      <span className="field-label">{label}</span>
      <span className="input-shell select-shell">
        <select id={inputId} value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown size={16} />
      </span>
    </label>
  );
}

export function MetricCard({ icon, label, value, note, color }) {
  return (
    <article className="metric-card card">
      <div className="metric-heading">
        <span className={`section-icon ${color}`}>{icon}</span>
        <span>{label}</span>
      </div>
      <strong className="metric-value">{value}</strong>
      <span className="metric-note">{note}</span>
    </article>
  );
}

export function ExplanationCard({ title, subtitle, description, items, color }) {
  const ordered = [...items]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 8);
  const max = Math.max(...ordered.map((item) => Math.abs(item.contribution)), 1e-4);

  return (
    <section className="card explanation-card">
      <div className="explanation-title">
        <div>
          <span className="tiny-label">{title} EXPLANATION</span>
          <h2>{subtitle}</h2>
        </div>
        <span className="explain-method" style={{ color }}>
          {title}
        </span>
      </div>
      <p className="explanation-description">{description}</p>
      {ordered.length ? (
        <div className="contribution-list">
          {ordered.map((item) => (
            <div className="contribution-row" key={item.feature}>
              <div className="contribution-meta">
                <span>{item.feature.replaceAll("_", " ")}</span>
                <strong className={item.contribution < 0 ? "negative-contribution" : ""}>
                  {item.contribution > 0 ? "+" : ""}
                  {item.contribution.toFixed(3)}
                </strong>
              </div>
              <div className="contribution-track">
                <span
                  className={item.contribution < 0 ? "negative-bar" : ""}
                  style={{
                    width: `${Math.max((Math.abs(item.contribution) / max) * 100, 2)}%`,
                    backgroundColor: item.contribution < 0 ? "#e88f76" : color,
                  }}
                />
              </div>
              <span className="contribution-value">
                Input value: {item.value === undefined ? "—" : String(item.value)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-chart">
          <span>Explanation details weren’t included in the service response.</span>
        </div>
      )}
    </section>
  );
}

export function RangeControl({ label, value, min, max, step, suffix, onChange }) {
  return (
    <label className="range-control">
      <span className="range-label">
        <strong>{label}</strong>
        <span>
          {value > 0 ? "+" : ""}
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ "--range-progress": `${((value - min) / (max - min)) * 100}%` }}
      />
      <span className="range-limits">
        <span>
          {min}
          {suffix}
        </span>
        <span>
          {max > 0 ? "+" : ""}
          {max}
          {suffix}
        </span>
      </span>
    </label>
  );
}

export function ComparisonRow({ label, baseline, scenario }) {
  return (
    <div className="comparison-row">
      <span>{label}</span>
      <strong>{baseline}</strong>
      <ArrowRight size={15} />
      <strong className="comparison-new">{scenario}</strong>
    </div>
  );
}

export function RiskPill({ risk }) {
  return (
    <span className={`risk-pill risk-${risk.toLowerCase()}`}>
      <i />
      {risk}
    </span>
  );
}

export function EmptyAssessment({ title, description }) {
  return (
    <div className="empty-state-page">
      <span className="empty-state-icon">
        <FileChartColumnIncreasing size={25} />
      </span>
      <Eyebrow>NO ASSESSMENT YET</Eyebrow>
      <h1>{title}</h1>
      <p>{description}</p>
      <Link to="/apply" className="button button-primary">
        Start an assessment <ArrowRight size={16} />
      </Link>
      <span className="empty-privacy">
        <ShieldCheck size={15} />
        Applicant results are held in this browser session.
      </span>
    </div>
  );
}
