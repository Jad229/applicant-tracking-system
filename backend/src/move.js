import { canTransition } from "./canTransition.js";
import { query } from "./db.js";

export default async function move(applicationId, targetStageName) {
    // Get the application's current stage
    const currentStageResult = await query(`
        SELECT stages.name FROM applications
        JOIN stages ON applications.stage_id = stages.id
        WHERE applications.id = $1
        `, [applicationId]);

    // If the application is not found, throw an error
    if (currentStageResult.rows.length === 0) {
        throw new Error("Application not found");
    }

    const currentStage = currentStageResult.rows[0].name;

    // Check if the target stage is in the legal transitions
    if (!canTransition(currentStage, targetStageName)) {
        throw new Error('Invalid target stage');
    }

    // Get the target stage id
    const targetStageIdResult = await query(`SELECT stages.id
        FROM applications
        JOIN stages ON stages.job_id = applications.job_id
        WHERE applications.id = $1
        AND stages.name = $2
        `, [applicationId, targetStageName]);

    // If the target stage is not found, throw an error
    if (targetStageIdResult.rows.length === 0) {
        throw new Error("Target stage not found");
    }

    const targetStageId = targetStageIdResult.rows[0].id;

    // Update the application's stage
    const result = await query(`UPDATE applications SET stage_id = $1 WHERE id = $2 RETURNING *`, [targetStageId, applicationId]);
    return result.rows[0];
}