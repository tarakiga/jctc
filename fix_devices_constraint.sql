-- Drop NOT NULL constraint from devices.seizure_id
ALTER TABLE devices ALTER COLUMN seizure_id DROP NOT NULL;
