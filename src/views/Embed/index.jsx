import { useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useSources } from "@/hooks/useSources";
import { useIngestingFlows } from "@/hooks/useFlows";
import { useCapabilities } from "@/hooks/useService";
import useStoreManager from "@/stores/useStoreManager";
import StoreManager from "@/views/StoreManager";
import { parseTimerange, timerangeHasMedia } from "@/utils/timerange";
import { FLOW_STATUS, getFlowStatus, isFlowGrowing } from "@/utils/flowStatus";
import { findVideoMember } from "@/utils/editorialPurpose";
import { TAMS_PAGE_LIMIT, VIEW_MODE } from "@/constants";
import { version as appVersion } from "../../../package.json";
import "./Embed.css";

const NANOS_PER_MS = 1_000_000n;
const STORAGE_KEY = "tamstool-stores";
const RECHECK_INTERVAL_MS = 5000;

// Open #/embed?debug to trace what each source resolved to.
const debug = (...args) =>
  window.location.hash.includes("debug") && console.debug("[embed]", ...args);

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
 * Resolve the video Source within a multi-Source.
 *
 * `role === "video"` is checked first because it costs nothing, but TAMS 8.2
 * made the collection `role` optional, so a store may not set it at all. In
 * that case the collected Sources are fetched in one request and picked by
 * their editorial_purpose tag, then by NMOS format.
 */
const resolveVideoSourceId = async (source, api, canQueryCollections) => {
  const collection = source.source_collection;
  if (!collection?.length) return source.id;

  const byRole = collection.find((member) => member?.role === "video");
  if (byRole) return byRole.id;
  if (!canQueryCollections) return source.id;

  try {
    const response = await api.get(
      `/sources?collected_by_ids=${source.id}&limit=${TAMS_PAGE_LIMIT}`
    );
    const children = Array.isArray(response.data) ? response.data : [];
    const byId = new Map(children.map((child) => [child.id, child]));
    return findVideoMember(collection, byId) ?? source.id;
  } catch {
    return source.id;
  }
};

/**
 * Whether a flow can still change what its row shows.
 *
 * An empty flow is not a finished one: a store may create the flow when the
 * recording is scheduled and fill it only once the ingest starts, and reading
 * that first look as final is what left a live source stuck without an Open
 * button. Only a closed flow, or one that already carries media, is done.
 */
const hasSettled = (flow, hasSegments) =>
  getFlowStatus(flow) === FLOW_STATUS.CLOSED_COMPLETE || hasSegments;

/**
 * For each displayed source, fetch its video flow to get fps, duration,
 * growing status, and whether any segments have landed yet. Growing status
 * comes from the flow's `status` (8.2) or the deprecated flow_status tag,
 * guarded by recent segment activity.
 *
 * A source is re-examined every few seconds until it settles, and only then
 * cached. Settled means nothing further can change what the row shows: the
 * flow is closed, or it already carries media. A flow that is merely empty so
 * far -- awaiting content, or created ahead of the ingest -- is not settled,
 * so a recording that starts while the page is open reaches Open on its own
 * rather than at the next reload. `liveSourceIds` additionally re-opens a
 * source the store reports as ingesting.
 *
 * The re-check runs on its own interval rather than on the sources poll: the
 * listing is deliberately kept deeply equal between polls, so SWR returns the
 * same array and effects keyed on it never fire.
 */
