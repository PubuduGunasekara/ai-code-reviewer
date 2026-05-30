ALTER TABLE users
  ALTER COLUMN github_id TYPE BIGINT USING github_id::bigint;

ALTER TABLE repositories
  ALTER COLUMN github_repo_id TYPE BIGINT USING github_repo_id::bigint;

ALTER TABLE repositories
  DROP CONSTRAINT IF EXISTS repositories_github_repo_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_repositories_user_github_repo
  ON repositories(user_id, github_repo_id);
