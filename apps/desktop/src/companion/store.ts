import type { CompanionState, PetInteractionType } from "@desktop-companion/shared-types";
import { create } from "zustand";

import { getCompanionState, resetCompanionState, sendInteraction } from "../backend";

interface CompanionStore {
  state: CompanionState | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  interact: (type: PetInteractionType, payload?: Record<string, unknown>) => Promise<boolean>;
  reset: () => Promise<void>;
}

export const useCompanionStore = create<CompanionStore>((set) => ({
  state: null,
  loading: false,
  error: null,
  refresh: async () => {
    set({ loading: true, error: null });
    try {
      set({ state: await getCompanionState(), loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Local service unavailable", loading: false });
    }
  },
  interact: async (type, payload = {}) => {
    set({ error: null });
    try {
      const response = await sendInteraction(type, payload);
      set({ state: response.state });
      return response.applied;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Interaction failed" });
      return false;
    }
  },
  reset: async () => {
    set({ error: null });
    try {
      set({ state: await resetCompanionState() });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Reset failed" });
    }
  }
}));
