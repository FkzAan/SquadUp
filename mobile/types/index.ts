export type SkillLevel = 'Friendly' | 'Competitive';

export type Facility = {
    id: string;
    name: string;
    facility_type: string;
    township: string;
    latitude: number;
    longitude: number;
};

export type Lobby = {
    id: string;
    host_id: string;
    facility_id: string | null;
    activity_type: string;
    location_name: string;
    latitude: number | null;
    longitude: number | null;
    max_players: number;
    current_players: number;
    skill_level: SkillLevel;
    status: 'open' | 'full' | 'ended' | 'cancelled';
    starts_at: string;
    ends_at: string;
    expires_at: string;
    created_at: string;
};

export type JoinedLobby = Lobby & { joined_at: string };

export type LobbyMember = {
    user_id: string;
    name: string;
    avatar_url: string | null;
    joined_at: string;
    is_host: boolean;
};

export type NewLobbyInput = {
    activity_type: string;
    location_name: string;
    facility: Facility | null;
    latitude: number;
    longitude: number;
    max_players: number;
    starts_at: string;
    ends_at: string;
    skill_level: SkillLevel;
};

export type Profile = {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
};
export type ChatMessage = {
  id: string;
  squad_id: string;
  user_id: string;
  content: string;
  created_at: string;
  name: string;
  avatar_url: string | null;
};
