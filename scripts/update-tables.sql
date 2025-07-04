-- Add email column to attendance_sessions table
ALTER TABLE attendance_sessions 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_email ON attendance_sessions(email);

-- Update the existing records to have a default email structure
-- (This is just for existing data - new records will require email)
UPDATE attendance_sessions 
SET email = CONCAT('user_', id, '@temp.local') 
WHERE email IS NULL;
