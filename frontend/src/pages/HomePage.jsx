import {
  ArrowRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  CircleHelp,
  ClipboardCheck,
  Gauge,
  Lightbulb,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Eyebrow, FeatureCard } from "../components/Common";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <Eyebrow>SMARTER BORROWING STARTS HERE</Eyebrow>
          <h1>
            A clearer path
            <br />
            to <span>what’s next.</span>
          </h1>
          <p>
            Explore your loan assessment with thoughtful AI insights. Understand the factors behind your
            result, and see the numbers with confidence.
          </p>
          <div className="hero-actions">
            <Link to="/apply" className="button button-primary">
              Start an assessment <ArrowRight size={17} />
            </Link>
            <Link to="/admin" className="button button-quiet">
              View dashboard <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="hero-assurance">
            <span className="assurance-icon">
              <ShieldCheck size={16} />
            </span>
            <span>Your details are used to generate this assessment</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Illustration of an assessment summary" role="img">
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="floating-chip chip-top">
            <span className="chip-dot green-dot" />
            Explainable by design
          </div>
          <div className="visual-card">
            <div className="visual-card-top">
              <div>
                <span className="visual-label">YOUR FINANCIAL SNAPSHOT</span>
                <strong>Built around you</strong>
              </div>
              <span className="visual-icon">
                <Sparkles size={18} />
              </span>
            </div>
            <div className="visual-chart">
              <div className="visual-chart-grid">
                <span />
                <span />
                <span />
              </div>
              <svg viewBox="0 0 340 126" role="presentation">
                <defs>
                  <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#43b89a" stopOpacity=".28" />
                    <stop offset="100%" stopColor="#43b89a" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,100 C28,93 42,74 69,82 S108,91 132,62 S176,72 198,45 S234,51 260,32 S299,42 340,10 V126 H0Z"
                  fill="url(#chartFill)"
                />
                <path
                  d="M0,100 C28,93 42,74 69,82 S108,91 132,62 S176,72 198,45 S234,51 260,32 S299,42 340,10"
                  fill="none"
                  stroke="#38a889"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="260" cy="32" r="5" fill="#fff" stroke="#38a889" strokeWidth="3" />
              </svg>
              <div className="chart-months">
                <span>INPUTS</span>
                <span>INSIGHTS</span>
                <span>CLARITY</span>
              </div>
            </div>
            <div className="visual-insights">
              <div>
                <span className="insight-icon violet-bg">
                  <Gauge size={15} />
                </span>
                <span>Risk profile</span>
                <b>Personalized</b>
              </div>
              <div>
                <span className="insight-icon peach-bg">
                  <Lightbulb size={15} />
                </span>
                <span>Decision factors</span>
                <b>Made clear</b>
              </div>
            </div>
          </div>
          <div className="floating-chip chip-bottom">
            <span className="chip-spark">
              <Sparkles size={14} />
            </span>
            Built for transparency
          </div>
          <div className="hero-deco deco-a" />
          <div className="hero-deco deco-b" />
        </div>
      </section>

      <section className="welcome-row">
        <div>
          <span className="section-kicker">YOUR ASSESSMENT, AT A GLANCE</span>
          <h2>Everything you need to move forward.</h2>
        </div>
        <p>One considered assessment. Clear explanations. A better view of your options.</p>
      </section>

      <section className="feature-grid">
        <FeatureCard
          icon={<ClipboardCheck size={19} />}
          number="01"
          title="A considered assessment"
          copy="Share a few financial details to see an AI-assisted view of your application."
          tint="mint"
          link="/apply"
          label="Start assessment"
        />
        <FeatureCard
          icon={<Lightbulb size={19} />}
          number="02"
          title="Decisions, explained"
          copy="See which financial factors shaped your prediction, with SHAP and LIME perspectives."
          tint="lavender"
          link="/explain"
          label="Explore explainability"
        />
        <FeatureCard
          icon={<ChartNoAxesCombined size={19} />}
          number="03"
          title="Explore your options"
          copy="Change a few assumptions and compare how the numbers may shift."
          tint="peach"
          link="/what-if"
          label="Try what-if"
        />
      </section>

      <section className="disclaimer-strip" id="disclaimer">
        <CircleHelp size={18} />
        <p>
          <strong>A helpful guide, not a final decision.</strong> This AI-generated assessment is
          informational and does not guarantee loan approval. Final decisions depend on lender review.
        </p>
        <ArrowRight size={17} />
      </section>
    </>
  );
}
