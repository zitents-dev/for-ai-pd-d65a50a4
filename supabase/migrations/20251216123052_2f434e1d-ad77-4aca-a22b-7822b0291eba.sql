-- Update the handle_new_user function to include birthday from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, birthday)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'name', 
    new.email,
    CASE 
      WHEN new.raw_user_meta_data->>'birthday' IS NOT NULL 
        AND new.raw_user_meta_data->>'birthday' != '' 
      THEN (new.raw_user_meta_data->>'birthday')::date 
      ELSE NULL 
    END
  );
  RETURN new;
END;
$$;