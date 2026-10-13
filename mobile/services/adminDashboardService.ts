import type { Facility, Lobby } from '../types';

export type AdminLobby = Lobby & { host_name: string };
export type AdminPlayer = { id: string; name: string; email: string; avatar_url: string | null; joined_at: string; hosted: number; joined: number };
export type AdminActivity = { id: string; actor_email: string; action: string; target_id: string; details: Record<string, unknown>; created_at: string };
export type AdminSnapshot = {
  lobbies: AdminLobby[]; users: AdminPlayer[]; facilities: Facility[]; audit: AdminActivity[];
  totals: { lobbies: number; active: number; users: number; facilities: number; memberships: number };
  daily: { day: string; count: number }[]; limited: boolean;
};
export type FacilityInput = Omit<Facility, 'id'> & { id: string | null };
type RpcClient = { rpc: (name: string, parameters?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }> };

export function createAdminDashboardService(client: RpcClient) {
  async function request(name: string, parameters?: Record<string, unknown>) {
    const { data, error } = await client.rpc(name, parameters);
    if (error) throw new Error(error.message);
    return data;
  }
  return {
    async snapshot(): Promise<AdminSnapshot> {
      if (await request('squadup_admin_access') !== true) throw new Error('Administrator access required.');
      const data = await request('squadup_admin_snapshot');
      const snapshot = data as Partial<AdminSnapshot> | null;
      if (!snapshot || ![snapshot.lobbies, snapshot.users, snapshot.facilities, snapshot.audit, snapshot.daily].every(Array.isArray) ||
        !snapshot.totals || !['lobbies','active','users','facilities','memberships'].every(key =>
          typeof snapshot.totals?.[key as keyof AdminSnapshot['totals']] === 'number')) {
        throw new Error('The dashboard did not receive valid data. Try refreshing.');
      }
      return snapshot as AdminSnapshot;
    },
    async moderateLobby(id: string, status: 'ended' | 'cancelled') {
      await request('squadup_admin_moderate_lobby', { lobby_id: id, next_status: status });
    },
    async saveFacility(input: FacilityInput) {
      const name = input.name.trim(); const kind = input.facility_type.trim(); const town = input.township.trim();
      if (!name || name.length > 120 || !kind || kind.length > 80 || !town || town.length > 120 ||
        !Number.isFinite(input.latitude) || Math.abs(input.latitude) > 90 ||
        !Number.isFinite(input.longitude) || Math.abs(input.longitude) > 180) {
        throw new Error('Enter a name, type, township and valid latitude / longitude.');
      }
      await request('squadup_admin_save_facility', {
        facility_id: input.id, facility_name: name, kind, town, lat: input.latitude, lng: input.longitude
      });
    }
  };
}
