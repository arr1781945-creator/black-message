-- =============================================
-- SLACK-LIKE CHAT APP DATABASE SCHEMA
-- =============================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  status text default 'online' check (status in ('online', 'away', 'busy', 'offline')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles 
  for select using (true);

create policy "profiles_insert_own" on public.profiles 
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles 
  for update using (auth.uid() = id);

-- 2. CHANNELS TABLE
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_private boolean default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.channels enable row level security;

create policy "channels_select_public" on public.channels 
  for select using (is_private = false);

create policy "channels_insert_authenticated" on public.channels 
  for insert with check (auth.uid() = created_by);

create policy "channels_update_creator" on public.channels 
  for update using (auth.uid() = created_by);

-- 3. CHANNEL MEMBERS TABLE
create table if not exists public.channel_members (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.channels(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now(),
  unique(channel_id, user_id)
);

alter table public.channel_members enable row level security;

create policy "channel_members_select_own" on public.channel_members 
  for select using (auth.uid() = user_id);

create policy "channel_members_insert_own" on public.channel_members 
  for insert with check (auth.uid() = user_id);

create policy "channel_members_delete_own" on public.channel_members 
  for delete using (auth.uid() = user_id);

-- 4. MESSAGES TABLE
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.channels(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  content text not null,
  is_edited boolean default false,
  parent_id uuid references public.messages(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "messages_select_channel_member" on public.messages 
  for select using (
    exists (
      select 1 from public.channel_members 
      where channel_id = messages.channel_id 
      and user_id = auth.uid()
    )
    or exists (
      select 1 from public.channels 
      where id = messages.channel_id 
      and is_private = false
    )
  );

create policy "messages_insert_authenticated" on public.messages 
  for insert with check (auth.uid() = user_id);

create policy "messages_update_own" on public.messages 
  for update using (auth.uid() = user_id);

create policy "messages_delete_own" on public.messages 
  for delete using (auth.uid() = user_id);

-- 5. DIRECT MESSAGES TABLE
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete set null,
  receiver_id uuid references public.profiles(id) on delete set null,
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.direct_messages enable row level security;

create policy "dm_select_participants" on public.direct_messages 
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "dm_insert_sender" on public.direct_messages 
  for insert with check (auth.uid() = sender_id);

create policy "dm_update_receiver" on public.direct_messages 
  for update using (auth.uid() = receiver_id);

-- 6. AUTO-CREATE PROFILE TRIGGER
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
