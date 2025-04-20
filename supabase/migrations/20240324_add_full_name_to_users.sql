-- Add full_name column to users table
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS full_name text;

-- Create a trigger to copy email to full_name for new users if full_name is null
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  UPDATE auth.users
  SET full_name = NEW.email
  WHERE id = NEW.id AND (full_name IS NULL OR full_name = '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$; 