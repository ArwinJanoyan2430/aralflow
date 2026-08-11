create table if not exists public.finished_exams (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null unique
    references public.study_materials(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  score integer not null check (score >= 0),
  total integer not null check (total > 0 and score <= total),
  answers jsonb not null default '[]'::jsonb,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists finished_exams_user_id_idx
  on public.finished_exams(user_id);

alter table public.finished_exams enable row level security;

create policy "Users can read their finished exams"
  on public.finished_exams
  for select
  using (auth.uid() = user_id);

create policy "Users can create their finished exams"
  on public.finished_exams
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.study_materials
      where study_materials.id = material_id
        and study_materials.user_id = auth.uid()
    )
  );

create policy "Users can update their finished exams"
  on public.finished_exams
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.study_materials
      where study_materials.id = material_id
        and study_materials.user_id = auth.uid()
    )
  );

create policy "Users can delete their finished exams"
  on public.finished_exams
  for delete
  using (auth.uid() = user_id);