const useSourceFlowDetails = (displayedSources, liveSourceIds) => {
  const api = useApi();
  const { collectedByIds: canQueryCollections, resolved } = useCapabilities();
  const [flowDetails, setFlowDetails] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // Sources that can no longer change — never re-fetched
  const settledRef = useRef(new Set());
  // Map of sourceId → videoFlowId for growing sources that need polling
  const growingRef = useRef(new Map());
  // Sources a row has details for, so re-checking does not blink "Loading..."
  const knownRef = useRef(new Set());

  // Fetch every unsettled source when the source list changes
  useEffect(() => {
    // Wait for /service: resolving a source with canQueryCollections still
    // false would cache the wrong video flow in settledRef permanently.
    if (!resolved || !api.endpoint || displayedSources.length === 0) return;
    let cancelled = false;

    const fetchAll = async () => {
      // A source that has started ingesting since we last looked has more to
      // give. useIngestingFlows reports the source the flow hangs off, which
      // for a multi-source recording is the video child rather than the row on
      // display, so collection members are matched too.
      displayedSources.forEach((source) => {
        const live =
          liveSourceIds.has(source.id) ||
          (source.source_collection ?? []).some((member) =>
            liveSourceIds.has(member?.id)
          );
        if (live) settledRef.current.delete(source.id);
      });
      const toFetch = displayedSources.filter((s) => !settledRef.current.has(s.id));
      if (toFetch.length === 0) return;

      const showLoading = toFetch.some((s) => !knownRef.current.has(s.id));
      if (showLoading) setIsLoading(true);
      await Promise.all(
        toFetch.map(async (source) => {
          try {
            const videoSourceId = await resolveVideoSourceId(
              source,
              api,
              canQueryCollections
            );
            const listRes = await api.get(`/flows?source_id=${videoSourceId}&limit=1`);
            const listed = listRes.data?.[0];
            if (!listed) {
              debug(source.id, "no flow yet");
              return;
            }

            const detailRes = await api.get(`/flows/${listed.id}?include_timerange=true`);
            // The listing strips segments_updated, so growth has to be judged
            // on the detail record: a flow created well before its ingest
            // starts would otherwise read as an abandoned one and never be
            // polled.
            const flow = detailRes.data ?? listed;

            const fr = flow.essence_parameters?.frame_rate;
            const fps = fr?.numerator ? fr.numerator / (fr.denominator || 1) : null;
            const isGrowing = isFlowGrowing(flow);

            let durationMs = null;
            const tr = flow.timerange;
            const hasSegments = timerangeHasMedia(tr);
            if (tr) {
              const parsed = parseTimerange(tr);
              if (parsed.start !== null && parsed.end !== null) {
                durationMs = Number((parsed.end - parsed.start) / NANOS_PER_MS);
              }
            }

            if (isGrowing) {
              growingRef.current.set(source.id, flow.id);
            } else {
              growingRef.current.delete(source.id);
              if (hasSettled(flow, hasSegments)) settledRef.current.add(source.id);
            }

            debug(source.id, {
              flow: flow.id,
              status: getFlowStatus(flow),
              timerange: tr ?? null,
              isGrowing,
              hasSegments,
              settled: settledRef.current.has(source.id),
            });

            if (!cancelled) {
              knownRef.current.add(source.id);
              setFlowDetails((prev) => {
                const next = new Map(prev);
                next.set(source.id, { fps, isGrowing, durationMs, hasSegments });
                return next;
              });
            }
          } catch { /* skip */ }
        })
      );
      if (!cancelled && showLoading) setIsLoading(false);
    };

    fetchAll();
    // On a timer, not just on a new source list: paginationFetcher strips the
    // fields that change during an ingest so that the listing stays deeply
    // equal across polls, and SWR then hands back the very same array. The
    // effect therefore does not re-run while a recording is under way, which
    // is precisely when a source has something new to say.
    const id = setInterval(fetchAll, RECHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [api, displayedSources, liveSourceIds, canQueryCollections, resolved]);

  // Poll growing flows by their flow ID every 5s
  useEffect(() => {
    if (!api.endpoint) return;

    const poll = async () => {
      const entries = Array.from(growingRef.current.entries());
      if (entries.length === 0) return;

      await Promise.all(
        entries.map(async ([sourceId, flowId]) => {
          try {
            // No cache-buster: 8.2 stores validate query parameters and reject
            // an unknown one with a 400. api.get already fetches no-store.
            const res = await api.get(`/flows/${flowId}?include_timerange=true`);
            const flow = res.data;
            if (!flow) return;

            const isGrowing = isFlowGrowing(flow);

            let durationMs = null;
            const tr = flow.timerange;
            const hasSegments = timerangeHasMedia(tr);
            if (tr) {
              const parsed = parseTimerange(tr);
              if (parsed.start !== null && parsed.end !== null) {
                durationMs = Number((parsed.end - parsed.start) / NANOS_PER_MS);
              }
            }

            if (!isGrowing) {
              growingRef.current.delete(sourceId);
              if (hasSettled(flow, hasSegments)) settledRef.current.add(sourceId);
            }

            setFlowDetails((prev) => {
              const next = new Map(prev);
              const existing = next.get(sourceId);
              next.set(sourceId, { ...existing, isGrowing, durationMs, hasSegments });
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
  const { sources, isLoading: sourcesLoading, error: sourcesError } = useSources({
    viewMode: VIEW_MODE.TOP_LEVEL,
    sortBy: "created",
  });

  // Flows the store reports as ingesting, so a recording that starts while the
  // page is open lights up without re-scanning every source.
  const { flows: ingestingFlows } = useIngestingFlows();
  const liveSourceKey = (ingestingFlows ?? [])
    .map((flow) => flow.source_id)
    .sort()
    .join(",");
  const liveSourceIds = useMemo(
    () => new Set(liveSourceKey ? liveSourceKey.split(",") : []),
    [liveSourceKey]
  );

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

  // useSources already scopes this to top-level sources, newest first where the
  // store can sort. Older stores return them unordered, so sort here too.
  const displayedSources = useMemo(() => {
    if (!sources) return [];
    return [...sources].sort((a, b) => {
      const da = a.created ? new Date(a.created) : new Date(0);
      const db = b.created ? new Date(b.created) : new Date(0);
      return db - da;
    });
  }, [sources]);

  // Fetch flow details (fps, duration, growing) for each displayed source
  const { flowDetails, isLoading: detailsLoading } = useSourceFlowDetails(
    displayedSources,
    liveSourceIds
  );

  const enrichedSources = useMemo(() => {
    return displayedSources.map((source) => {
      const details = flowDetails?.get(source.id);
      return {
        ...source,
        isGrowing: details?.isGrowing ?? false,
        durationMs: details?.durationMs ?? null,
        hasSegments: details?.hasSegments ?? false,
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
            {source.hasSegments && (
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
