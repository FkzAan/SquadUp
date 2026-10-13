import { decode } from 'base64-arraybuffer';
import { supabase } from './supabaseClient';
import type { Profile } from '../types';

async function currentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function fetchMyProfile(): Promise<Profile | null> {
  const user = await currentUser();
  if (!user) return null;

  const { data } = await supabase
    .from('users')
    .select('name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? '',
    name: data?.name ?? (user.user_metadata?.name as string | undefined) ?? 'Pemain',
    avatar_url: data?.avatar_url ?? null,
  };
}

export async function updateName(name: string): Promise<string | null> {
  const user = await currentUser();
  if (!user) return 'Sila log masuk semula.';

  const { data, error } = await supabase
    .from('users')
    .update({ name })
    .eq('id', user.id)
    .select('id');

  if (error) return error.message;
  if (!data || data.length === 0) return 'Profil tak ditemui. Cuba log keluar dan masuk semula.';

  await supabase.auth.updateUser({ data: { name } });
  return null;
}

// Gambar disimpan di avatars/<user-id>/avatar.jpg dan ditimpa setiap kali ditukar
export async function uploadAvatar(base64: string, mimeType: string): Promise<string | null> {
  const user = await currentUser();
  if (!user) return 'Sila log masuk semula.';

  const path = `${user.id}/avatar.jpg`;
  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, decode(base64), { contentType: mimeType, upsert: true });
  if (upErr) return upErr.message;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?t=${Date.now()}`; // elak gambar lama tersangkut dalam cache

  const { error } = await supabase.from('users').update({ avatar_url: url }).eq('id', user.id);
  return error?.message ?? null;
}

export async function removeAvatar(): Promise<string | null> {
  const user = await currentUser();
  if (!user) return 'Sila log masuk semula.';

  await supabase.storage.from('avatars').remove([`${user.id}/avatar.jpg`]);
  const { error } = await supabase.from('users').update({ avatar_url: null }).eq('id', user.id);
  return error?.message ?? null;
}

// Sahkan password semasa dahulu, kemudian tukar kepada yang baharu
export async function changePassword(current: string, next: string): Promise<string | null> {
  const user = await currentUser();
  if (!user || !user.email) return 'Sila log masuk semula.';

  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (authErr) return 'Password semasa tidak betul.';

  const { error } = await supabase.auth.updateUser({ password: next });
  return error?.message ?? null;
}