CREATE TABLE IF NOT EXISTS candidates (
    id SERIAL PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    title text NOT NULL
);

CREATE TABLE IF NOT EXISTS stages  (
    id SERIAL PRIMARY KEY,
    name text NOT NULL,
    position int NOT NULL,
    is_terminal boolean DEFAULT FALSE,
    job_id int NOT NULL REFERENCES jobs(id),
    UNIQUE (job_id, name),
    UNIQUE (job_id, position)
);

CREATE TABLE IF NOT EXISTS transitions (
    id SERIAL PRIMARY KEY,
    from_stage_id int REFERENCES stages(id) NOT NULL,
    to_stage_id int REFERENCES stages(id) NOT NULL,
    UNIQUE (from_stage_id, to_stage_id)
);    

CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    job_id int NOT NULL REFERENCES jobs(id),
    candidate_id int NOT NULL REFERENCES candidates(id),
    stage_id int NOT NULL REFERENCES stages(id),
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (job_id, candidate_id)
);
