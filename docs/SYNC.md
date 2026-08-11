# Optional Supabase Sync

Crisp remains fully usable offline. Sync is enabled only when a user signs in and the public Supabase configuration is supplied. `SARVAM_API_KEY` is unrelated and must remain server-only.

## Configuration

Create a Supabase project, then set `EXPO_PUBLIC_SUPABASE_URL` to its Project URL and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to its publishable (or legacy anon) key from **Project Settings → API**. These are publishable client values; protect task data with Row Level Security. Never put the Supabase `service_role` key in `.env` for the app or in any client bundle.

In **Authentication → Providers**, enable Google and enter the Google OAuth client ID and client secret there (they stay in Supabase). In **Authentication → URL Configuration**, register `crisp://auth/callback` and the exact deployed web callback/origin. The app’s `signInWithGoogle()` helper uses Supabase OAuth and Expo’s auth browser. Supabase is optional: task capture works locally first and does not need an account.

## Database migration

Run this in the Supabase SQL editor:

```sql
create table public.tasks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  due_date text,
  due_time text,
  status text not null check (status in ('open', 'completed')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  source_session_id text,
  bucket text not null check (bucket in ('today', 'later'))
);

alter table public.tasks enable row level security;
create policy "Users manage their own tasks" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.upsert_tasks(task_rows jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.tasks (
    id, user_id, title, due_date, due_time, status,
    created_at, updated_at, source_session_id, bucket
  )
  select
    incoming.id, auth.uid(), incoming.title, incoming.due_date,
    incoming.due_time, incoming.status, incoming.created_at,
    incoming.updated_at, incoming.source_session_id, incoming.bucket
  from jsonb_to_recordset(task_rows) as incoming(
    id text, user_id uuid, title text, due_date text, due_time text,
    status text, created_at timestamptz, updated_at timestamptz,
    source_session_id text, bucket text
  )
  on conflict (id) do update set
    title = excluded.title,
    due_date = excluded.due_date,
    due_time = excluded.due_time,
    status = excluded.status,
    updated_at = excluded.updated_at,
    source_session_id = excluded.source_session_id,
    bucket = excluded.bucket
  where excluded.updated_at > public.tasks.updated_at
    and public.tasks.user_id = auth.uid();
end;
$$;

grant execute on function public.upsert_tasks(jsonb) to authenticated;
```

The client submits only the signed-in user’s local tasks through the conditional RPC, then downloads that user’s rows. The database accepts a conflicting row only when its `updated_at` is newer; the client repeats the same latest-value merge after download. Local capture is always persisted first. Without configuration or a session, sync is disabled and task capture never waits for it.
