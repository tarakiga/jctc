-- Create admin user for JCTC production
-- Password: admin123 (bcrypt hash)
INSERT INTO users (id, email, hashed_password, full_name, role, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'admin@jctc.ng',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G5SFMM6jMWrJWC',
    'Admin User',
    'ADMIN',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET role = 'ADMIN';
