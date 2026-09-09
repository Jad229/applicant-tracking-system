import { useEffect, useState } from "react";
import { DragDropProvider, useDraggable, useDroppable } from '@dnd-kit/react';
import {
  fetchBoard,
  fetchJobs,
  mergeCandidates,
  moveApplication,
} from "./api.js";
import "./App.css";

/**
 * Hiring board UI.
 *
 * Two things this page is meant to prove (the rest is layout):
 *
 * 1. Illegal moves bounce.
 *    The dropdown lists EVERY other stage, not just legal ones.
 *    The server decides. On 409 we do not move the card; we shake it
 *    and show the allowed stages from the response.
 *
 * 2. Merge hides a duplicate without deleting.
 *    We pick a winner (keep) and a loser (hide), then POST merge.
 *    After refetch, the loser is gone from the board because GET /board
 *    filters `merged_into_id IS NULL`. The candidate row is still in the DB.
 */

// "phone_screen" -> "Phone Screen" so column headers read like a real board
function formatStageName(name) {
  // Split on the underscore(_) then take that array of words and uppercase the first letter and add the remaining letters together
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// 409 body is [{ id, name }, ...]. Hired/rejected have no outgoing edges.
function formatAllowedStages(allowedStages) {
  if (!allowedStages || allowedStages.length === 0) {
    return "none (terminal stage)";
  }
  return allowedStages.map((stage) => formatStageName(stage.name)).join(", ");
}

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [jobId, setJobId] = useState("");
  const [board, setBoard] = useState(null); // { job, stages: [{ ..., applications }] }
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState(null); // { type: "error" | "success", message }
  const [bouncingId, setBouncingId] = useState(null); // application id to shake
  const [mergeMode, setMergeMode] = useState(false);
  const [winner, setWinner] = useState(null); // card we keep
  const [loser, setLoser] = useState(null); // card we hide
  const [busy, setBusy] = useState(false); // disable clicks while a request is in progress


  // On first load, get the job list and open the newest one (seed inserts a new job each run)
  useEffect(() => {
    fetchJobs()
      .then((rows) => {
        setJobs(rows);
        if (rows.length > 0) {
          setJobId(String(rows[0].id));
        } else {
          setLoadError("No jobs yet. Run seed.js in the api container.");
        }
      })
      .catch((error) => {
        setLoadError(error.message);
      });
  }, []);

  // Whenever the selected job changes, load that job's columns + cards
  useEffect(() => {
    if (!jobId) {
      return;
    }
    loadBoard(jobId);
  }, [jobId]);

  async function loadBoard(id) {
    try {
      const data = await fetchBoard(id);
      setBoard(data);
      setLoadError("");
    } catch (error) {
      setLoadError(error.message);
    }
  }

  function showToast(type, message) {
    setToast({ type, message });
  }

  // Wait for the API, then refetch. No optimistic move if we painted the
  // card in Offer first, a 409 would look like the UI allowed an illegal jump.
  async function handleMove(application, targetStageId) {
    if (!targetStageId || busy) {
      return;
    }

    setBusy(true);
    try {
      await moveApplication(application.id, targetStageId);
      await loadBoard(jobId);
      showToast(
        "success",
        `Moved ${application.name} to ${formatStageName(
          board.stages.find((stage) => String(stage.id) === String(targetStageId))
            ?.name || "new stage",
        )}.`,
      );
    } catch (error) {
      // Card never left its column. Shake + name the stages the server allows.
      const allowedStages = error.body?.allowedStages;
      setBouncingId(application.id);
      setTimeout(() => setBouncingId(null), 500);
      if (error.status === 409 || allowedStages) {
        showToast(
          "error",
          `Can't move ${application.name} there. Allowed: ${formatAllowedStages(
            allowedStages,
          )}.`,
        );
      } else {
        showToast("error", error.message);
      }
    } finally {
      setBusy(false);
    }
  }

  // Merge mode: first click = keep, second click = hide. Click again to unselect.
  function handleCardClick(application) {
    if (!mergeMode) {
      return;
    }

    if (winner && winner.candidate_id === application.candidate_id) {
      setWinner(null);
      return;
    }
    if (loser && loser.candidate_id === application.candidate_id) {
      setLoser(null);
      return;
    }
    if (!winner) {
      setWinner(application);
    } else {
      setLoser(application);
    }
  }

  // POST /candidates/:winnerId/merge with { loserId }.
  // The API sets merged_into_id on the loser. It never DELETE's the row.
  async function handleMerge() {
    if (!winner || !loser || busy) {
      return;
    }

    setBusy(true);
    try {
      await mergeCandidates(winner.candidate_id, loser.candidate_id);
      await loadBoard(jobId);
      showToast(
        "success",
        `Merged ${loser.name} (${loser.email}) into ${winner.name} (${winner.email}). Duplicate is hidden, not deleted.`,
      );
      setWinner(null);
      setLoser(null);
      setMergeMode(false);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setBusy(false);
    }
  }

  function toggleMergeMode() {
    setMergeMode((on) => !on);
    setWinner(null);
    setLoser(null);
  }

  if (loadError && !board) {
    return (
      <main className="page">
        <p className="banner error">
          {loadError}. Is the API running on port 3000?
        </p>
      </main>
    );
  }

  if (!board) {
    return (
      <main className="page">
        <p>Loading board…</p>
      </main>
    );
  }

  // @dnd-kit/react (not the old @dnd-kit/core):
  //   source = the card you picked up  (we set id to "app-12")
  //   target = the column you dropped on (we set id to "stage-8")
  // Escape or a drop outside a column → canceled / no target → do nothing.
  function handleDragEnd(event) {
    if (event.canceled) return;

    const { source, target } = event.operation;
    if (!source || !target) return;

    const applicationId = Number(String(source.id).replace(/^app-/, ""));
    const targetId = String(target.id);
    if (!targetId.startsWith("stage-")) return;

    const targetStageId = Number(targetId.replace(/^stage-/, ""));

    const application = board.stages
      .flatMap((column) => column.applications)
      .find((app) => app.id === applicationId);

    if (!application) return;
    if (application.stage_id === targetStageId) return;

    handleMove(application, targetStageId);
  }

  function StageColumn({ stage }) {
    const { ref } = useDroppable({
      id: `stage-${stage.id}`,
    });

    return (
      <article ref={ref} key={stage.id} className="column">
        <header className="column-header">
          <h2>{formatStageName(stage.name)}</h2>
          <span>{stage.applications.length}</span>
        </header>
        {stage.applications.map((application) => (
          <CandidateCard
            key={application.id}
            application={application}
            stages={board.stages}
            mergeMode={mergeMode}
            isWinner={
              winner && winner.candidate_id === application.candidate_id
            }
            isLoser={loser && loser.candidate_id === application.candidate_id}
            bouncing={bouncingId === application.id}
            busy={busy}
            onClick={() => handleCardClick(application)}
            onMove={(targetStageId) =>
              handleMove(application, targetStageId)
            }
          />
        ))}

      </article>
    )
  }
  return (
    <main className="page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Applicant tracking</p>
          <h1>{board.job.title}</h1>
        </div>
        <label className="job-picker">
          Job
          <select
            value={jobId}
            onChange={(event) => setJobId(event.target.value)}
          >
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} #{job.id}
              </option>
            ))}
          </select>
        </label>
      </header>

      {toast && (
        <p className={`banner ${toast.type}`}>
          {toast.message}
        </p>
      )}

      <section className="toolbar">
        <button type="button" onClick={toggleMergeMode}>
          {mergeMode ? "Cancel merge" : "Merge duplicates"}
        </button>
        {mergeMode && (
          <>
            <p className="hint">
              Click the card to <strong>keep</strong>, then the duplicate to{" "}
              <strong>hide</strong>. Merge never deletes.
            </p>
            <button
              type="button"
              className="primary"
              disabled={!winner || !loser || busy}
              onClick={handleMerge}
            >
              Merge into {winner ? winner.name : "…"}
            </button>
          </>
        )}
      </section>

      {/* Columns are whatever stages the API returned for this job */}
      <DragDropProvider
        onDragEnd={handleDragEnd}
      >
        <section className="board">
          {board.stages.map((stage) => (
            <StageColumn key={stage.id} stage={stage} />
          ))}
        </section>
      </DragDropProvider>
    </main>
  );
}


