import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useApi } from "@/hooks/useApi";
import { useSources } from "@/hooks/useSources";
import useStoreManager from "@/stores/useStoreManager";
import StoreManager from "@/views/StoreManager";
import { parseTimerange } from "@/utils/timerange";
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

/**
 * For each displayed source, find its video source ID (from source_collection
 * or the source itself if it's a video), then fetch one video flow to get
 * essence_parameters (fps) and timerange (duration / growing).
 */
const useSourceFlowDetails = (displayedSources) => {
  const api = useApi();

  // Build a stable cache key from source IDs
  const sourceIds = useMemo(
    () => displayedSources.map((s) => s.id).sort().join(","),
    [displayedSources]
  );

  const { data, error, isLoading } = useSWR(
    api.endpoint && sourceIds ? [api.endpoint, "source-flow-details", sourceIds] : null,
    async () => {
      const results = new Map();
      await Promise.all(
        displayedSources.map(async (source) => {
          try {
            // Find the video sub-source ID
            const videoSubSource = source.source_collection?.find((s) => s.role === "video");
            const videoSourceId = videoSubSource?.id || source.id;

            // Get one flow for this video source
            const listRes = await api.get(`/flows?source_id=${videoSourceId}&limit=1`);
            const flow = listRes.data?.[0];
            if (!flow) return;

            // Extract fps from essence_parameters
            const fr = flow.essence_parameters?.frame_rate;
            const fps = fr?.numerator ? fr.numerator / (fr.denominator || 1) : null;

            // Fetch the same flow with include_timerange for duration
            const detailRes = await api.get(`/flows/${flow.id}?include_timerange=true`);
            const timerange = detailRes.data?.timerange;

            let isGrowing = false;
            let durationMs = null;
            if (timerange) {
              const parsed = parseTimerange(timerange);
              if (parsed.start !== null && parsed.end === null) {
                isGrowing = true;
                durationMs = Number(BigInt(Date.now()) - parsed.start / NANOS_PER_MS);
              } else if (parsed.start !== null && parsed.end !== null) {
                durationMs = Number((parsed.end - parsed.start) / NANOS_PER_MS);
              }
            }

            results.set(source.id, { fps, isGrowing, durationMs });
          } catch { /* skip failed sources */ }
        })
      );
      return results;
    },
    { refreshInterval: 5000 }
  );

  return { flowDetails: data, error, isLoading };
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
      const details = flowDetails?.get(source.id) || {};
      return {
        ...source,
        isGrowing: details.isGrowing || false,
        durationMs: details.durationMs || null,
        fps: details.fps || null,
      };
    });
  }, [displayedSources, flowDetails]);

  const handleOpen = (source) => {
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
          <span className="embed-title">Store Configuration</span>
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
              {source.isGrowing && <span className="embed-live-dot" title="Recording in progress" />}
              <span className="embed-row-label" title={source.label || source.id}>
                {source.label || source.id}
              </span>
              <span className="embed-row-meta">
                {formatDate(source.created)}
              </span>
            </div>
            <span className="embed-row-extras">
              {source.durationMs > 0 && (
                <span className="embed-row-duration">{formatDuration(source.durationMs)}</span>
              )}
              {source.fps && (
                <span className="embed-row-fps">{formatFps(source.fps)}</span>
              )}
            </span>
            <button className="embed-open-btn" onClick={() => handleOpen(source)}>
              Open
            </button>
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
