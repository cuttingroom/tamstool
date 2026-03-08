import { useMemo } from "react";
import useSWR from "swr";
import { useApi } from "@/hooks/useApi";
import { useSources } from "@/hooks/useSources";
import useStoreManager from "@/stores/useStoreManager";
import paginationFetcher from "@/utils/paginationFetcher";
import { parseTimerange } from "@/utils/timerange";
import "./Embed.css";

const NANOS_PER_MS = 1_000_000n;

const formatDuration = (ms) => {
  if (ms == null || ms <= 0) return "";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
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

const useFlowsWithTimerange = () => {
  const api = useApi();
  const { data, error, isLoading } = useSWR(
    api.endpoint ? [api.endpoint, "/flows?limit=300&include_timerange=true"] : null,
    ([, path]) => paginationFetcher(path, null, api),
    { refreshInterval: 3000 }
  );
  return { flows: data, error, isLoading };
};

const Embed = () => {
  const cuttingRoomTamsId = useStoreManager((s) => s.getCuttingRoomTamsId());
  const activeStore = useStoreManager((s) => s.getActiveStore());
  const { sources, isLoading: sourcesLoading, error: sourcesError } = useSources();
  const { flows, isLoading: flowsLoading, error: flowsError } = useFlowsWithTimerange();

  const enrichedSources = useMemo(() => {
    if (!sources || !flows) return [];

    const flowsBySource = new Map();
    for (const flow of flows) {
      if (!flow.source_id) continue;
      if (!flowsBySource.has(flow.source_id)) {
        flowsBySource.set(flow.source_id, []);
      }
      flowsBySource.get(flow.source_id).push(flow);
    }

    return sources
      .map((source) => {
        const sourceFlows = flowsBySource.get(source.id) || [];
        let isGrowing = false;
        let durationMs = null;

        for (const flow of sourceFlows) {
          if (!flow.timerange) continue;
          const parsed = parseTimerange(flow.timerange);
          if (parsed.start !== null && parsed.end === null) {
            isGrowing = true;
          }
          if (parsed.start !== null && parsed.end !== null) {
            const ms = Number((parsed.end - parsed.start) / NANOS_PER_MS);
            if (durationMs === null || ms > durationMs) {
              durationMs = ms;
            }
          }
        }

        return {
          ...source,
          isGrowing,
          durationMs,
        };
      })
      .sort((a, b) => {
        const da = a.created ? new Date(a.created) : new Date(0);
        const db = b.created ? new Date(b.created) : new Date(0);
        return db - da;
      });
  }, [sources, flows]);

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

  if (!activeStore) {
    return (
      <div className="embed-container">
        <div className="embed-empty">No store configured. Open tamstool settings to add a TAMS store.</div>
      </div>
    );
  }

  if (!cuttingRoomTamsId) {
    return (
      <div className="embed-container">
        <div className="embed-empty">No CuttingRoom TAMS ID configured. Edit the store in tamstool settings.</div>
      </div>
    );
  }

  return (
    <div className="embed-container">
      <div className="embed-header">
        <span className="embed-title">TAMS Sources</span>
        {isLoading && <span className="embed-loading">Loading...</span>}
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
                {source.durationMs > 0 && (
                  <span className="embed-row-duration">{formatDuration(source.durationMs)}</span>
                )}
              </span>
            </div>
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
