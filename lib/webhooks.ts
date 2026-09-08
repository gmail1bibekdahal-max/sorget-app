import crypto from "crypto";

export interface WebhookPayload {
  event: "lead.created";
  timestamp: string;
  data: {
    id: string;
    project_id: string;
    name: string | null;
    email: string;
    channel: string | null;
    source: string | null;
    medium: string | null;
    campaign: string | null;
    content: string | null;
    term: string | null;
    gclid: string | null;
    gbraid: string | null;
    gad_campaignid: string | null;
    gad_source: string | null;
    drilldown1: string | null;
    drilldown2: string | null;
    drilldown3: string | null;
    landing_url: string | null;
    landing_page: string | null;
    landing_page_group: string | null;
    submit_page: string | null;
    created_at: string;
  };
}

import { signPayload, verifySignature } from "@/src/webhooks.js";
export { signPayload, verifySignature };

export async function dispatchLeadWebhook(lead: any, projectId: string, supabase: any): Promise<void> {
  if (!lead || !projectId || !supabase) return;

  try {
    const { data: webhooks, error } = await supabase
      .from("webhooks")
      .select("id, url, secret, events, status")
      .eq("project_id", projectId)
      .eq("status", "active");

    if (error || !webhooks || webhooks.length === 0) {
      return;
    }

    const payload: WebhookPayload = {
      event: "lead.created",
      timestamp: new Date().toISOString(),
      data: {
        id: lead.id,
        project_id: projectId,
        name: lead.name,
        email: lead.email,
        channel: lead.channel,
        source: lead.source,
        medium: lead.medium,
        campaign: lead.campaign,
        content: lead.content,
        term: lead.term,
        gclid: lead.gclid,
        gbraid: lead.gbraid,
        gad_campaignid: lead.gad_campaignid,
        gad_source: lead.gad_source,
        drilldown1: lead.drilldown1,
        drilldown2: lead.drilldown2,
        drilldown3: lead.drilldown3,
        landing_url: lead.landing_url,
        landing_page: lead.landing_page,
        landing_page_group: lead.landing_page_group,
        submit_page: lead.submit_page,
        created_at: lead.created_at || new Date().toISOString(),
      },
    };

    const payloadString = JSON.stringify(payload);

    for (const hook of webhooks) {
      const signature = signPayload(payloadString, hook.secret);
      const startTime = Date.now();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Attributer-Signature": signature,
            "X-Attributer-Timestamp": payload.timestamp,
            "User-Agent": "Attributer-Webhooks/1.0",
          },
          body: payloadString,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;
        let responseBody = "";
        try {
          responseBody = (await res.text()).substring(0, 500);
        } catch {}

        await supabase.from("webhook_deliveries").insert([
          {
            webhook_id: hook.id,
            event: "lead.created",
            payload,
            status_code: res.status,
            response_body: responseBody,
            duration_ms: durationMs,
            error: res.ok ? null : `HTTP ${res.status}`,
          },
        ]);
      } catch (reqErr: any) {
        const durationMs = Date.now() - startTime;
        await supabase.from("webhook_deliveries").insert([
          {
            webhook_id: hook.id,
            event: "lead.created",
            payload,
            status_code: null,
            response_body: null,
            duration_ms: durationMs,
            error: reqErr.message || "Request failed",
          },
        ]);
      }
    }
  } catch (err: any) {
    console.error("[dispatchLeadWebhook] Error:", err.message);
  }
}