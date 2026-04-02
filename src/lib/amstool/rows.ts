/** Shared amstool list row shape (no server-only — safe for client `import type`). */
export type AmstoolCacheRow = {
  hostname: string;
  instanceId: string;
  eip: string;
  topologyName: string;
  bbLogicalName: string;
  region: string;
  bbId: string;
  cloudAccount: string;
  bbUrl: string;
  environment: string;
  aemType: string;
  ldapEnabled: string;
  clone: string;
  extra: string[];
};

export type AmstoolCacheSummary = {
  totalHosts: number;
  topologyCount: number;
  byAemType: Record<string, number>;
  topTopologies: { name: string; count: number }[];
};

export type AmstoolTopologyGroup = {
  topologyName: string;
  rows: AmstoolCacheRow[];
};

/** One row per customer with a topology stub — drives the AMSTOOL filter select label. */
export type AmstoolStubFilterOption = {
  customerId: number;
  name: string;
  topologyStub: string;
};

/** Serializable payload for the AMSTOOL page client filter. */
export type AmstoolPageViewPayload = {
  topologyStubsUsed: string[];
  stubsWithNoMatches: string[];
  /** Combined view (all stubs). */
  topologyGroupsAll: AmstoolTopologyGroup[];
  summaryAll: AmstoolCacheSummary;
  displayedRowCountAll: number;
  totalMatchedRowsAll: number;
  /** One capped view per stub (same row limit as server snapshot). */
  perStub: Record<
    string,
    {
      topologyGroups: AmstoolTopologyGroup[];
      summary: AmstoolCacheSummary;
      displayedRowCount: number;
      totalMatchedRows: number;
    }
  >;
  amstoolPath: string;
  rowLimit: number;
};
