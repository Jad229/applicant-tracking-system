
CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    title text NOT NULL
);

CREATE TABLE IF NOT EXISTS stages  (
    id SERIAL PRIMARY KEY,
    name text NOT NULL,
    position int NOT NULL,
    is_terminal boolean DEFAULT FALSE,
    job_id int NOT NULL REFERENCES jobs(id)
);

CREATE TABLE IF NOT EXISTS transitions (
    id SERIAL PRIMARY KEY,
    from_stage_id int REFERENCES stages(id) NOT NULL,
    to_stage_id int REFERENCES stages(id) NOT NULL,
    UNIQUE (from_stage_id, to_stage_id)
);
