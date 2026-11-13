-- Staff sign in with an ID (username) instead of an email address.
alter table public.profiles add column if not exists username text;
update public.profiles set username = lower(split_part(email, '@', 1)) where username is null;
create unique index if not exists profiles_username_key on public.profiles (lower(username));
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format check (username is null or username ~ '^[a-z0-9._-]{3,30}$');
