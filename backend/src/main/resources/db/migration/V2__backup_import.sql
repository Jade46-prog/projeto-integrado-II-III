CREATE TABLE backup_import (
    backup_hash char(64) PRIMARY KEY,
    imported_by uuid NOT NULL REFERENCES app_user(id),
    imported_at timestamptz NOT NULL DEFAULT now()
);
