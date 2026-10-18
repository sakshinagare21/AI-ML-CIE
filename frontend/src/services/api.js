const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export function checkHealth() {
  return request("/api/health");
}

async function request(path, init) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init?.body ? { "Content-Type": "application/json" } : {},
        ...init?.headers
      }
    });
  } catch {
    throw new Error("We couldn\u2019t reach the assessment service. Check that the FastAPI server is running, then try again.");
  }
  if (!response.ok) {
    let detail = `The service returned an error (${response.status}).`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail)) detail = body.detail.map((item) => item.msg).filter(Boolean).join(" ");
    } catch {
    }
    throw new Error(detail);
  }
  return await response.json();
}
export function assessApplicant(input) {
  return request("/api/assess", {
    method: "POST",
    body: JSON.stringify(input)
  });
}
export function analyzeWhatIf(input, changes) {
  return request("/api/what-if", {
    method: "POST",
    body: JSON.stringify({ applicant: input, changes })
  });
}
export async function getAdminData() {
  const [metrics, applicationResponse] = await Promise.all([
    request("/api/admin/metrics"),
    request("/api/admin/applications")
  ]);
  const applications = Array.isArray(applicationResponse) ? applicationResponse : applicationResponse.applications;
  return { metrics, applications };
}

export async function fetchSanctionPdfBlob(applicant, result) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/download-sanction-letter`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/pdf"
      },
      body: JSON.stringify({ applicant, result })
    });
  } catch {
    throw new Error("We couldn't reach the document generation service. Please check your backend connection.");
  }

  if (!response.ok) {
    let detail = `Failed to generate PDF (${response.status})`;
    try {
      const err = await response.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new Error(detail);
  }

  return await response.blob();
}

export async function downloadSanctionLetter(applicant, result) {
  const blob = await fetchSanctionPdfBlob(applicant, result);
  const safeName = (applicant?.full_name || "Applicant").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${safeName}_Loan_Sanction_Letter.pdf`;

  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 15000);

  return { success: true, filename, blobUrl };
}

