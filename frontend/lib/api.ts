const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

// ---- Audits ----

export function createAudit(): Promise<{ audit_id: string }> {
  return request("/api/audits", { method: "POST" });
}

export function getAudit(auditId: string): Promise<any> {
  return request(`/api/audits/${auditId}`);
}

export interface QuestionnairePayload {
  state: string;
  facility_type: string;
  building_age: string;
  recent_renovation: boolean;
  renovation_cost: number | null;
  parking_spaces: number;
}

export function submitQuestionnaire(
  auditId: string,
  payload: QuestionnairePayload,
): Promise<{ audit_id: string; applicable_modules: string[]; rule_count: number }> {
  return request(`/api/audits/${auditId}/questionnaire`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ---- Modules ----

export function createModule(
  auditId: string,
  moduleType: string,
): Promise<{ module_id: string; instructions: string }> {
  return request(`/api/audits/${auditId}/modules`, {
    method: "POST",
    body: JSON.stringify({ module_type: moduleType }),
  });
}

export async function uploadVideo(
  auditId: string,
  moduleId: string,
  file: File,
): Promise<{ status: string; module_id: string }> {
  const formData = new FormData();
  formData.append("video", file);
  const res = await fetch(
    `${API_BASE}/api/audits/${auditId}/modules/${moduleId}/upload`,
    { method: "POST", body: formData },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload error ${res.status}: ${text}`);
  }
  return res.json();
}

export function getModuleStatus(
  auditId: string,
  moduleId: string,
): Promise<{
  status: string;
  progress: number;
  violations_found: number | null;
  error_message: string | null;
}> {
  return request(`/api/audits/${auditId}/modules/${moduleId}/status`);
}

export function getModuleResults(auditId: string, moduleId: string): Promise<any> {
  return request(`/api/audits/${auditId}/modules/${moduleId}/results`);
}

// ---- Reports ----

export function triggerReport(auditId: string): Promise<{ status: string }> {
  return request(`/api/audits/${auditId}/report`, { method: "POST" });
}

export function getReport(auditId: string): Promise<any> {
  return request(`/api/audits/${auditId}/report`);
}
