# Implementation Plan: React Loan Assessment Frontend

**Date**: 2026-10-18 | **Spec**: User-provided frontend brief in this conversation

## Summary

Replace the two-tab Streamlit experience with a React + Vite applicant-facing SPA and an admin dashboard, while keeping prediction and explanation logic in Python. A FastAPI service will wrap the existing feature engineering in `common.py` and the saved XGBoost, Random Forest, and Isolation Forest models. The first increment delivers the five recommended core pages (assessment, results, explainability, admin dashboard, and what-if analysis) plus the landing page.

The MVP has no database or user authentication. Assessment and admin data remain suitable for a local/demo deployment only: use transient client state for an applicant's result and the existing CSV log for admin metrics. Do not place applicant inputs in URLs or browser persistent storage. Adding application history, user accounts, review-status writes, and PDF reports requires a separately approved persistence and access-control design; do not expose the MVP admin page publicly.

## Technical Context

**Languages/Versions**: Python (existing project runtime); JavaScript/JSX for React; verify installed runtime versions during setup.
**Primary Dependencies**: React, Vite, React Router, a React chart library, FastAPI, Uvicorn, Pydantic, existing pandas/numpy/scikit-learn/XGBoost/SHAP/LIME/joblib dependencies.
**Storage**: No database in the MVP. Retain the current append-only `applications_log.csv` behavior for admin aggregates and recent rows. Use temporary files for tests. CSV is not a safe multi-worker or production persistence solution.
**Testing**: pytest + FastAPI `TestClient`; frontend component/unit tests; Playwright browser tests for SPA journeys.
**Target Platform**: Local development first; serve the built SPA and FastAPI API in a controlled demo environment. Public deployment is out of scope until authentication, persistence, and operational controls are designed.
**Performance Goals**: No numeric SLA was supplied. Load model/explainer artifacts once per API process, keep prediction synchronous for the initial single-applicant workload, and avoid retraining or loading model files in the browser.
**Constraints**: Preserve trained model artifacts and current feature engineering/prediction semantics. Existing `app.py` is the behavior reference: input bounds, 10% assumed annual interest rate, risk thresholds, anomaly flag, recommendations, SHAP waterfall, LIME local explanation, and CSV-backed admin statistics.

### API contract proposed for the MVP

- `GET /api/health`: service and model-loader readiness.
- `POST /api/assess`: validated applicant input; return approval probability and the model's `predict` class (do not invent a probability cutoff), risk, anomaly, EMI, affordability, recommendation, and structured SHAP/LIME explanation data.
- `POST /api/what-if`: baseline applicant input plus scenario changes; return comparable baseline/scenario results using the same model/service path.
- `GET /api/admin/metrics` and `GET /api/admin/applications`: aggregate and list the existing CSV log for the local admin dashboard. Include explicit empty-log behavior and anomaly flags; do not imply that an anomaly has been reviewed. Include training evaluation metrics from `outputs/xgb_metrics.csv` and `outputs/rf_metrics.csv` when present, clearly labeled as offline training/evaluation metrics rather than live performance.
- Keep API request/response shapes documented with JavaScript JSDoc and Python Pydantic schemas. The exact chart payload should expose feature names and signed contributions, not Python/SHAP objects.

## Constitution Check

No project `constitution.md` was present in the supplied project files.

| Principle | Result | Notes |
|---|---|---|
| Preserve existing model behavior | PASS | Reuse `common.py` and saved model artifacts; add parity tests against current behavior. |
| Keep ML artifacts in Python | PASS | React calls FastAPI; it never loads `.joblib` files. |
| Avoid premature persistence | PASS | MVP retains the existing CSV log; database/history is deferred. |
| Protect applicant/admin data | CONDITIONAL | Do not persist form data in browser storage or expose admin routes publicly. Production release requires authentication, authorization, and persistence decisions. |
| Explain model output clearly | PASS | Return structured local SHAP and LIME factors with understandable labels and avoid presenting probability as a guaranteed outcome. |

