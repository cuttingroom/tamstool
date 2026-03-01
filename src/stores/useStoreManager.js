import { create } from "zustand";
import { persist } from "zustand/middleware";

const useStoreManager = create(
  persist(
    (set, get) => ({
      stores: [],
      activeStoreId: null,

      addStore: (store) => {
        const id = crypto.randomUUID();
        const newStore = { id, ...store };
        const stores = [...get().stores, newStore];
        const activeStoreId = get().activeStoreId ?? id;
        set({ stores, activeStoreId });
        return newStore;
      },

      removeStore: (id) => {
        const stores = get().stores.filter((s) => s.id !== id);
        const activeStoreId =
          get().activeStoreId === id
            ? (stores[0]?.id ?? null)
            : get().activeStoreId;
        set({ stores, activeStoreId });
      },

      updateStore: (id, updates) => {
        const stores = get().stores.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        );
        set({ stores });
      },

      setActiveStore: (id) => set({ activeStoreId: id }),

      getActiveStore: () => {
        const { stores, activeStoreId } = get();
        return stores.find((s) => s.id === activeStoreId) ?? null;
      },
    }),
    {
      name: "tamstool-stores",
    }
  )
);

export default useStoreManager;
