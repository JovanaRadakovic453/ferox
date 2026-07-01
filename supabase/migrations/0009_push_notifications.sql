-- Add push notification fields to profiles
alter table public.profiles
  add column if not exists reminder_time text
    check (reminder_time is null or reminder_time ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  add column if not exists push_subscription jsonb;