## Applied Guidelines

No matching migration guidelines or project-specific architecture/design artifacts were supplied. The plan follows the existing Python feature/model pipeline and the React + Vite + Tailwind + FastAPI stack requested by the user.

## Implementation Steps

### Step 1: Project foundation

#### 1.1 Scaffold the frontend and API
- **Requirements**: REQ-003, REQ-008
- **Design inputs**: User-provided stack; existing `app.py`, `common.py`, and `requirements.txt`.
- **Description**: Add a `frontend/` React/Vite JavaScript application and a `backend/` FastAPI application. Keep Python training and model files in place. Configure local development API origin/proxy and model/log paths without hard-coded machine-specific paths.

#### 1.2 Establish test and contract foundations
- **Requirements**: REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007
- **Design inputs**: Proposed API contract above; current Streamlit input bounds and return behavior.
- **Description**: Define request/response schemas and a single documented local run/test workflow. Add pytest/API test setup, frontend unit/component test setup, and Playwright configuration. Make model and log paths configurable so tests can use temporary fixtures.

### Step 2: Model-backed API

#### 2.1 Adapt and validate the assessment service
- **Requirements**: REQ-002, REQ-003, REQ-008
- **Design inputs**: `common.py#build_row`, `common.py#add_features`, `app.py#assess`, `app.py#recommendation`.
- **Description**: Implement a backend model adapter that loads saved artifacts once at service startup, validates the same ranges/options as the existing form, builds features using the shared helper, and returns typed predictions. Preserve the existing recommendation, EMI, affordability, risk, and anomaly semantics; surface artifact-loading and prediction failures as explicit API errors.

#### 2.2 Expose assessment, what-if, explanation, and admin data
- **Requirements**: REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008
- **Design inputs**: API contract above; `app.py` explanation, what-if, and admin-tab behavior; `outputs/xgb_metrics.csv` and `outputs/rf_metrics.csv`.
- **Description**: Implement health/readiness, assessment, what-if, explanation payload, and admin metrics/application-list routes. Convert SHAP/LIME outputs to JSON-safe named factors. Reuse the CSV log for MVP admin data, handle missing/empty logs, and keep CSV writes explicit and testable. Record predicted class for new log rows using the model's class prediction; show historic rows without that field as unknown rather than guessing. Expose existing offline model evaluation metrics only when the files exist and label their provenance.

### Step 3: Applicant journeys

#### 3.1 Landing and applicant assessment
- **Requirements**: REQ-001, REQ-002
- **Design inputs**: User-provided page list; current applicant form labels, choices, and bounds in `app.py`.
- **Description**: Build the landing page, applicant navigation/layout, and accessible assessment form for dependents, education, employment, income, loan amount/term, CIBIL score, and four asset values. Validate client-side for usability and rely on API validation as the source of truth.

#### 3.2 Assessment results and explainability
- **Requirements**: REQ-004, REQ-005
- **Design inputs**: Current `assess`, `recommendation`, SHAP waterfall, and LIME explanation behavior in `app.py`.
- **Description**: Build results and explainability views showing approval probability/status, risk, EMI, affordability, anomaly status, recommendation, positive/negative prediction factors, SHAP visualization, and LIME cross-check. Use transient in-memory route/application state; if a user refreshes or opens a result link without state, provide a clear return-to-assessment path.

#### 3.3 What-if analysis
- **Requirements**: REQ-006
- **Design inputs**: Existing what-if controls in `app.py` (income, loan amount, and CIBIL adjustments).
- **Description**: Build scenario controls for loan amount, income, and CIBIL changes; call the API and compare approval probability, risk, and EMI against the original assessment. Keep all scenario inputs out of URLs and persistent browser storage.

### Step 4: Admin dashboard

