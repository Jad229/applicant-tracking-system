import express from "express";
import cors from "cors";
import move from "./move.js";

const app = express();

app.use(cors());
app.use(express.json());

app.post("/applications/:id/move", async (req, res) => {
  const { id } = req.params;
  const { targetStageName } = req.body;

  // Validate the target stage name
  if (!targetStageName) {
    return res.status(400).json({ error: "Target stage name is required" });
  }

  // Move.js throws an error if the target stage is invalid
  // We catch the error and return a 409 status code
  try {
    // Move the application to the target stage
    const updatedApplication = await move(id, targetStageName);
    res.status(200).json(updatedApplication);
  } catch (error) {
    if (error.message === "Invalid target stage") {
      return res.status(409).json({
        error: "Invalid target stage: illegal application stage transition.",
      });
    }
    if (error.message === "Application not found") {
      return res.status(404).json({ error: "Application not found" });
    }
    return res.status(500).json({ error: "Something went wrong" });
  }
});

export default app;
