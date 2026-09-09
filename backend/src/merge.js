import { transaction } from "./db.js";

/**
 * Links a duplicate candidate (loser) to the keeper (winner).
 * Never DELETE. The loser row stays and points at the winner.
 *
 * @param {number} loserId
 * @param {number} winnerId
 */
export default async function merge(loserId, winnerId) {
  if (Number(loserId) === Number(winnerId)) {
    throw new Error("Cannot merge a candidate into themselves");
  }

  return transaction(async (connection) => {
    const loserResult = await connection.query(
      `SELECT * FROM candidates WHERE id = $1`,
      [loserId],
    );
    const winnerResult = await connection.query(
      `SELECT * FROM candidates WHERE id = $1`,
      [winnerId],
    );

    if (loserResult.rows.length === 0) {
      throw new Error("Loser candidate not found");
    }
    if (winnerResult.rows.length === 0) {
      throw new Error("Winner candidate not found");
    }

    if (loserResult.rows[0].merged_into_id !== null) {
      throw new Error("Loser candidate is already merged");
    }
    if (winnerResult.rows[0].merged_into_id !== null) {
      throw new Error("Winner candidate is already merged");
    }

    // Applications plus stage.position so we can pick "furthest along"
    const loserAppsResult = await connection.query(
      `
      SELECT applications.id, applications.job_id, applications.stage_id, stages.position
      FROM applications
      JOIN stages ON applications.stage_id = stages.id
      WHERE applications.candidate_id = $1
      `,
      [loserId],
    );

    const winnerAppsResult = await connection.query(
      `
      SELECT applications.id, applications.job_id, applications.stage_id, stages.position
      FROM applications
      JOIN stages ON applications.stage_id = stages.id
      WHERE applications.candidate_id = $1
      `,
      [winnerId],
    );

    const loserApps = loserAppsResult.rows;
    const winnerApps = winnerAppsResult.rows;

    for (const loserApp of loserApps) {
      const winnerApp = winnerApps.find(
        (app) => app.job_id === loserApp.job_id,
      );

      if (!winnerApp) {
        // Winner never applied to this job — move the application over
        await connection.query(
          `UPDATE applications SET candidate_id = $1 WHERE id = $2`,
          [winnerId, loserApp.id],
        );
      } else if (loserApp.position > winnerApp.position) {
        // Same job: UNIQUE (candidate_id, job_id) would fail if we moved it.
        // Keep the later stage on the winner. Leave the extra row on the loser.
        await connection.query(
          `UPDATE applications SET stage_id = $1 WHERE id = $2`,
          [loserApp.stage_id, winnerApp.id],
        );
        console.log(
          `Same-job collision on job ${loserApp.job_id}: kept later stage, left application ${loserApp.id} on loser`,
        );
      } else {
        console.log(
          `Same-job collision on job ${loserApp.job_id}: kept winner application ${winnerApp.id}, left application ${loserApp.id} on loser`,
        );
      }
    }

    const updatedLoser = await connection.query(
      `UPDATE candidates SET merged_into_id = $1 WHERE id = $2 RETURNING *`,
      [winnerId, loserId],
    );

    return updatedLoser.rows[0];
  });
}
