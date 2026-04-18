import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { useApi } from "@/hooks/useApi";
import { useSources } from "@/hooks/useSources";
import useStoreManager from "@/stores/useStoreManager";
import StoreManager from "@/views/StoreManager";
import { parseTimerange } from "@/utils/timerange";
import { version as appVersion } from "../../../package.json";
import "./Embed.css";

const NANOS_PER_MS = 1_000_000n;
const STORAGE_KEY = "tamstool-stores";

const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();

/**
 * Request access to the main app's (unpartitioned) localStorage via the
 * Storage Access API and hydrate the Zustand store from it. Zustand's persist
 * middleware will then write the state to the iframe's own (partitioned)
 * localStorage so subsequent loads work without another prompt.
 */
const tryLoadSharedConfig = async () => {
  // Chrome 125+: handle-based API gives direct localStorage access
  try {
    const handle = await document.requestStorageAccess({ localStorage: true });
    const raw = handle.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.state?.stores?.length > 0) {
        useStoreManager.setState(parsed.state);
        return true;
      }
    }
    return false;
  } catch { /* fall through */ }

  // Safari / older browsers: basic API, then read localStorage directly
  try {
    await document.requestStorageAccess();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.state?.stores?.length > 0) {
        useStoreManager.setState(parsed.state);
        return true;
      }
    }
  } catch { /* storage access denied or unavailable */ }

  return false;
};

const formatDuration = (ms) => {
  if (ms == null || ms <= 0) return "";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
};

const formatFps = (fps) => {
  if (fps == null || fps <= 0) return "";
  const rounded = Math.round(fps * 100) / 100;
  const str = rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2).replace(/0+$/, "");
  return `${str}fps`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const GROWING_STALE_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Check if a flow is actively growing. A flow is growing if it has the
 * "ingesting" tag AND recent activity (segments_updated or created within
 * the last 10 minutes). This avoids showing abandoned ingests as "live".
 *
 * A flow is definitively NOT growing if it has the "closed_complete" tag.
 */
const isFlowGrowing = (flow) => {
  if (flow.tags?.flow_status?.includes("closed_complete")) return false;
  const hasIngestingTag = flow.tags?.flow_status?.includes("ingesting") ?? false;
  if (!hasIngestingTag) return false;
  const segUpdated = flow.segments_updated;
  if (segUpdated) return Date.now() - new Date(segUpdated).getTime() < GROWING_STALE_MS;
  // No segments yet — only treat as growing if the flow was created recently
  const created = flow.created;
  if (!created) return false;
  return Date.now() - new Date(created).getTime() < GROWING_STALE_MS;
};

/**
 * For each displayed source, fetch its video flow to get fps, duration,
 * and growing status. Growing status requires both the "ingesting" tag
 * and recent segment activity (within 10 minutes).
 *
 * On initial load, all sources are fetched once. Sources that are growing
 * are tracked by flow ID and re-polled every 5s until they close.
 */