#### 4.1 Show MVP application metrics and anomaly flags
- **Requirements**: REQ-007
- **Design inputs**: Current CSV log columns and admin tab in `app.py`; offline evaluation summaries in `outputs/xgb_metrics.csv` and `outputs/rf_metrics.csv`.
- **Description**: Build dashboard cards and charts for application count, average approval probability, predicted approval/rejection counts where logged, risk distribution, affordability distribution, offline model metrics when available, and anomaly flags. Show recent logged assessments and make flagged cases visible as requiring review; do not add a review-state mutation or claim that a case was reviewed. Historic rows lacking a predicted class remain unknown and are excluded from approval/rejection counts.

### Step 5: Integration and release readiness

#### 5.1 Verify journeys, accessibility, and local operation
- **Requirements**: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008
- **Design inputs**: Testing Strategy below.
- **Description**: Verify API/UI contracts, model parity, browser journeys, responsive layouts, loading/error/empty states, keyboard operation, and screen-reader labels. Document local setup and clearly mark the unauthenticated CSV-backed MVP as non-production. Gate public deployment on a later security/persistence design.

## Project Structure

```text
loan_ai_project/
├── app.py                         # Existing Streamlit reference; retain during migration
├── common.py                      # Shared training/live feature engineering
├── models/                         # Existing saved model artifacts; Python only
├── outputs/                        # Existing training and explanation outputs
├── backend/
│   └── app/
│       ├── main.py
│       ├── api/
│       │   └── routes.py
│       ├── schemas/
│       │   └── assessment.py
│       └── services/
│           ├── model_loader.py
│           └── loan_assessment.py
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── components/
│       ├── layouts/
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── ApplicantAssessment.jsx
│       │   ├── AssessmentResults.jsx
│       │   ├── Explainability.jsx
│       │   ├── WhatIfAnalysis.jsx
│       │   └── AdminDashboard.jsx
│       ├── services/
│       │   └── api.ts
│       ├── App.jsx
│       └── main.jsx
├── tests/
│   └── e2e/
└── requirements.txt
```

## Testing Strategy

- **appType**: Mixed application (FastAPI JSON API + React SPA).
- **Critical user journeys**:
  1. Enter valid applicant inputs, submit an assessment, and see probability, risk, EMI, affordability, anomaly state, and recommendation.
  2. Open the explanation from an assessment and see named SHAP factors plus a LIME comparison.
  3. Change income, loan amount, and/or CIBIL in what-if analysis and compare scenario outputs to the same baseline.
  4. Load admin metrics from seeded CSV data and verify counts, risk distribution, and anomaly flags; also verify the empty-log state.
- **primaryValidationStack**: pytest + FastAPI `TestClient` for service/API integration; Playwright against the running SPA for browser E2E; frontend unit/component tests for validation and rendering.
- **fallbackMatrix**:
  - `infra-tier`: No external infrastructure/database is required in the MVP. Use temporary CSV files for tests. If a database is approved later, select the engine first and test against a real Docker-managed instance; do not silently substitute a different database.
  - `browser-tier`: Playwright is primary (Node.js 22.20.0 is available). Verify Playwright and Chromium installation when implementation starts. If browser installation fails for a reproducible environment reason, use API/component tests only as a documented temporary fallback; gap: actual routing, rendering, and browser interaction remain unverified.
- **Environment requirements**: Python environment with existing ML dependencies plus FastAPI/Uvicorn; Node.js/npm; Playwright browser binaries for E2E. Docker daemon was checked and is not responding; no Docker service is needed for this no-database MVP.
- **knownGaps**: No durable application history; route state is transient and a refresh requires a new assessment. CSV storage is unsuitable for concurrent/multi-worker production use. Admin routes have no authentication/authorization in the MVP and must not be publicly exposed. Playwright browser installation has not yet been attempted.
- **Test data strategy**: Construct synthetic, boundary-valid applicant input for model/API tests; use temporary model/log paths or controlled model fixtures where appropriate; seed a temporary CSV per admin test and clean it up automatically. Do not depend on the real application log or dataset for test pass conditions.
- **Acceptance criteria**:
  - Valid and invalid assessment payloads produce the documented success/error contract; invalid inputs do not trigger model execution.
  - Service predictions match the existing `app.py` behavior for the same fixed inputs and artifacts, including derived features and recommendation thresholds.
  - SHAP/LIME response factors are JSON-serializable, named, and render without exposing Python objects.
  - What-if responses use the same assessment path and return comparable baseline/scenario values.
  - Admin totals and anomaly rows match seeded CSV data; absent/empty CSV produces a useful empty state rather than an error.
  - Playwright completes the four critical journeys without console errors; forms and navigation are keyboard-accessible and layouts work at mobile and desktop widths.
