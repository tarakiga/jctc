"""
Simple SQL script to add SUPER_ADMIN and update admin user
Run this directly in psql or pgAdmin
"""

-- Add SUPER_ADMIN to the enum type
ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- Update admin user to SUPER_ADMIN
UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'admin@jctc.gov.ng';

-- Verify
SELECT email, role FROM users WHERE email = 'admin@jctc.gov.ng';
