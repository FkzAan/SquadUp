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
    created_at: string;
    ends_at: string;
};

export type NewLobbyInput = {
    activity_type: string;
    location_name: string;
    facility: Facility | null;
    max_players: number;
    skill_level: SkillLevel;
};