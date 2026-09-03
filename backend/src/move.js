import { canTransition, getAllowedStages } from "./canTransition.js";
import { query } from "./db.js";

export default async function move(applicationId, targetStageId) {
  // Get the application's current stage
  const currentStageResult = await query(
    `
        SELECT stage_id FROM applications WHERE id = $1
        `,
    [applicationId],
  );

  // If the application is not found, throw an error
  if (currentStageResult.rows.length === 0) {
    throw new Error("Application not found");
  }

  const currentStageId = currentStageResult.rows[0].stage_id;

  // Check if transition is legal
  if (!(await canTransition(currentStageId, targetStageId))) {
    const error = new Error("Invalid target stage");
    error.allowedStages = await getAllowedStages(currentStageId);
    throw error;
  }

  // Update the application's stage
  const result = await query(
    `UPDATE applications SET stage_id = $1 WHERE id = $2 RETURNING *`,
    [targetStageId, applicationId],
  );
  return result.rows[0];
}
