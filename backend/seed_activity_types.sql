-- Seed activity types for team calendar
INSERT INTO lookup_values (id, category, value, label, description, is_active, is_system, sort_order, color, icon, created_at)
VALUES 
    (gen_random_uuid(), 'activity_type', 'MEETING', 'Meeting', 'Team meetings and discussions', true, true, 1, '#3B82F6', 'calendar', NOW()),
    (gen_random_uuid(), 'activity_type', 'TRAVEL', 'Travel', 'Work-related travel', true, true, 2, '#8B5CF6', 'plane', NOW()),
    (gen_random_uuid(), 'activity_type', 'TRAINING', 'Training', 'Training sessions and workshops', true, true, 3, '#10B981', 'graduation-cap', NOW()),
    (gen_random_uuid(), 'activity_type', 'LEAVE', 'Leave', 'Time off and leave', true, true, 4, '#F97316', 'coffee', NOW())
ON CONFLICT (category, value) DO NOTHING;
