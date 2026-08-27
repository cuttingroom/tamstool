import { create } from "zustand";

const useAlertsStore = create((set) => ({
  alertItems: [],
  addAlertItem: (alertItem) =>
    set((state) => ({
      alertItems: [...state.alertItems, alertItem],
    })),
  delAlertItem: (id) =>
    set((state) => ({
      alertItems: state.alertItems.filter((item) => item.id !== id),
    })),
  addAlertItems: (alertItems) =>
    set((state) => ({
      alertItems: [...state.alertItems, ...alertItems],
    })),
}));

/**
 * Report the outcome of a batch of requests, one alert per item.
 *
 * Alerts are raised only once the requests have settled: announcing success
 * up front and then awaiting the promises told the user a delete had happened
 * when it might still fail, and a rejection skipped the rest of the handler,
 * leaving the button spinning with nothing on screen to explain it.
 *
 * Returns whether every request succeeded.
 */
export const useOutcomeAlerts = () => {
  const addAlertItems = useAlertsStore((state) => state.addAlertItems);
  const delAlertItem = useAlertsStore((state) => state.delAlertItem);

  return (results, items, { success, failure }) => {
    const batch = crypto.randomUUID();
    addAlertItems(
      results.map((result, n) => {
        const id = `${batch}-${n}`;
        const failed = result.status === "rejected";
        const reason =
          result.reason instanceof Error ? result.reason.message : "Unknown error";
        return {
          type: failed ? "error" : "success",
          dismissible: true,
          dismissLabel: "Dismiss message",
          content: failed ? failure(items[n], reason) : success(items[n]),
          id,
          onDismiss: () => delAlertItem(id),
        };
      })
    );
    return results.every((result) => result.status === "fulfilled");
  };
};

export default useAlertsStore;
