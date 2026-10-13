export type AccountRole = 'admin' | 'player';
type RoleResponse = { data: unknown; error: { message: string; code?: string } | null };

// Only the authenticated database result decides the destination. Email strings
// and client-editable user_metadata are deliberately not inputs to this function.
export async function resolveAccountRole(check: () => PromiseLike<RoleResponse>): Promise<AccountRole> {
  const { data, error } = await check();
  if (error) {
    if (error.code === 'PGRST202') throw new Error('Jalankan migration 006_admin_dashboard.sql di Supabase dahulu.');
    throw new Error(`Tak dapat semak akses akaun. ${error.message}`);
  }
  if (typeof data !== 'boolean') throw new Error('Jawapan akses akaun tidak sah. Cuba semula.');
  return data ? 'admin' : 'player';
}