const useSourceFlowDetails = (displayedSources) => {
  const api = useApi();
  const [flowDetails, setFlowDetails] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // Permanent cache for closed sources — never re-fetched
  const closedRef = useRef(new Set());
  // Map of sourceId → videoFlowId for growing sources that need polling
  const growingRef = useRef(new Map());

  // Fetch all uncached sources when the source list changes
  useEffect(() => {
    if (!api.endpoint || displayedSources.length === 0) return;
    let cancelled = false;

    const fetchAll = async () => {
      const toFetch = displayedSources.filter((s) => !closedRef.current.has(s.id));
      if (toFetch.length === 0) return;

      setIsLoading(true);
      await Promise.all(
        toFetch.map(async (source) => {
          try {
            const videoSubSource = source.source_collection?.find((s) => s.role === "video");
            const videoSourceId = videoSubSource?.id || source.id;
            const listRes = await api.get(`/flows?source_id=${videoSourceId}&limit=1`);
            const flow = listRes.data?.[0];
            if (!flow) return;

            const fr = flow.essence_parameters?.frame_rate;
            const fps = fr?.numerator ? fr.numerator / (fr.denominator || 1) : null;
            const isGrowing = isFlowGrowing(flow);

            let durationMs = null;
            const detailRes = await api.get(`/flows/${flow.id}?include_timerange=true`);
            const tr = detailRes.data?.timerange;
            if (tr) {
              const parsed = parseTimerange(tr);
              if (parsed.start !== null && parsed.end !== null) {
                durationMs = Number((parsed.end - parsed.start) / NANOS_PER_MS);
              }
            }

            if (isGrowing) {
              growingRef.current.set(source.id, flow.id);
            } else {
              closedRef.current.add(source.id);
              growingRef.current.delete(source.id);
            }

            if (!cancelled) {
              setFlowDetails((prev) => {
                const next = new Map(prev);
                next.set(source.id, { fps, isGrowing, durationMs });
                return next;
              });
            }
          } catch { /* skip */ }
        })
      );
      if (!cancelled) setIsLoading(false);
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [api, displayedSources]);

  // Poll growing flows by their flow ID every 5s
  useEffect(() => {
    if (!api.endpoint) return;

    const poll = async () => {
      const entries = Array.from(growingRef.current.entries());
      if (entries.length === 0) return;

      await Promise.all(
        entries.map(async ([sourceId, flowId]) => {
          try {
            const res = await api.get(`/flows/${flowId}?include_timerange=true&_t=${Date.now()}`);
            const flow = res.data;
            if (!flow) return;

            const isGrowing = isFlowGrowing(flow);

            let durationMs = null;
            const tr = flow.timerange;
            if (tr) {
              const parsed = parseTimerange(tr);
              if (parsed.start !== null && parsed.end !== null) {
                durationMs = Number((parsed.end - parsed.start) / NANOS_PER_MS);
              }
            }

            if (!isGrowing) {
              closedRef.current.add(sourceId);
              growingRef.current.delete(sourceId);
            }

            setFlowDetails((prev) => {
              const next = new Map(prev);
              const existing = next.get(sourceId);
              next.set(sourceId, { ...existing, isGrowing, durationMs });
              return next;
            });
          } catch { /* skip */ }
        })
      );
    };

    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [api]);

  return { flowDetails, isLoading };
};

const Embed = () => {
  const cuttingRoomTamsId = useStoreManager((s) => s.getCuttingRoomTamsId());
  const activeStore = useStoreManager((s) => s.getActiveStore());
  const needsConfig = !activeStore || !cuttingRoomTamsId;
  const [showConfig, setShowConfig] = useState(needsConfig);
  const [importing, setImporting] = useState(false);
  const { sources, isLoading: sourcesLoading, error: sourcesError } = useSources();

  // Auto-sync from main app's localStorage if we already have storage access
  useEffect(() => {
    if (!needsConfig || !isInIframe) return;
    let cancelled = false;
    (async () => {
      try {
        if (await document.hasStorageAccess?.()) {
          const loaded = await tryLoadSharedConfig();
          if (loaded && !cancelled) setShowConfig(false);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [needsConfig]);

  const handleImportConfig = async () => {
    setImporting(true);
    const loaded = await tryLoadSharedConfig();
    if (loaded) setShowConfig(false);
    setImporting(false);
  };

  // Filter to displayable sources (not collected by a multi-source)
  const displayedSources = useMemo(() => {
    if (!sources) return [];
    const collectedIds = new Set();
    for (const source of sources) {
      if (source.collected_by?.length) {
        collectedIds.add(source.id);
      }
    }
    return sources
      .filter((source) => !collectedIds.has(source.id))
      .sort((a, b) => {
        const da = a.created ? new Date(a.created) : new Date(0);
        const db = b.created ? new Date(b.created) : new Date(0);
        return db - da;
      });
  }, [sources]);

  // Fetch flow details (fps, duration, growing) for each displayed source
  const { flowDetails, isLoading: detailsLoading } = useSourceFlowDetails(displayedSources);

  const enrichedSources = useMemo(() => {
    return displayedSources.map((source) => {
      const details = flowDetails?.get(source.id);
      return {
        ...source,
        isGrowing: details?.isGrowing ?? false,
        durationMs: details?.durationMs ?? null,
        fps: details?.fps ?? null,
        detailsLoaded: !!details,
      };
    });
  }, [displayedSources, flowDetails]);

  const [shiftHeld, setShiftHeld] = useState(false);

  useEffect(() => {
    const down = (e) => { if (e.key === "Shift") setShiftHeld(true); };
    const up = (e) => { if (e.key === "Shift") setShiftHeld(false); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const handleOpen = (source, e) => {
    const refresh = e?.shiftKey;
    const crl = `crl://tams/${cuttingRoomTamsId}/${source.id}`;
    const message = {
      action: "open_asset",
      payload: {
        item: {
          contentType: "video",
          source: { url: crl },
          status: source.isGrowing ? "growing" : "ready",
          title: source.label || source.id,
        },
        ...(refresh && { regenerateProxies: true }),
      },
    };
    window.parent.postMessage(message, "*");
  };

  const isLoading = sourcesLoading;
  const error = sourcesError;

  if (showConfig) {
    return (
      <div className="embed-container embed-config">
        <div className="embed-header">
          <span className="embed-title">
            Store Configuration
            <span className="embed-version">v{appVersion}</span>
          </span>
          {!needsConfig && (
            <button className="embed-back-btn" onClick={() => setShowConfig(false)}>
              Back
            </button>
          )}
        </div>
        {isInIframe && needsConfig && (
          <div className="embed-import-section">
            <button
              className="embed-import-btn"
              onClick={handleImportConfig}
              disabled={importing}
            >
              {importing ? "Loading..." : "Load config from main app"}
            </button>
            <span className="embed-import-hint">or configure manually below</span>
          </div>
        )}
        <StoreManager />
      </div>
    );
  }

  return (
    <div className="embed-container">
      <div className="embed-header">
        <span className="embed-title">
          {enrichedSources.some((s) => s.isGrowing) && (
            <span className="embed-title-dot" />
          )}
          {activeStore?.name || "TAMS Sources"}
        </span>
        <div className="embed-header-right">
          {(isLoading || detailsLoading) && <span className="embed-loading">Loading...</span>}
          <button
            className="embed-config-btn"
            onClick={() => setShowConfig(true)}
            title="Store settings"
          >
            &#9881;
          </button>
        </div>
      </div>
      {error && (
        <div className="embed-error">Failed to connect to TAMS store</div>
      )}
      <div className="embed-list">
        {enrichedSources.map((source) => (
          <div key={source.id} className="embed-row">
            <div className="embed-row-info">
              {source.detailsLoaded && source.isGrowing && <span className="embed-live-dot" title="Recording in progress" />}
              <span className="embed-row-label" title={source.label || source.id}>
                {source.label || source.id}
              </span>
              <span className="embed-row-meta">
                {formatDate(source.created)}
                {source.fps && (
                  <span className="embed-row-fps">{formatFps(source.fps)}</span>
                )}
              </span>
            </div>
            {source.detailsLoaded && source.isGrowing ? (
              <span className="embed-row-duration embed-row-live">LIVE</span>
            ) : source.durationMs > 0 ? (
              <span className="embed-row-duration">{formatDuration(source.durationMs)}</span>
            ) : null}
            {source.durationMs > 0 && (
              <button className="embed-open-btn" onClick={(e) => handleOpen(source, e)}>
                {shiftHeld ? "NEW" : "Open"}
              </button>
            )}
          </div>
        ))}
        {!isLoading && !error && enrichedSources.length === 0 && (
          <div className="embed-empty">No sources found</div>
        )}
      </div>
    </div>
  );
};

export default Embed;
