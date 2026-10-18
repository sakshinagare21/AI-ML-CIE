import { ArrowRight, Lightbulb, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import {
  EmptyAssessment,
  ExplanationCard,
  PageHeading,
} from "../components/Common";

export default function ExplainabilityPage({ result }) {
  if (!result) {
    return (
      <EmptyAssessment
        title="The explanation comes after the assessment."
        description="Submit your details to see what contributed to the model’s prediction."
      />
    );
  }

  const shap = result.explanations?.shap ?? [];
  const lime = result.explanations?.lime ?? [];

  return (
    <>
      <PageHeading
        eyebrow="EXPLAINABLE AI"
        title="Every result has a “why”."
        description="Two complementary methods help make this model’s individual prediction easier to understand."
        action={
          <Link to="/results" className="button button-secondary">
            Back to results <ArrowRight size={16} />
          </Link>
        }
      />
      <div className="explain-callout">
        <span className="section-icon lavender">
          <Lightbulb size={18} />
        </span>
        <p>
          <strong>A note on explanations: </strong>
          Feature contributions describe how this model arrived at its estimate. They are not
          proof of cause and do not guarantee a particular outcome.
        </p>
      </div>
      <div className="two-column explain-grid">
        <ExplanationCard
          title="SHAP"
          subtitle="How each factor moved the estimate"
          description="Bars to the right support approval; bars to the left reduce the model’s approval estimate."
          items={shap}
          color="#6758c8"
        />
        <ExplanationCard
          title="LIME"
          subtitle="A local second opinion"
          description="LIME provides an independent, local approximation of how the model behaves near this application."
          items={lime}
          color="#31a98a"
        />
      </div>
      <div className="model-note">
        <ShieldCheck size={17} />
        <span>
          Explanations are generated for this assessment by the Python model service. If no factors
          are shown, check that the service returned explanation data.
        </span>
      </div>
    </>
  );
}
