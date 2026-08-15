import "dotenv/config";
import pg from "pg";
import { legalTransitions } from "../canTransition.js";
import { query } from "../db.js";

// Define the states of the application process
const STAGES = [
  "applied",
  "phone_screen",
  "technical",
  "onsite",
  "offer",
  "hired",
  "rejected",
];

// Define the terminal states of the application process
const TERMINAL_STAGES = ["hired", "rejected"];

// Seed the database with the application process
async function seed() {
  // Insert the job into the jobs table
  const jobResult = await query(
    `INSERT INTO jobs (title) VALUES ($1) RETURNING id`,
    ["Software Engineer - Discord"],
  );
  const jobId = jobResult.rows[0].id;

  // Create an object to hold the stage IDs
  const stageIds = {}; // will hold { applied: 5, phone_screen: 6, ... }

  // Loop through array of stages and INSERT INTO stages table
  for (let i = 0; i < STAGES.length; i++) {
    const name = STAGES[i];
    const position = i + 1;
    const isTerminal = TERMINAL_STAGES.includes(name);

    const stageResult = await query(
      `INSERT INTO stages (name, position, is_terminal, job_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [name, position, isTerminal, jobId],
    );

    stageIds[name] = stageResult.rows[0].id;
  }

  // Loop through the legal transitions and INSERT INTO transitions table
  for (const fromName in legalTransitions) {
    const toNames = legalTransitions[fromName];
    for (const toName of toNames) {
      await query(
        `INSERT INTO transitions (from_stage_id, to_stage_id) VALUES ($1, $2)`,
        [stageIds[fromName], stageIds[toName]],
      );
    }
  }

  // Insert the candidates into the candidates table
  const candidateResult = await query(
    `INSERT INTO candidates (name, email) VALUES ($1, $2) RETURNING id`,
    ["John Doe", "john.doe@example.com"],
  );
  const candidateId = candidateResult.rows[0].id;

  // Insert the applications into the applications table
  const applicationResult = await query(
    `INSERT INTO applications (candidate_id, job_id, stage_id) VALUES ($1, $2, $3)`,
    [candidateId, jobId, stageIds.applied],
  );

  console.log("Seed complete");
}

try {
  await seed();
} catch (error) {
  console.error(error);
}