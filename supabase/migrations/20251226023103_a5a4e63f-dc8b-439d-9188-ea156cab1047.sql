-- Update handle_new_user function to extract birthday from different OAuth providers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_birthday date := NULL;
  birthday_text text;
BEGIN
  -- Try to extract birthday from different OAuth provider formats
  
  -- Google format: birthday can be in 'birthday' field as object or string
  IF new.raw_user_meta_data->>'birthday' IS NOT NULL AND new.raw_user_meta_data->>'birthday' != '' THEN
    birthday_text := new.raw_user_meta_data->>'birthday';
    BEGIN
      user_birthday := birthday_text::date;
    EXCEPTION WHEN OTHERS THEN
      user_birthday := NULL;
    END;
  END IF;
  
  -- Kakao format: birthday is often in 'kakao_account' -> 'birthday' (MMDD format) 
  -- and 'kakao_account' -> 'birthyear' (YYYY format)
  IF user_birthday IS NULL THEN
    DECLARE
      kakao_birthday text;
      kakao_birthyear text;
    BEGIN
      kakao_birthday := new.raw_user_meta_data->'kakao_account'->>'birthday';
      kakao_birthyear := new.raw_user_meta_data->'kakao_account'->>'birthyear';
      
      IF kakao_birthday IS NOT NULL AND kakao_birthyear IS NOT NULL THEN
        -- Combine YYYY + MMDD format
        user_birthday := (kakao_birthyear || '-' || SUBSTRING(kakao_birthday, 1, 2) || '-' || SUBSTRING(kakao_birthday, 3, 2))::date;
      ELSIF kakao_birthday IS NOT NULL THEN
        -- Only MMDD available, use current year as placeholder
        user_birthday := (EXTRACT(YEAR FROM CURRENT_DATE)::text || '-' || SUBSTRING(kakao_birthday, 1, 2) || '-' || SUBSTRING(kakao_birthday, 3, 2))::date;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      user_birthday := NULL;
    END;
  END IF;
  
  -- Also try direct birthyear/birthday fields at root level (some providers)
  IF user_birthday IS NULL AND new.raw_user_meta_data->>'birthyear' IS NOT NULL THEN
    DECLARE
      root_birthday text;
      root_birthyear text;
    BEGIN
      root_birthday := new.raw_user_meta_data->>'birthday';
      root_birthyear := new.raw_user_meta_data->>'birthyear';
      
      IF root_birthday IS NOT NULL AND LENGTH(root_birthday) = 4 THEN
        -- MMDD format with birthyear
        user_birthday := (root_birthyear || '-' || SUBSTRING(root_birthday, 1, 2) || '-' || SUBSTRING(root_birthday, 3, 2))::date;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      user_birthday := NULL;
    END;
  END IF;

  INSERT INTO public.profiles (id, name, email, birthday)
  VALUES (
    new.id, 
    COALESCE(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->'kakao_account'->'profile'->>'nickname'
    ),
    new.email,
    user_birthday
  );
  RETURN new;
END;
$$;