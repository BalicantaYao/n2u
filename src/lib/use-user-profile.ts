"use client";

import { useEffect, useState } from "react";

export interface UserProfile {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  commissionDiscount: number;
}

let cachedProfile: UserProfile | null = null;
let inflight: Promise<UserProfile | null> | null = null;
const listeners = new Set<(p: UserProfile | null) => void>();

function notify(p: UserProfile | null) {
  for (const fn of listeners) fn(p);
}

async function fetchProfile(): Promise<UserProfile | null> {
  if (cachedProfile) return cachedProfile;
  if (inflight) return inflight;
  inflight = fetch("/api/user/profile")
    .then((res) => (res.ok ? (res.json() as Promise<UserProfile>) : null))
    .then((data) => {
      cachedProfile = data;
      notify(data);
      return data;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function setCachedProfile(p: UserProfile | null) {
  cachedProfile = p;
  notify(p);
}

/** 讀取目前使用者 profile（含 commissionDiscount），共用單一快取避免重複請求 */
export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfile);

  useEffect(() => {
    const handler = (p: UserProfile | null) => setProfile(p);
    listeners.add(handler);
    if (!cachedProfile) {
      void fetchProfile();
    }
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return profile;
}
