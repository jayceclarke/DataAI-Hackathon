-- Allow courses to be shared publicly so others can discover and add them.
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN courses.is_public IS 'When true, course appears in public discovery and can be copied by other users.';
