create table if not exists public.squad_kicks (
  squad_id  uuid not null references public.squad_lobbies(id) on delete cascade,
  user_id   uuid not null references public.users(id) on delete cascade,
  kicked_by uuid not null references public.users(id) on delete cascade,
  kicked_at timestamptz not null default now(),
  primary key (squad_id, user_id)
);

-- RLS hidup tanpa polisi: klien tak boleh baca/tulis terus
alter table public.squad_kicks enable row level security;

create or replace function public.kick_squad_member(p_squad_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.squad_lobbies%rowtype;
begin
  select * into l from public.squad_lobbies where id = p_squad_id for update;

  if l.id is null then
    raise exception 'Squad tidak wujud';
  end if;

  if l.host_id is distinct from auth.uid() then
    raise exception 'Hanya host boleh mengeluarkan pemain';
  end if;

  if p_user_id = l.host_id then
    raise exception 'Host tidak boleh mengeluarkan diri sendiri';
  end if;

  if l.status in ('ended', 'cancelled') or l.expires_at <= now() then
    raise exception 'Squad ini sudah tamat';
  end if;

  delete from public.squad_members
  where squad_id = p_squad_id and user_id = p_user_id;

  if not found then
    raise exception 'Pemain ini bukan ahli squad';
  end if;

  insert into public.squad_kicks (squad_id, user_id, kicked_by)
  values (p_squad_id, p_user_id, l.host_id)
  on conflict (squad_id, user_id) do nothing;
end;
$$;

revoke all on function public.kick_squad_member(uuid, uuid) from public, anon;
grant execute on function public.kick_squad_member(uuid, uuid) to authenticated;

create or replace function public.check_lobby_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.squad_lobbies%rowtype;
begin
  select * into l from public.squad_lobbies where id = new.squad_id for update;

  if l.id is null then
    raise exception 'Lobby tidak wujud';
  end if;

  if exists (
    select 1 from public.squad_kicks k
    where k.squad_id = new.squad_id and k.user_id = new.user_id
  ) then
    raise exception 'Kamu telah dikeluarkan dari squad ini oleh host';
  end if;

  if l.status <> 'open' then
    raise exception 'Lobby sudah penuh atau tamat';
  end if;

  if now() >= l.ends_at then
    raise exception 'Aktiviti ini sudah tamat';
  end if;

  if l.current_players >= l.max_players then
    raise exception 'Lobby sudah penuh';
  end if;

  return new;
end;
$$;