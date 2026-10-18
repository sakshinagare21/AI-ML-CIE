import { useEffect, useState } from "react";
import {
  Bell,
  ChartNoAxesCombined,
  ChevronDown,
  ClipboardCheck,
  FileChartColumnIncreasing,
  Gauge,
  House,
  Landmark,
  Lightbulb,
  Menu,
  ShieldCheck,
} from "lucide-react";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import AssessmentPage from "./pages/AssessmentPage";
import ExplainabilityPage from "./pages/ExplainabilityPage";
import HomePage from "./pages/HomePage";
import ResultsPage from "./pages/ResultsPage";
import WhatIfPage from "./pages/WhatIfPage";
import { assessApplicant, checkHealth } from "./services/api";

const initialApplicant = {
  no_of_dependents: 2,
  education: "Graduate",
  self_employed: "No",
  income_annum: 5e6,
  loan_amount: 15e6,
  loan_term: 10,
  cibil_score: 650,
  residential_assets_value: 7e6,
  commercial_assets_value: 5e6,
  luxury_assets_value: 15e6,
  bank_asset_value: 5e6,
};

function pageName(path) {
  if (path === "/apply") return "New assessment";
  if (path === "/results") return "Assessment results";
  if (path === "/explain") return "Why this result?";
  if (path === "/what-if") return "What-if planner";
  return "Overview";
}

export default function App() {
  const [applicant, setApplicant] = useState(initialApplicant);
  const [assessment, setAssessment] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [serviceAvailable, setServiceAvailable] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname.startsWith("/admin");

  useEffect(() => {
    checkHealth().then(
      () => setServiceAvailable(true),
      () => setServiceAvailable(false)
    );
  }, []);

  const submitAssessment = async (form) => {
    const result = await assessApplicant(form);
    setApplicant(form);
    setAssessment(result);
    navigate("/results");
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark">
            <Landmark size={21} strokeWidth={2.2} />
          </span>
          <span className="brand-copy">
            northstar<span>FINANCIAL CLARITY</span>
          </span>
        </Link>

        <div className="nav-caption">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <House size={18} /> <span>Overview</span>
          </NavLink>
          <NavLink
            to="/apply"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <ClipboardCheck size={18} /> <span>New assessment</span>
          </NavLink>
          <NavLink
            to="/results"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <FileChartColumnIncreasing size={18} /> <span>Assessment results</span>
          </NavLink>
          <NavLink
            to="/explain"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <Lightbulb size={18} /> <span>Why this result?</span>
          </NavLink>
          <NavLink
            to="/what-if"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <ChartNoAxesCombined size={18} /> <span>What-if planner</span>
          </NavLink>
        </nav>

        <div className="nav-caption nav-caption-admin">MANAGEMENT</div>
        <nav className="side-nav">
          <NavLink
            to="/admin"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <Gauge size={18} /> <span>Admin dashboard</span>
          </NavLink>
        </nav>

        <div className="sidebar-spacer" />
        <div className="privacy-card">
          <span className="privacy-icon">
            <ShieldCheck size={17} />
          </span>
          <div>
            <strong>Session-based applicant view</strong>
            <p>Full form details aren’t saved in browser storage.</p>
          </div>
        </div>
        <div className="sidebar-profile">
          <div className="avatar">NS</div>
          <div className="profile-copy">
            <strong>Applicant workspace</strong>
            <span>Personal assessment</span>
          </div>
          <ChevronDown size={16} className="muted-icon" />
        </div>
      </aside>

      {menuOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu-button icon-button"
            aria-label="Open navigation"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumbs">
            <span>Workspace</span>
            <span className="crumb-sep">/</span>
            <strong>{isAdmin ? "Admin dashboard" : pageName(location.pathname)}</strong>
          </div>
          <div className="topbar-actions">
            <span
              className={`service-status ${
                serviceAvailable === false ? "service-offline" : ""
              }`}
            >
              <i />
              {serviceAvailable === null
                ? "Checking service"
                : serviceAvailable
                ? "AI service ready"
                : "AI service offline"}
            </span>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <i />
            </button>
            <div className="topbar-avatar">A</div>
          </div>
        </header>

        <div className="page-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/apply"
              element={
                <AssessmentPage
                  applicant={applicant}
                  onSubmit={submitAssessment}
                />
              }
            />
            <Route path="/results" element={<ResultsPage applicant={applicant} result={assessment} />} />
            <Route
              path="/explain"
              element={<ExplainabilityPage result={assessment} />}
            />
            <Route
              path="/what-if"
              element={<WhatIfPage applicant={applicant} result={assessment} />}
            />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <footer className="site-footer">
          <span>© 2026 Northstar Financial</span>
          <span>AI-assisted insight, human-centered decisions</span>
          <a href="#disclaimer">Important information</a>
        </footer>
      </main>
    </div>
  );
}
