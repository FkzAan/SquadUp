begin;

drop policy if exists messages_insert on public.squad_messages;
create policy messages_insert on public.squad_messages
for insert with check (
  sender_id = auth.uid()
  and is_squad_member(squad_id)
  and exists (
    select 1 from squad_lobbies l
    where l.id = squad_messages.squad_id
      and l.status in ('open', 'full')
      and l.ends_at + interval '2 hours' > now()
  )
);

drop policy if exists messages_read on public.squad_messages;
create policy messages_read on public.squad_messages
for select using (
  is_squad_member(squad_id)
  and exists (
    select 1 from squad_lobbies l
    where l.id = squad_messages.squad_id
      and l.status in ('open', 'full')
      and l.ends_at + interval '2 hours' > now()
  )
);

commit;