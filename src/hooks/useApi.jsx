import { useCallback, useMemo, useRef } from "react";
import parseLinkHeader from "@/utils/parseLinkHeader";
import useStoreManager from "@/stores/useStoreManager";

// Cache keyed by tokenUrl+clientId so multiple renders share the same token
const tokenCache = new Map();

async function fetchClientCredentialsToken(tokenUrl, clientId, clientSecret) {
  const cacheKey = `${tokenUrl}|${clientId}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.accessToken;
  }

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Token request failed: ${response.status}`);
  }

  const data = await response.json();
  const accessToken = data.access_token;
  const expiresIn = data.expires_in ?? 3600;

  tokenCache.set(cacheKey, {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  });

  return accessToken;
}

export const useApi = () => {
  const activeStore = useStoreManager((s) => s.getActiveStore());
  const endpoint = activeStore?.endpoint?.replace(/\/+$/, "") ?? null;
  const authType = activeStore?.authType ?? "none";
  const token = activeStore?.token ?? null;
  const tokenUrl = activeStore?.tokenUrl ?? null;
  const clientId = activeStore?.clientId ?? null;
  const clientSecret = activeStore?.clientSecret ?? null;

  const getAuthHeader = useCallback(async () => {
    if (authType === "bearer" && token) {
      return `Bearer ${token}`;
    }
    if (authType === "client_credentials" && tokenUrl && clientId && clientSecret) {
      const accessToken = await fetchClientCredentialsToken(tokenUrl, clientId, clientSecret);
      return `Bearer ${accessToken}`;
    }
    return null;
  }, [authType, token, tokenUrl, clientId, clientSecret]);

  return useMemo(() => {
    const makeRequest = async (method, path, options = {}) => {
      const headers = {
        "Content-Type": "application/json",
        ...options.headers,
      };

      const authHeader = await getAuthHeader();
      if (authHeader) {
        headers.Authorization = authHeader;
      }

      const response = await fetch(`${endpoint}${path}`, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`${response.status} ${response.statusText}${body ? `: ${body}` : ""}`);
      }

      const links = parseLinkHeader(response.headers.get("link"));

      return {
        data: await response.json().catch(() => ({})),
        headers: Object.fromEntries(response.headers.entries()),
        nextLink: links.next,
      };
    };

    return {
      endpoint,
      get: (path, options = {}) => makeRequest("GET", path, options),
      put: (path, jsonBody, options = {}) =>
        makeRequest("PUT", path, { ...options, body: jsonBody }),
      del: (path, options = {}) => makeRequest("DELETE", path, options),
    };
  }, [endpoint, getAuthHeader]);
};