- **Validation review expectations**: Report test commands and pass/fail counts; verify the model artifact paths and parity; check API validation/errors and CSV behavior; confirm no applicant details appear in URLs or persistent browser storage; verify the admin warning and non-production deployment gate.
- **Unit/integration test infrastructure**: pytest fixtures provide a FastAPI `TestClient`, deterministic model doubles for route error/contract coverage, the trained artifacts for a small parity smoke test, and per-test temporary CSV paths. Frontend tests use Vitest and React Testing Library; Playwright starts the API and Vite app with isolated test configuration. Keep API schema examples/fixtures as the contract boundary so frontend and backend can be tested independently. No database/container base class is needed for this MVP.
- **Legacy test assets**: No test suite or browser/integration test files were present in the supplied project snapshot; no tests were provided by the user. There is no canonical project test command yet; add and document frontend, backend, and combined test scripts during scaffold.

## Deferred Scope

Application history/details, login/registration, profile/settings, PDF reports, and admin review-status changes are not part of the first implementation increment. Before implementing them, decide persistence, authentication/authorization, retention, and deployment requirements. The initial admin metrics view is limited to the existing CSV-backed data and is for a local/demo deployment only.

## Requirement Mapping

| REQ ID | Description | Plan Items | Implementation Evidence |
|--------|-------------|------------|--------------------------|
| REQ-001 | Provide a landing page and clear navigation into the loan assessment | 3.1, 5.1 | `frontend/src/pages/Home.jsx`, `frontend/src/layouts/` |
| REQ-002 | Collect and validate applicant financial/profile inputs | 1.2, 2.1, 3.1, 5.1 | `backend/app/schemas/assessment.py`, `frontend/src/pages/ApplicantAssessment.jsx` |
| REQ-003 | Serve predictions through Python/FastAPI using existing trained models | 1.1, 1.2, 2.1, 2.2, 5.1 | `backend/app/main.py`, `backend/app/api/routes.py`, `backend/app/services/` |
| REQ-004 | Show approval probability/status, risk, EMI, affordability, anomaly, and recommendation | 2.2, 3.2, 5.1 | `frontend/src/pages/AssessmentResults.jsx`, assessment API response |
| REQ-005 | Explain individual predictions with SHAP and LIME | 2.2, 3.2, 5.1 | `backend/app/services/loan_assessment.py`, `frontend/src/pages/Explainability.jsx` |
| REQ-006 | Compare changed applicant inputs through what-if analysis | 2.2, 3.3, 5.1 | `backend/app/api/routes.py`, `frontend/src/pages/WhatIfAnalysis.jsx` |
| REQ-007 | Show admin application/approval metrics, risk distribution, offline model metrics, and anomaly flags | 2.2, 4.1, 5.1 | `backend/app/api/routes.py`, `frontend/src/pages/AdminDashboard.jsx` |
| REQ-008 | Keep joblib models and prediction execution in Python, not React | 1.1, 2.1, 2.2, 5.1 | `backend/app/services/model_loader.py`, `frontend/src/services/api.js` |

## Task Breakdown

### Phase 1: Setup

- [ ] T001 [Plan:1.1] Create the Vite React JavaScript application in `frontend/` with React Router.
- [ ] T002 [P] [Plan:1.1] Create the FastAPI package structure in `backend/app/`, add FastAPI/Uvicorn dependencies to `requirements.txt`, and configure development CORS/proxy settings.
- [ ] T003 [Plan:1.2] Add pytest configuration and fixtures for FastAPI `TestClient`, temporary log files, and model-path configuration.
- [ ] T004 [P] [Plan:1.2] Configure Vitest/React Testing Library and Playwright scripts in `frontend/package.json`.