function CandidateCard({
  application,
  stages,
  mergeMode,
  isWinner,
  isLoser,
  bouncing,
  busy,
  onClick,
  onMove,
}) {
  const [targetStageId, setTargetStageId] = useState("");
  const { ref } = useDraggable({
    id: `app-${application.id}`,
    disabled: mergeMode,
  });
  // Include illegal targets on purpose so I can demo the 409 bounce
  const otherStages = stages.filter((stage) => stage.id !== application.stage_id);

  let cardClass = "card";
  if (bouncing) {
    cardClass += " bounce";
  }
  if (isWinner) {
    cardClass += " winner";
  }
  if (isLoser) {
    cardClass += " loser";
  }
  if (mergeMode) {
    cardClass += " selectable";
  }

  return (
    <div ref={ref} className={cardClass} onClick={onClick}>
      <p className="name">{application.name}</p>
      <p className="email">{application.email}</p>
      {isWinner && <p className="tag keep">Keep</p>}
      {isLoser && <p className="tag hide">Hide</p>}
      {/* Hide the move dropdown while picking a merge pair */}
      {!mergeMode && (
        <div
          className="move-form"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <select
            value={targetStageId}
            disabled={busy}
            onChange={(event) => setTargetStageId(event.target.value)}
          >
            <option value="">Move to…</option>
            {otherStages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {formatStageName(stage.name)}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || !targetStageId}
            onClick={() => onMove(targetStageId)}
          >
            Move
          </button>
        </div>
      )}
    </div>
  );
}
