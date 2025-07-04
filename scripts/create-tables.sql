-- Create the attendance_sessions table
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  password_hash TEXT NOT NULL,
  names JSONB DEFAULT '[]'::jsonb,
  attendance_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on password_hash for faster lookups
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_password_hash ON attendance_sessions(password_hash);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_attendance_sessions_updated_at 
    BEFORE UPDATE ON attendance_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
