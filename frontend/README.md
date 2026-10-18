# Loan assessment frontend

React + Vite single-page app written in JavaScript (JSX).

## Run locally

```powershell
cd frontend
npm install
npm run dev
```

The Vite development server proxies `/api` requests to `http://127.0.0.1:8000` by default. Set `VITE_API_PROXY_TARGET` to use a different backend host. The API must provide:

- `GET /api/health`
- `POST /api/assess`
- `POST /api/what-if`
- `GET /api/admin/metrics`
- `GET /api/admin/applications`

To use an API base URL directly instead of the Vite proxy, set `VITE_API_BASE_URL` before starting or building the frontend.

## Build

```powershell
npm run build
npm run preview
```

Applicant form state and results are held in memory for the browser session; they are not written to browser storage or placed in URL parameters. The existing demo API may log limited assessment metrics (including probability, risk, EMI, CIBIL, income, and loan amount) to its CSV log. The admin dashboard is a local demo view only; it has no authentication and must not be exposed publicly.