### Phase 2: Foundational API and contracts

- [ ] T005 [Plan:2.1] Define Pydantic applicant, scenario, assessment-result, explanation, and admin response schemas in `backend/app/schemas/assessment.py`.
- [ ] T006 [P] [Plan:2.1] Document matching JavaScript request/response shapes with JSDoc in `frontend/src/services/api.js`.
- [ ] T007 [Plan:2.1] Implement configurable one-time model/explainer loading in `backend/app/services/model_loader.py`, with explicit startup errors for missing or incompatible artifacts.
- [ ] T008 [Plan:2.1] Implement the model adapter in `backend/app/services/loan_assessment.py` using `common.py`; preserve feature engineering, thresholds, recommendation text, and output semantics.
- [ ] T009 [Plan:2.2] Implement FastAPI health, assessment, and what-if routes in `backend/app/api/routes.py`, returning typed JSON-safe SHAP/LIME factors, model-predicted class, and explicit validation/service errors.
- [ ] T010 [P] [Plan:2.2] Implement configurable CSV logging and admin metrics/application-list routes in `backend/app/services/` and `backend/app/api/routes.py`, including missing/empty-log behavior, historic unknown statuses, anomaly flags, and optional offline model-metric files.
- [ ] T011 [Plan:2.2] Add API integration tests for validation, model parity, explanation serialization, what-if comparisons, CSV metrics, and empty-log behavior under `tests/`.

### Phase 3: Applicant journeys

- [ ] T012 [US1] [Plan:3.1] Create the applicant layout, landing page, and React routes in `frontend/src/layouts/ApplicantLayout.jsx`, `frontend/src/pages/Home.jsx`, and `frontend/src/App.jsx`.
- [ ] T013 [US1] [Plan:3.1] Build the validated applicant form in `frontend/src/pages/ApplicantAssessment.jsx` using the existing field choices and bounds.
- [ ] T014 [US1] [Plan:3.1] Add API calls, request/loading/error handling, and transient assessment state in `frontend/src/services/api.js` and `frontend/src/`.
- [ ] T015 [US2] [Plan:3.2] Build `frontend/src/pages/AssessmentResults.jsx` with approval, risk, EMI, affordability, anomaly, and recommendation output.
- [ ] T016 [US2] [Plan:3.2] Build `frontend/src/pages/Explainability.jsx` with signed feature-contribution charts for SHAP and a distinct LIME comparison.
- [ ] T017 [US3] [Plan:3.3] Build `frontend/src/pages/WhatIfAnalysis.jsx` with income, loan-amount, and CIBIL controls and baseline/scenario comparisons.
- [ ] T018 [US3] [Plan:3.3] Add frontend tests for scenario-boundary handling and comparison rendering in `frontend/src/`.

### Phase 4: Admin dashboard

- [ ] T019 [US4] [Plan:4.1] Build `frontend/src/pages/AdminDashboard.jsx` with aggregate cards, approval/risk/affordability charts, available offline model metrics, recent application rows, and anomaly flags.
- [ ] T020 [US4] [Plan:4.1] Add admin dashboard tests for populated and empty API responses in `frontend/src/`.

### Phase 5: Integration and release readiness

- [ ] T021 [Cross-cutting] [Plan:5.1] Add Playwright tests in `tests/e2e/` for applicant assessment, results/explanations, what-if comparisons, and admin metrics/anomaly display.
- [ ] T022 [Cross-cutting] [Plan:5.1] Verify responsive layouts, keyboard/screen-reader accessibility, loading/error states, and API CORS/proxy behavior across `frontend/src/`.
- [ ] T023 [Cross-cutting] [Plan:5.1] Document backend/frontend setup, test commands, model/log configuration, transient result behavior, and the non-production security/persistence limitations in `README.md`.
