import type { AvatarLibraryResponse, AvatarRecord } from "@desktop-companion/shared-types";
import { create } from "zustand";

import { getAvatarLibrary, selectAvatar } from "../backend";

interface AvatarStore {
  library: AvatarLibraryResponse | null;
  selected: AvatarRecord | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  select: (avatarId: string) => Promise<boolean>;
}

function findSelected(library: AvatarLibraryResponse | null): AvatarRecord | null {
  if (!library) return null;
  return library.avatars.find((avatar) => avatar.id === library.selected_avatar_id) ?? library.avatars[0] ?? null;
}

export const useAvatarStore = create<AvatarStore>((set) => ({
  library: null,
  selected: null,
  loading: false,
  error: null,
  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const library = await getAvatarLibrary();
      set({ library, selected: findSelected(library), loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Avatar library unavailable",
        loading: false
      });
    }
  },
  select: async (avatarId) => {
    set({ error: null });
    try {
      const library = await selectAvatar({ avatar_id: avatarId });
      set({ library, selected: findSelected(library) });
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Avatar selection failed" });
      return false;
    }
  }
}));
