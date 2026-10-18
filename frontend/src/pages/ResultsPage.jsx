import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  ChartNoAxesCombined,
  CheckCircle2,
  CircleHelp,
  Download,
  Eye,
  FileCheck,
  FileText,
  Gauge,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  EmptyAssessment,
  MetricCard,
  PageHeading,
  formatINR,
  formatPercent,
} from "../components/Common";
import { downloadSanctionLetter, fetchSanctionPdfBlob } from "../services/api";

export default function ResultsPage({ applicant, result }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [pdfError, setPdfError] = useState(null);

  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        window.URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  if (!result) {
    return (
      <EmptyAssessment
        title="Your assessment is waiting."
        description="Complete the short form first. Your results will appear here once the assessment service has reviewed your information."
      />
    );
  }

  const isApproved = result.predicted_status === "Approved";
  const applicantData = applicant || {
    full_name: "Valued Applicant",
    income_annum: 5000000,
    loan_amount: 15000000,
    loan_term: 10,
    cibil_score: 650,
    education: "Graduate",
    self_employed: "No",
    no_of_dependents: 2,
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setPdfError(null);
    try {
      await downloadSanctionLetter(applicantData, result);
    } catch (err) {
      setPdfError(err.message || "Failed to download sanction letter.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreview = async () => {
    if (previewBlobUrl) {
      setShowPreviewModal(true);
      return;
    }
    setIsPreviewing(true);
    setPdfError(null);
    try {
      const blob = await fetchSanctionPdfBlob(applicantData, result);
      const url = window.URL.createObjectURL(blob);
      setPreviewBlobUrl(url);
      setShowPreviewModal(true);
    } catch (err) {
      setPdfError(err.message || "Failed to generate document preview.");
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <>
      <PageHeading
        eyebrow="YOUR ASSESSMENT"
        title="Here’s your financial snapshot."
        description="A clear look at the model’s estimate, the factors behind it, and what you might consider next."
        action={
          <div className="page-heading-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <div className="spinner" /> Generating PDF...
                </>
              ) : (
                <>
                  <Download size={16} /> Download Sanction Letter
                </>
              )}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={handlePreview}
              disabled={isPreviewing}
            >
              {isPreviewing ? (
                <>
                  <div className="spinner" /> Loading...
                </>
              ) : (
                <>
                  <Eye size={16} /> Preview PDF
                </>
              )}
            </button>
            <Link to="/apply" className="button button-secondary">
              Edit details <ArrowUpRight size={16} />
            </Link>
          </div>
        }
      />

      {/* Sanction Letter Showcase Package */}
      <div className="sanction-package-card">
        <div className="sanction-card-inner">
          <div className="sanction-card-info">
            <div className="sanction-card-icon">
              <FileCheck size={28} />
            </div>
            <div className="sanction-card-text">
              <div className="sanction-card-badge-row">
                <span className="sanction-badge sanction-badge-primary">
                  Official Bank Report
                </span>
                <span className="sanction-badge sanction-badge-validity">
                  30-Day Sanction Validity
                </span>
              </div>
              <h3>Download Official Pre-Approval / Sanction Letter</h3>
              <p>
                Get your formal, bank-grade Loan Assessment Package in PDF format.
                Includes credit risk grade, EMI terms, explainable AI factor breakdown,
                and digital underwriting stamp.
              </p>
              <div className="sanction-highlights">
                <div className="sanction-highlight-item">
                  <CheckCircle2 size={16} /> Official Bank Seal
                </div>
                <div className="sanction-highlight-item">
                  <CheckCircle2 size={16} /> EMI & Repayment Schedule
                </div>
                <div className="sanction-highlight-item">
                  <CheckCircle2 size={16} /> SHAP Feature Impact
                </div>
                <div className="sanction-highlight-item">
                  <CheckCircle2 size={16} /> KYC Verification Checklist
                </div>
              </div>
            </div>
          </div>
          <div className="sanction-card-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <div className="spinner" /> Generating PDF...
                </>
              ) : (
                <>
                  <Download size={16} /> Download PDF (.pdf)
                </>
              )}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={handlePreview}
              disabled={isPreviewing}
            >
              <Eye size={16} /> In-Browser Preview
            </button>
          </div>
        </div>
      </div>

      {pdfError && (
        <div className="alert alert-error" style={{ marginBottom: "20px" }}>
          <Activity size={18} />
          <div>
            <strong>Document generation issue</strong>
            <span>{pdfError}</span>
          </div>
        </div>
      )}

      <div className="results-banner">
        <div className={`result-status-icon ${isApproved ? "status-good" : "status-neutral"}`}>
          <BadgeCheck size={21} />
        </div>
        <div className="result-status-copy">
          <span>MODEL PREDICTION</span>
          <strong>{result.predicted_status}</strong>
        </div>
        <div className="result-banner-divider" />
        <div className="result-probability">
          <strong>{formatPercent(result.approval_probability)}</strong>
          <span>Approval probability</span>
        </div>
        <div className="result-banner-note">
          <CircleHelp size={17} />
          <span>This is an AI-generated estimate, not a lender’s final decision.</span>
        </div>
      </div>

      {result.anomaly && (
        <div className="alert alert-warning">
          <Activity size={18} />
          <div>
            <strong>Additional review recommended</strong>
            <span>An unusual pattern was detected in the application inputs.</span>
          </div>
        </div>
      )}

      <div className="metrics-grid">
        <MetricCard
          icon={<Gauge size={18} />}
          label="Risk profile"
          value={result.risk}
          note="Based on your financial profile"
          color="lavender"
        />
        <MetricCard
          icon={<Banknote size={18} />}
          label="Estimated monthly EMI"
          value={formatINR(result.emi)}
          note="Indicative monthly repayment"
          color="mint"
        />
        <MetricCard
          icon={<Activity size={18} />}
          label="EMI-to-income ratio"
          value={formatPercent(result.emi_to_income_ratio)}
          note={`${result.affordability} affordability`}
          color="peach"
        />
      </div>

      <div className="two-column results-lower">
        <section className="card recommendation-card">
          <div className="card-title-row">
            <span className="section-icon mint">
              <Lightbulb size={17} />
            </span>
            <div>
              <h2>A thoughtful next step</h2>
              <p>Based on this assessment</p>
            </div>
          </div>
          <p className="recommendation-text">{result.recommendation}</p>
          <Link to="/explain" className="text-link">
            Understand what shaped this result <ArrowRight size={15} />
          </Link>
        </section>

        <section className="card explainer-card">
          <div className="explainer-top">
            <span className="section-icon lavender">
              <Sparkles size={17} />
            </span>
            <span className="tiny-label">EXPLAINABLE AI</span>
          </div>
          <h2>See the “why” behind the numbers.</h2>
          <p>
            Explore how your financial details influenced this prediction, with two independent
            explanation methods.
          </p>
          <Link to="/explain" className="button button-secondary">
            Explore your explanation <ArrowRight size={16} />
          </Link>
        </section>
      </div>

      <div className="whatif-teaser">
        <div className="teaser-icon">
          <ChartNoAxesCombined size={19} />
        </div>
        <div>
          <strong>Curious how a change could help?</strong>
          <p>Try different income, loan amount, or CIBIL assumptions.</p>
        </div>
        <Link to="/what-if" className="button button-small button-primary">
          Explore scenarios <ArrowRight size={15} />
        </Link>
      </div>

      {/* PDF In-Browser Preview Modal */}
      {showPreviewModal && previewBlobUrl && (
        <div
          className="pdf-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClosePreview();
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="pdf-modal-container">
            <div className="pdf-modal-header">
              <div className="pdf-modal-header-left">
                <div className="pdf-modal-icon">
                  <FileText size={20} />
                </div>
                <div className="pdf-modal-header-titles">
                  <h3>Loan Sanction & Assessment Report</h3>
                  <p>
                    Official Document Reference •{" "}
                    {applicantData.full_name || "Applicant"} • Northstar Financial Services
                  </p>
                </div>
              </div>
              <div className="pdf-modal-header-right">
                <button
                  type="button"
                  className="button button-primary button-small"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  <Download size={14} /> Download PDF
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setShowPreviewModal(false)}
                  aria-label="Close Preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="pdf-modal-body">
              <iframe
                src={`${previewBlobUrl}#toolbar=1&navpanes=0`}
                className="pdf-modal-iframe"
                title="Loan Sanction Letter Preview"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

