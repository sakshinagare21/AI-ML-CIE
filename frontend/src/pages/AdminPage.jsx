import { Suspense, useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  CircleHelp,
  ClipboardCheck,
  FileChartColumnIncreasing,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  MetricCard,
  PageHeading,
  RiskPill,
  formatINR,
  formatPercent,
} from "../components/Common";
import RiskDistributionChart from "../components/RiskDistributionChart";
import { getAdminData } from "../services/api";

export default function AdminPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await getAdminData();
      setData(payload);
      setUpdatedAt(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Admin dashboard data could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const metrics = data?.metrics;
  const riskData = metrics?.risk_distribution
    ? Object.entries(metrics.risk_distribution).map(([name, value]) => ({
        name,
        value,
      }))
    : [];
  const pieColors = ["#31a98a", "#e6ae61", "#e88f76"];

  return (
    <>
      <PageHeading
        eyebrow="ADMIN WORKSPACE"
        title="A view across applications."
        description="Monitor assessment activity, risk signals, and model evaluation metrics."
        action={
          <button
            className="button button-secondary"
            onClick={() => void load()}
            disabled={loading}
          >
            <Activity size={16} />
            {loading ? "Refreshing…" : "Refresh data"}
          </button>
        }
      />
      <div className="admin-notice">
        <ShieldCheck size={17} />
        <span>Local demo dashboard</span>
        <i />
        This admin view is not authenticated. Keep it off public deployments.
      </div>

      {error && (
        <div className="alert alert-error admin-error" role="alert">
          <CircleHelp size={18} />
          <div>
            <strong>Dashboard data unavailable</strong>
            <span>{error}</span>
          </div>
          <button className="button button-small button-secondary" onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}

      {loading && !data ? (
        <div className="card loading-card">
          <span className="spinner" />
          Loading assessment metrics…
        </div>
      ) : data && metrics ? (
        <>
          <div className="metrics-grid admin-metrics">
            <MetricCard
              icon={<ClipboardCheck size={18} />}
              label="Total assessments"
              value={metrics.total_applications.toLocaleString("en-IN")}
              note={updatedAt ? `Updated at ${updatedAt}` : "All recorded applications"}
              color="mint"
            />
            <MetricCard
              icon={<Activity size={18} />}
              label="Avg. approval probability"
              value={formatPercent(metrics.average_approval_probability)}
              note="Across recorded assessments"
              color="lavender"
            />
            <MetricCard
              icon={<BadgeCheck size={18} />}
              label="Predicted approvals"
              value={
                metrics.approvals == null
                  ? "—"
                  : metrics.approvals.toLocaleString("en-IN")
              }
              note={
                metrics.approval_status_unknown
                  ? `${metrics.approval_status_unknown} historic status unknown`
                  : "Model-predicted status"
              }
              color="peach"
            />
            <MetricCard
              icon={<ShieldCheck size={18} />}
              label="Anomaly flags"
              value={data.applications
                .filter((item) => item.anomaly)
                .length.toLocaleString("en-IN")}
              note="Cases needing attention"
              color="lavender"
            />
          </div>

          <div className="admin-chart-grid">
            <section className="card chart-card">
              <div className="chart-card-heading">
                <div>
                  <h2>Risk distribution</h2>
                  <p>Risk classifications across applications</p>
                </div>
                <span className="chart-menu">
                  <Activity size={16} />
                </span>
              </div>
              {riskData.length ? (
                <Suspense fallback={<div className="empty-chart">Loading chart…</div>}>
                  <RiskDistributionChart data={riskData} colors={pieColors} />
                </Suspense>
              ) : (
                <div className="empty-chart">
                  <Gauge size={21} />
                  <span>No risk classification data yet.</span>
                </div>
              )}
            </section>

            <section className="card chart-card">
              <div className="chart-card-heading">
                <div>
                  <h2>Model evaluation</h2>
                  <p>Offline holdout metrics · not live performance</p>
                </div>
                <span className="offline-badge">OFFLINE</span>
              </div>
              {metrics.offline_model_metrics &&
              Object.keys(metrics.offline_model_metrics).length ? (
                <div className="model-metric-list">
                  {Object.entries(metrics.offline_model_metrics).map(([model, values]) => (
                    <div className="model-metric-group" key={model}>
                      <strong>{model.replaceAll("_", " ")}</strong>
                      <div>
                        {Object.entries(values)
                          .slice(0, 4)
                          .map(([key, value]) => (
                            <span key={key}>
                              {key.replaceAll("_", " ")}
                              <b>{formatPercent(value)}</b>
                            </span>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-chart">
                  <FileChartColumnIncreasing size={21} />
                  <span>Offline model metrics aren’t available from the service.</span>
                </div>
              )}
            </section>
          </div>

          <section className="card applications-table-card">
            <div className="table-heading">
              <div>
                <h2>Recent assessments</h2>
                <p>Latest activity from the application log</p>
              </div>
              <span className="record-count">{data.applications.length} records</span>
            </div>
            {data.applications.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>APPLICATION</th>
                      <th>APPROVAL PROBABILITY</th>
                      <th>RISK</th>
                      <th>MONTHLY EMI</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.applications.slice(0, 8).map((item, index) => (
                      <tr key={`${item.time}-${index}`}>
                        <td>
                          <strong>
                            Application {String(data.applications.length - index).padStart(3, "0")}
                          </strong>
                          <span>{new Date(item.time).toLocaleString()}</span>
                        </td>
                        <td>{formatPercent(item.approval_probability)}</td>
                        <td>
                          <RiskPill risk={item.risk} />
                        </td>
                        <td>{formatINR(item.emi)}</td>
                        <td>
                          {item.anomaly ? (
                            <span className="table-status flagged">
                              <i />
                              Flagged for review
                            </span>
                          ) : item.predicted_status ? (
                            <span
                              className={`table-status ${
                                item.predicted_status === "Approved" ? "approved" : "rejected"
                              }`}
                            >
                              <i />
                              {item.predicted_status}
                            </span>
                          ) : (
                            <span className="table-status unknown">Status unavailable</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-chart table-empty">
                <ClipboardCheck size={22} />
                <span>No applications have been assessed yet.</span>
                <Link to="/apply" className="text-link">
                  Start an assessment <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </section>
        </>
      ) : !error ? (
        <div className="card loading-card">No dashboard data was returned.</div>
      ) : null}
    </>
  );
}
