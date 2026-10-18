import { useState } from "react";
import {
  ArrowRight,
  Banknote,
  CircleHelp,
  Clock3,
  House,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { NumberField, PageHeading, SelectField } from "../components/Common";

export default function AssessmentPage({ applicant, onSubmit }) {
  const [form, setForm] = useState(applicant);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSubmit(form);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Assessment could not be completed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeading
        eyebrow="APPLICANT PORTAL"
        title="Let’s get to know your plans."
        description="A few details help us build a more complete picture. Your information is used to generate this assessment only."
      />
      <div className="form-layout">
        <form className="assessment-form card" onSubmit={handleSubmit}>
          <div className="form-section-heading">
            <span className="section-icon mint">
              <WalletCards size={18} />
            </span>
            <div>
              <h2>About you</h2>
              <p>A little about your household and work.</p>
            </div>
            <span className="section-step">01 / 03</span>
          </div>

          <div className="field-grid">
            <NumberField
              label="Number of dependents"
              value={form.no_of_dependents}
              min={0}
              max={5}
              suffix="people"
              onChange={(value) => update("no_of_dependents", value)}
            />
            <SelectField
              label="Education"
              value={form.education}
              options={["Graduate", "Not Graduate"]}
              onChange={(value) => update("education", value)}
            />
            <SelectField
              label="Employment type"
              value={form.self_employed}
              options={["No", "Yes"]}
              onChange={(value) => update("self_employed", value)}
            />
          </div>

          <div className="form-section-heading form-section-spaced">
            <span className="section-icon lavender">
              <Banknote size={18} />
            </span>
            <div>
              <h2>Income & loan</h2>
              <p>Tell us about the loan you’re considering.</p>
            </div>
            <span className="section-step">02 / 03</span>
          </div>

          <div className="field-grid">
            <NumberField
              label="Annual income"
              value={form.income_annum}
              min={2e5}
              max={99e5}
              step={1e5}
              prefix="₹"
              onChange={(value) => update("income_annum", value)}
            />
            <NumberField
              label="Loan amount"
              value={form.loan_amount}
              min={3e5}
              max={395e5}
              step={1e5}
              prefix="₹"
              onChange={(value) => update("loan_amount", value)}
            />
            <NumberField
              label="Loan term"
              value={form.loan_term}
              min={2}
              max={20}
              suffix="years"
              onChange={(value) => update("loan_term", value)}
            />
            <NumberField
              label="CIBIL score"
              value={form.cibil_score}
              min={300}
              max={900}
              suffix="/ 900"
              onChange={(value) => update("cibil_score", value)}
            />
          </div>

          <div className="form-section-heading form-section-spaced">
            <span className="section-icon peach">
              <House size={18} />
            </span>
            <div>
              <h2>Your assets</h2>
              <p>Approximate current values are fine.</p>
            </div>
            <span className="section-step">03 / 03</span>
          </div>

          <div className="field-grid">
            <NumberField
              label="Residential assets"
              value={form.residential_assets_value}
              min={0}
              max={291e5}
              step={1e5}
              prefix="₹"
              onChange={(value) => update("residential_assets_value", value)}
            />
            <NumberField
              label="Commercial assets"
              value={form.commercial_assets_value}
              min={0}
              max={194e5}
              step={1e5}
              prefix="₹"
              onChange={(value) => update("commercial_assets_value", value)}
            />
            <NumberField
              label="Luxury assets"
              value={form.luxury_assets_value}
              min={0}
              max={392e5}
              step={1e5}
              prefix="₹"
              onChange={(value) => update("luxury_assets_value", value)}
            />
            <NumberField
              label="Bank assets"
              value={form.bank_asset_value}
              min={0}
              max={147e5}
              step={1e5}
              prefix="₹"
              onChange={(value) => update("bank_asset_value", value)}
            />
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              <CircleHelp size={18} />
              <div>
                <strong>We couldn’t complete your assessment</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="form-submit-row">
            <span>
              <ShieldCheck size={16} />
              The demo API may log limited assessment metrics.
            </span>
            <button className="button button-primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" /> Assessing…
                </>
              ) : (
                <>
                  Assess my application <ArrowRight size={17} />
                </>
              )}
            </button>
          </div>
        </form>

        <aside className="form-aside">
          <div className="aside-card aside-dark">
            <span className="aside-spark">
              <Sparkles size={18} />
            </span>
            <span className="aside-eyebrow">A MORE HUMAN VIEW</span>
            <h3>Numbers tell a story. We help make sense of it.</h3>
            <p>
              Your assessment brings together financial indicators to provide a useful starting
              point—not a final answer.
            </p>
            <div className="aside-rule" />
            <div className="aside-steps">
              <div>
                <span>1</span>
                <p>Share your details</p>
              </div>
              <div>
                <span>2</span>
                <p>Review your insights</p>
              </div>
              <div>
                <span>3</span>
                <p>Explore your options</p>
              </div>
            </div>
          </div>
          <div className="aside-card aside-note">
            <span className="note-icon">
              <Clock3 size={17} />
            </span>
            <div>
              <strong>Takes about 2 minutes</strong>
              <p>Have your income and loan details handy.</p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
