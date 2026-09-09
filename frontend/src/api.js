// Tiny fetch wrapper. Vite proxies these paths to the Express API (port 3000).
// On failure we attach status + body to the Error so App.jsx can read
// allowedStages off a 409 without guessing.

async function request(path, options = {}) {
  const { headers, ...rest } = options;
  const response = await fetch(path, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || "Request failed");
    error.status = response.status;
    error.body = data;
    throw error;
  }

  return data;
}

export function fetchJobs() {
  return request("/jobs");
}

export function fetchBoard(jobId) {
  return request(`/jobs/${jobId}/board`);
}

export function moveApplication(applicationId, targetStageId) {
  return request(`/applications/${applicationId}/move`, {
    method: "POST",
    body: JSON.stringify({ targetStageId: Number(targetStageId) }),
  });
}

export function mergeCandidates(winnerId, loserId) {
  // winner stays on the board; loser gets merged_into_id set (not deleted)
  return request(`/candidates/${winnerId}/merge`, {
    method: "POST",
    body: JSON.stringify({ loserId: Number(loserId) }),
  });
}
