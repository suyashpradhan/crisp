-- Crisp task sync is optional, but when public Supabase configuration exists
-- the app calls public.upsert_tasks(task_rows jsonb). Keep this function in a
-- tracked migration so a new project cannot have the table without its RPC.

create table if not exists public.tasks (
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

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tasks'
      and policyname = 'Users manage their own tasks'
  ) then
    create policy "Users manage their own tasks" on public.tasks
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end;
$$;

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

-- Make the new RPC signature visible to PostgREST without waiting for a cache
-- refresh, preventing PGRST202 immediately after this migration runs.
notify pgrst, 'reload schema';
