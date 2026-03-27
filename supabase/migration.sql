-- ============================================
-- BuildMetrics — Database Migration
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. Users table (extends auth.users)
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  first_name text,
  last_name text,
  company_name text,
  address text,
  siret text,
  is_pro boolean default false,
  is_beta boolean default false,
  plan_count integer default 0,
  created_at timestamptz default now()
);


-- 2. Projects table
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  file_url text not null,
  status text default 'pending' check (status in ('pending', 'processing', 'done')),
  materials text[] default '{}',
  total_estimate numeric default 0,
  -- Client & project info
  client_name text,
  city text,
  project_name text,
  -- Pricing params
  tva numeric default 20,
  -- IA calibration
  scale_value text,
  scale_unit text default 'm',
  notes text,
  -- AI analysis results
  ai_total_surface integer,
  ai_linear_meters_walls integer,
  ai_doors_count integer,
  ai_windows_count integer,
  ai_confidence_score integer,
  created_at timestamptz default now()
);


-- 3. Enable Row Level Security
alter table public.users enable row level security;
alter table public.projects enable row level security;

-- 4. RLS Policies — Users can only access their own data
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

-- 5. Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Storage bucket (create manually in Supabase Dashboard or via API)
-- Bucket name: "plans"
-- Set as private or public depending on your needs.
-- Add RLS policy for storage:
-- insert into storage.buckets (id, name, public) values ('plans', 'plans', false);
