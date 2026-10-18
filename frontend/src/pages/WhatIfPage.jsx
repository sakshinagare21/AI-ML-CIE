import { useState } from "react";
import {
  Activity,
  ArrowRight,
  ChartNoAxesCombined,
  CircleHelp,
  Sparkles,
} from "lucide-react";
import {
  ComparisonRow,
  EmptyAssessment,
  PageHeading,
  RangeControl,
  RiskPill,
  formatINR,
  formatPercent,
} from "../components/Common";
import { analyzeWhatIf } from "../services/api";

export default function WhatIfPage({ applicant, result }) {
  const [incomeChange, setIncomeChange] = useState(0);
  const [loanChange, setLoanChange] = useState(0);
  const [cibilChange, setCibilChange] = useState(0);
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!result) {
    return (
      <EmptyAssessment
        title="Start with an assessment."
        description="What-if scenarios compare model outputs against an assessment from this session. Submit your details to explore options."
      />
    );
  }

  const runScenario = async () => {
    setError("");
    setLoading(true);
    try {
      const updated = await analyzeWhatIf(applicant, {
        income_percent: incomeChange,
        loan_amount_percent: loanChange,
        cibil_points: cibilChange,
      });
      setComparison(updated);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "The scenario could not be calculated."
      );
    } finally {
      setLoading(false);
    }
  };

  const shown = comparison;
  const baseline = shown?.baseline ?? result;
  const scenario = shown?.scenario;
  const probabilityDelta = scenario
    ? (scenario.approval_probability - baseline.approval_probability) * 100
    : null;

  return (
    <>
      <PageHeading
        eyebrow="WHAT-IF PLANNER"
        title="Explore a few possibilities."
        description="Adjust your assumptions to compare model estimates. This is a scenario tool—not financial advice."
      />
      <div className="whatif-layout">
        <section className="card scenario-controls">
          <div className="card-title-row">
            <span className="section-icon mint">
              <ChartNoAxesCombined size={18} />
            </span>
            <div>
              <h2>Adjust your scenario</h2>
              <p>Changes apply to your original assessment.</p>
            </div>
          </div>
          <RangeControl
            label="Annual income"
            value={incomeChange}
            min={-50}
            max={50}
            step={5}
            suffix="%"
            onChange={setIncomeChange}
          />
          <RangeControl
            label="Loan amount"
            value={loanChange}
            min={-50}
            max={50}
            step={5}
            suffix="%"
            onChange={setLoanChange}
          />
          <RangeControl
            label="CIBIL score"
            value={cibilChange}
            min={-200}
            max={200}
            step={10}
            suffix=" pts"
            onChange={setCibilChange}
          />
          <div className="scenario-values">
            <div>
              <span>Scenario income</span>
              <strong>
                {formatINR(applicant.income_annum * (1 + incomeChange / 100))}
              </strong>
            </div>
            <div>
              <span>Scenario loan</span>
              <strong>
                {formatINR(applicant.loan_amount * (1 + loanChange / 100))}
              </strong>
            </div>
            <div>
              <span>Scenario CIBIL</span>
              <strong>
                {Math.min(900, Math.max(300, applicant.cibil_score + cibilChange))}
              </strong>
            </div>
          </div>
          {error && (
            <div className="alert alert-error compact-alert" role="alert">
              <CircleHelp size={17} />
              <span>{error}</span>
            </div>
          )}
          <button
            className="button button-primary full-button"
            onClick={runScenario}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" /> Comparing…
              </>
            ) : (
              <>
                Compare scenario <ArrowRight size={16} />
              </>
            )}
          </button>
        </section>

        <section className="card scenario-results">
          <div className="scenario-results-head">
            <div>
              <span className="tiny-label">YOUR COMPARISON</span>
              <h2>Small changes, clearer trade-offs.</h2>
            </div>
            <span className="scenario-badge">
              <Activity size={14} />
              {scenario ? "Scenario calculated" : "Ready to explore"}
            </span>
          </div>
          {scenario ? (
            <>
              <div className="comparison-hero">
                <div>
                  <span>APPROVAL PROBABILITY</span>
                  <div className="comparison-number">
                    {formatPercent(baseline.approval_probability)} <ArrowRight size={18} />{" "}
                    <strong>{formatPercent(scenario.approval_probability)}</strong>
                  </div>
                  <span>
                    Original{" "}
                    <b
                      className={
                        probabilityDelta !== null && probabilityDelta >= 0
                          ? "positive-delta"
                          : "negative-delta"
                      }
                    >
                      {probabilityDelta !== null && probabilityDelta >= 0 ? "+" : ""}
                      {probabilityDelta?.toFixed(1)} pts
                    </b>
                  </span>
                </div>
                <div className="comparison-orb">
                  <ChartNoAxesCombined size={24} />
                </div>
              </div>
              <div className="comparison-rows">
                <ComparisonRow label="Risk profile" baseline={baseline.risk} scenario={scenario.risk} />
                <ComparisonRow
                  label="Monthly EMI"
                  baseline={formatINR(baseline.emi)}
                  scenario={formatINR(scenario.emi)}
                />
                <ComparisonRow
                  label="Affordability"
                  baseline={baseline.affordability}
                  scenario={scenario.affordability}
                />
              </div>
            </>
          ) : (
            <div className="scenario-placeholder">
              <div className="placeholder-chart">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="placeholder-copy">
                <span className="placeholder-spark">
                  <Sparkles size={17} />
                </span>
                <strong>Your comparison will appear here</strong>
                <p>Adjust one or more values, then compare the model’s response.</p>
              </div>
            </div>
          )}
          <p className="scenario-caveat">
            <CircleHelp size={15} />
            Scenario outcomes are model estimates and do not guarantee lender approval.
          </p>
        </section>
      </div>

      {shown?.cibil_sweep && (
        <section className="card" style={{ marginTop: "1.5rem" }}>
          <div className="table-heading">
            <div>
              <span className="tiny-label">CIBIL SCORE SENSITIVITY SWEEP</span>
              <h2>Effect of CIBIL score across loan approval & risk</h2>
              <p>Keeping your scenario loan & income, sweeping CIBIL from 400 to 850 in steps of 50.</p>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>CIBIL SCORE</th>
                  <th>APPROVAL PROBABILITY</th>
                  <th>RISK LEVEL</th>
                  <th>MONTHLY EMI</th>
                  <th>AFFORDABILITY</th>
                </tr>
              </thead>
              <tbody>
                {shown.cibil_sweep.map((row) => {
                  const isCurrent = row.cibil === Math.min(900, Math.max(300, applicant.cibil_score + cibilChange));
                  return (
                    <tr
                      key={row.cibil}
                      style={isCurrent ? { backgroundColor: "rgba(67, 184, 154, 0.12)" } : {}}
                    >
                      <td>
                        <strong>{row.cibil} pts</strong>
                        {isCurrent && (
                          <span style={{ marginLeft: 8, fontSize: "0.75rem", color: "#38a889", fontWeight: 600 }}>
                            (Current Scenario)
                          </span>
                        )}
                      </td>
                      <td>
                        <strong>{formatPercent(row.approval_probability)}</strong>
                      </td>
                      <td>
                        <RiskPill risk={row.risk} />
                      </td>
                      <td>{formatINR(row.emi)}</td>
                      <td>{row.affordability}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
