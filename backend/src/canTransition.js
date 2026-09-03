import { query } from "./db.js";

export const legalTransitions = {
  applied: ["phone_screen", "rejected"],
  phone_screen: ["technical", "rejected"],
  technical: ["onsite", "rejected"],
  onsite: ["offer", "rejected"],
  offer: ["hired", "rejected"],
  hired: [],
  rejected: [],
};

/**
 * Determines if a transition between two stages is legally permitted.
 *
 * @param {number} fromStageId - Starting stage
 * @param {number} toStageId - Desired destination stage
 * @returns {boolean} Whether the transition is allowed
 */
export async function canTransition(fromStageId, toStageId) {
  // Query the transitions table to see if a row exist
  // with a from stage and to stage.
  const result = await query(
    `
    SELECT 1 FROM transitions
    WHERE from_stage_id = $1 AND to_stage_id = $2`,
    [fromStageId, toStageId],
  );

  // if no Rows are found its not allowed
  return result.rows.length > 0;
}

/**
 * Returns the stages an application may move to from a given stage.
 *
 * @param {number} fromStageId - Starting stage id
 * @returns {Promise<{ id: number, name: string }[]>} Allowed target stages
 */
export async function getAllowedStages(fromStageId) {
  const result = await query(
    `
        SELECT to_stage.id, to_stage.name
        FROM transitions
        JOIN stages AS to_stage ON transitions.to_stage_id = to_stage.id
        WHERE transitions.from_stage_id = $1
        `,
    [fromStageId],
  );

  return result.rows;
}
