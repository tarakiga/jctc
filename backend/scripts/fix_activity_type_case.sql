-- Fix team_activities activity_type enum case mismatch
-- Updates lowercase values to uppercase to match the updated Enum

UPDATE team_activities SET activity_type = 'MEETING' WHERE activity_type = 'meeting';
UPDATE team_activities SET activity_type = 'TRAVEL' WHERE activity_type = 'travel';
UPDATE team_activities SET activity_type = 'TRAINING' WHERE activity_type = 'training';
UPDATE team_activities SET activity_type = 'LEAVE' WHERE activity_type = 'leave';
