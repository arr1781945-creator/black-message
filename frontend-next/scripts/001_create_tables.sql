-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  status text default 'online',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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

-- 3. CHANNEL MEMBERS TABLE
create table if not exists public.channel_members (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.channels(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member',
  joined_at timestamptz default now(),
  unique(channel_id, user_id)
);

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
