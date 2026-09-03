import express from "express";
import cors from "cors";
import move from "./move.js";
import { query } from "./db.js";

const app = express();

app.use(cors());
app.use(express.json());

app.post("/applications/:id/move", async (req, res) => {
  const { id } = req.params;
  const { targetStageId } = req.body;

  // Validate the target stage id
  if (!targetStageId) {
    return res.status(400).json({ error: "Target stage id is required" });
  }

  // Move.js throws an error if the target stage is invalid
  // We catch the error and return a 409 status code
  try {
    // Move the application to the target stage
    const updatedApplication = await move(id, targetStageId);
    res.status(200).json(updatedApplication);
  } catch (error) {
    if (error.message === "Invalid target stage") {
      return res.status(409).json({
        error: "Invalid target stage: illegal application stage transition.",
        allowedStages: error.allowedStages,
      });
    }
    if (error.message === "Application not found") {
      return res.status(404).json({ error: "Application not found" });
    }
    return res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/jobs/:jobId/board", async (req, res) => {
  // Grab jobId from query params
  const { jobId } = req.params;

  try {
    // query job from database
    const jobResult = await query(`SELECT id, title FROM jobs WHERE id = $1`, [
      jobId,
    ]);

    // throw not found if job doesn't exist
    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Two queries. SQL returns flat rows;
    // we nest applications under each stage here
    const stagesResult = await query(
      `SELECT * FROM stages WHERE job_id = $1 ORDER BY position`,
      [jobId],
    );
    const stages = stagesResult.rows;

    const appsResult = await query(
      `SELECT
        applications.id,
        applications.job_id,
        applications.candidate_id,
        applications.stage_id,
        applications.created_at,
        candidates.name,
        candidates.email
      FROM applications
      JOIN candidates ON applications.candidate_id = candidates.id
      WHERE applications.job_id = $1`,
      [jobId],
    );
    const applications = appsResult.rows;

    // Creating the board state object to be returned
    // Map over stage and filter the applications currently at that stage
    const board = stages.map((stage) => {
      const stageApplications = applications.filter(
        (app) => app.stage_id === stage.id,
      );
      // return the columns of that stage + the applications currently at that stage.
      return { ...stage, applications: stageApplications };
    });

    res.status(200).json({
      job: jobResult.rows[0],
      stages: board,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
});
export default app;
