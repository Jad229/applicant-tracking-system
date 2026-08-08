import pg from "pg";
import { legalTransitions } from "../canTransition";
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const STATES = [
  "applied",
  "phone_screen",
  "technical",
  "onsite",
  "offer",
  "hired",
  "rejected",
];

const TERMINAL_STAGES = ["hired", "rejected"];

async function seed() {
  const jobResult = await pool.query(
    `INSERT INTO jobs (title) VALUES ($1) RETURNING id`,
    ["Software Engineer - Discord"],
  );
  const jobId = jobResult.rows[0].id;

  const stageIds = {}; // will hold { applied: 5, phone_screen: 6, ... }

  // loops through array of stages and INSERT INTO stages table
  for (let i = 0; i < STATES.length; i++) {
    const name = STATES[i];
    const position = i + 1;
    const isTerminal = TERMINAL_STAGES.includes(name);

    const stageResult = await pool.query(
      `INSERT INTO stages (name, position, is_terminal, job_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [name, position, isTerminal, jobId],
    );

    stageIds[name] = stageResult.rows[0].id;
  }

  for (const fromName in legalTransitions) {
    const toNames = legalTransitions[fromName];
    for (const toName of toNames) {
      await pool.query(
        `INSERT INTO transitions (from_stage_id, to_stage_id) VALUES ($1, $2)`,
        [stageIds[fromName], stageIds[toName]],
      );
    }
  }
}

seed();
