import {
  refreshHubSpotToken as _refreshHubSpotToken,
  triggerHubSpotSync as _triggerHubSpotSync,
  syncLeadToHubSpot as _syncLeadToHubSpot,
} from "@/src/crm-sync.js";
import { CrmSyncResult } from "./crm";

export interface SyncLeadOptions {
  workspaceId?: string;
}

export const refreshHubSpotToken = _refreshHubSpotToken;
export const triggerHubSpotSync: (
  lead: any,
  project: any,
  supabase: any,
  options?: SyncLeadOptions
) => Promise<CrmSyncResult & { skipped?: boolean }> = _triggerHubSpotSync;
export const syncLeadToHubSpot: (
  accessToken: string,
  properties: Record<string, string>
) => Promise<CrmSyncResult> = _syncLeadToHubSpot;
