create table if not exists public.generated_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  material_id uuid not null references public.study_materials(id) on delete cascade,
  title text not null,
  style text not null check (style in ('reviewer', 'outline', 'beginner')),
  detail text not null check (detail in ('concise', 'balanced', 'detailed')),
  content jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists generated_notes_user_created_idx
  on public.generated_notes (user_id, created_at desc);

create index if not exists generated_notes_material_idx
  on public.generated_notes (material_id);

alter table public.generated_notes enable row level security;

create policy "Users can read their generated notes"
  on public.generated_notes
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete their generated notes"
  on public.generated_notes
  for delete
  to authenticated
  using (auth.uid() = user_id);
