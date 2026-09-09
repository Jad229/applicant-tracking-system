import assert from "node:assert/strict";
import merge from "../merge.js";
import { query } from "../db.js";

async function testMerge() {
  const jobResult = await query(`SELECT id FROM jobs ORDER BY id LIMIT 1`);
  if (jobResult.rows.length === 0) {
    throw new Error("No jobs in the database. Run seed.js first.");
  }
  const jobId = jobResult.rows[0].id;

  const stagesResult = await query(
    `SELECT id, name FROM stages WHERE job_id = $1`,
    [jobId],
  );
  const stageIds = {};
  for (const stage of stagesResult.rows) {
    stageIds[stage.name] = stage.id;
  }

  // --- Collision: both applied to the same job ---
  const winnerResult = await query(
    `INSERT INTO candidates (name, email) VALUES ($1, $2) RETURNING id`,
    ["Jane Winner", "jane@gmail.com"],
  );
  const loserResult = await query(
    `INSERT INTO candidates (name, email) VALUES ($1, $2) RETURNING id`,
    ["Jane Loser", "jane.doe@gmail.com"],
  );
  const winnerId = winnerResult.rows[0].id;
  const loserId = loserResult.rows[0].id;

  await query(
    `INSERT INTO applications (candidate_id, job_id, stage_id) VALUES ($1, $2, $3)`,
    [winnerId, jobId, stageIds.applied],
  );
  await query(
    `INSERT INTO applications (candidate_id, job_id, stage_id) VALUES ($1, $2, $3)`,
    [loserId, jobId, stageIds.phone_screen],
  );

  const merged = await merge(loserId, winnerId);
  assert.equal(merged.merged_into_id, winnerId);

  const winnerApp = await query(
    `
    SELECT stages.name
    FROM applications
    JOIN stages ON applications.stage_id = stages.id
    WHERE applications.candidate_id = $1 AND applications.job_id = $2
    `,
    [winnerId, jobId],
  );
  assert.equal(winnerApp.rows[0].name, "phone_screen");

  const loserApps = await query(
    `SELECT id FROM applications WHERE candidate_id = $1`,
    [loserId],
  );
  assert.equal(loserApps.rows.length, 1);

  // --- No collision: only the loser applied ---
  const winner2Result = await query(
    `INSERT INTO candidates (name, email) VALUES ($1, $2) RETURNING id`,
    ["Alex Winner", "alex@example.com"],
  );
  const loser2Result = await query(
    `INSERT INTO candidates (name, email) VALUES ($1, $2) RETURNING id`,
    ["Alex Loser", "alex+jobs@example.com"],
  );
  const winner2Id = winner2Result.rows[0].id;
  const loser2Id = loser2Result.rows[0].id;

  await query(
    `INSERT INTO applications (candidate_id, job_id, stage_id) VALUES ($1, $2, $3)`,
    [loser2Id, jobId, stageIds.applied],
  );

  await merge(loser2Id, winner2Id);

  const movedApps = await query(
    `SELECT id FROM applications WHERE candidate_id = $1`,
    [winner2Id],
  );
  assert.equal(movedApps.rows.length, 1);

  const leftoverApps = await query(
    `SELECT id FROM applications WHERE candidate_id = $1`,
    [loser2Id],
  );
  assert.equal(leftoverApps.rows.length, 0);

  console.log("merge checks passed");
}

try {
  await testMerge();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  process.exit();
}
