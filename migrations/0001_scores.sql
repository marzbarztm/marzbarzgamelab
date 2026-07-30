CREATE TABLE IF NOT EXISTS scores (
  game_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (game_id, player_id)
);

CREATE INDEX IF NOT EXISTS scores_leaderboard
ON scores (game_id, score DESC, updated_at ASC);
