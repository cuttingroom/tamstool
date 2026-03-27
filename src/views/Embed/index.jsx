import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useApi } from "@/hooks/useApi";
import { useSources } from "@/hooks/useSources";
import useStoreManager from "@/stores/useStoreManager";
import StoreManager from "@/views/StoreManager";
import paginationFetcher from "@/utils/paginationFetcher";
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

const useFlows = () => {
  const api = useApi();
  const { data, error, isLoading } = useSWR(
    api.endpoint ? [api.endpoint, "/flows?limit=300"] : null,
    ([, path]) => paginationFetcher(path, null, api),
    { refreshInterval: 3000 }
  );
  return { flows: data, error, isLoading };
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
  const { flows, isLoading: flowsLoading, error: flowsError } = useFlows();
  const api = useApi();

  // Build flow maps and per-source fps from the flow list (no timerange on list endpoint)
  const { sourceData, representativeFlowIds } = useMemo(() => {
    if (!sources || !flows) return { sourceData: new Map(), representativeFlowIds: [] };

    const flowsById = new Map();
    const flowsBySource = new Map();
    for (const flow of flows) {
      flowsById.set(flow.id, flow);
      if (!flow.source_id) continue;
      if (!flowsBySource.has(flow.source_id)) {
        flowsBySource.set(flow.source_id, []);
      }
      flowsBySource.get(flow.source_id).push(flow);
    }

    const collectedIds = new Set();
    for (const source of sources) {
      if (source.collected_by?.length) {
        collectedIds.add(source.id);
      }
    }

    const getAllFlows = (sourceId) => {
      const direct = flowsBySource.get(sourceId) || [];
      const all = [...direct];
      for (const flow of direct) {
        if (flow.flow_collection) {
          for (const ref of flow.flow_collection) {
            const child = flowsById.get(ref.id);
            if (child) all.push(child);
          }
        }
      }
      return all;
    };

    const data = new Map();
    const repIds = [];
    for (const source of sources) {
      if (collectedIds.has(source.id)) continue;
      const allFlows = getAllFlows(source.id);
      let fps = null;
      let repFlowId = null;
      for (const flow of allFlows) {
        const fr = flow.essence_parameters?.frame_rate;
        if (!fps && fr?.numerator) {
          fps = fr.numerator / (fr.denominator || 1);
        }
        if (!repFlowId) repFlowId = flow.id;
      }
      data.set(source.id, { fps, repFlowId });
      if (repFlowId) repIds.push(repFlowId);
    }
    return { sourceData: data, representativeFlowIds: repIds };
  }, [sources, flows]);

  // Fetch timerange for representative flows individually
  const { data: flowTimeranges } = useSWR(
    api.endpoint && representativeFlowIds.length > 0
      ? [api.endpoint, "flow-timeranges", ...representativeFlowIds]
      : null,
    async () => {
      const results = new Map();
      await Promise.all(
        representativeFlowIds.map(async (id) => {
          try {
            const res = await api.get(`/flows/${id}?include_timerange=true`);
            if (res.data?.timerange) {
              results.set(id, res.data.timerange);
            }
          } catch { /* skip */ }
        })
      );
      return results;
    },
    { refreshInterval: 5000 }
  );

  const enrichedSources = useMemo(() => {
    if (!sources || !flows) return [];

    const collectedIds = new Set();
    for (const source of sources) {
      if (source.collected_by?.length) {
        collectedIds.add(source.id);
      }
    }

    return sources
      .filter((source) => !collectedIds.has(source.id))
      .map((source) => {
        const sd = sourceData.get(source.id) || {};
        let isGrowing = false;
        let durationMs = null;

        const tr = sd.repFlowId && flowTimeranges?.get(sd.repFlowId);
        if (tr) {
          const parsed = parseTimerange(tr);
          if (parsed.start !== null && parsed.end === null) {
            isGrowing = true;
            durationMs = Number(BigInt(Date.now()) - parsed.start / NANOS_PER_MS);
          } else if (parsed.start !== null && parsed.end !== null) {
            durationMs = Number((parsed.end - parsed.start) / NANOS_PER_MS);
          }
        }

        return {
          ...source,
          isGrowing,
          durationMs,
          fps: sd.fps || null,
        };
      })
      .sort((a, b) => {
        const da = a.created ? new Date(a.created) : new Date(0);
        const db = b.created ? new Date(b.created) : new Date(0);
        return db - da;
      });
  }, [sources, flows, sourceData, flowTimeranges]);

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

  const isLoading = sourcesLoading || flowsLoading;
  const error = sourcesError || flowsError;

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
          {isLoading && <span className="embed-loading">Loading...</span>}
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
