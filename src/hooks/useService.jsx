import useSWR from "swr";
import { useApi } from "@/hooks/useApi";
import { getCapabilities } from "@/utils/capabilities";

// GET /service is small and effectively static for a given store, so it is
// fetched once and cached rather than polled like the resource listings.
export const useService = () => {
  const api = useApi();
  const { data, error, isLoading } = useSWR(
    api.endpoint ? [api.endpoint, "/service"] : null,
    ([, path]) => api.get(path),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      // This one request gates every 8.2 feature, so a transient failure must
      // not pin the session to the 8.0 baseline until the user reloads.
      shouldRetryOnError: true,
    }
  );

  return { service: data?.data, isLoading, error };
};

/**
 * Feature flags for the active store, derived from its advertised api_version.
 *
 * `resolved` tells callers whether the version is known yet. Listing hooks wait
 * for it before building a query so that a store which turns out to be 8.2 is
 * not first queried with 8.0 parameters and then immediately queried again.
 * A store that does not serve /service resolves to the 8.0 baseline.
 *
 * A /service that errors resolves to that same baseline so the tool stays
 * usable, but `detectionFailed` distinguishes it from a store that genuinely
 * advertises an older version. Callers that state the store's version must
 * check it — "we could not ask" is not the same claim as "the store said 8.0".
 */
export const useCapabilities = () => {
  const { service, isLoading, error } = useService();
  const capabilities = getCapabilities(service?.api_version);

  return {
    ...capabilities,
    service,
    error,
    detectionFailed: Boolean(error),
    resolved: !isLoading,
  };
};

/**
 * Storage Backends and, from 8.2, the tags attached to them. The tag names and
 * values are surfaced so views can offer the storage_backend_tag filters
 * without asking the user to type identifiers from memory.
 */
export const useStorageBackends = () => {
  const api = useApi();
  const { storageBackendTags: supported, resolved } = useCapabilities();

  const { data, error, isLoading } = useSWR(
    api.endpoint ? [api.endpoint, "/service/storage-backends"] : null,
    ([, path]) => api.get(path),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const backends = Array.isArray(data?.data) ? data.data : [];

  // Union of tag names to the values seen across all backends.
  const tagValues = new Map();
  backends.forEach((backend) => {
    Object.entries(backend.tags ?? {}).forEach(([name, value]) => {
      const values = tagValues.get(name) ?? new Set();
      (Array.isArray(value) ? value : [value]).forEach((entry) =>
        values.add(String(entry))
      );
      tagValues.set(name, values);
    });
  });

  return {
    backends,
    tags: [...tagValues.entries()].map(([name, values]) => ({
      name,
      values: [...values],
    })),
    supported: supported && resolved,
    isLoading,
    error,
  };
};

/** Flow Profiles, added in 8.2 at /service/profiles. */
export const useProfiles = () => {
  const api = useApi();
  const { profiles: supported, resolved, detectionFailed } = useCapabilities();

  const { data, error, isLoading } = useSWR(
    api.endpoint && resolved && supported
      ? [api.endpoint, "/service/profiles"]
      : null,
    ([, path]) => api.get(path),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  return {
    profiles: Array.isArray(data?.data) ? data.data : undefined,
    supported,
    resolved,
    detectionFailed,
    isLoading,
    error,
  };
};

export const useProfile = (profileId) => {
  const api = useApi();
  const { profiles: supported, resolved, detectionFailed } = useCapabilities();

  const { data, error, isLoading } = useSWR(
    api.endpoint && resolved && supported && profileId
      ? [api.endpoint, "/service/profiles", profileId]
      : null,
    ([, path, id]) => api.get(`${path}/${id}`),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  return { profile: data?.data, supported, resolved, detectionFailed, isLoading, error };
};
