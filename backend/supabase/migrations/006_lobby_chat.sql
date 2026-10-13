do $$
begin
  alter publication supabase_realtime add table public.squad_messages;
exception when duplicate_object then
  null;
end $$;