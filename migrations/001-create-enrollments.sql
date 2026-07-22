CREATE TABLE enrollments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  passport      TEXT    NOT NULL UNIQUE,
  name          TEXT    NOT NULL,
  phone         TEXT    NOT NULL,
  gym           TEXT    NOT NULL CHECK (gym IN ('sandy', 'vinewood', 'both')),
  enrolled_at   TEXT    NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1,
  registered_by TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);
