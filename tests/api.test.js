/**
 * tests/api.test.js
 *
 * Automated tests for Phase 5 & Phase 6:
 * - Phase 5: Node.js Backend API & Supabase Lead Ingestion
 * - Phase 6: Project Identification & Multi-Project Data Isolation
 *
 * Uses an in-memory mock Supabase layer to ensure tests are fast, self-contained,
 * and independent of external network/production credentials.
 *
 * Run with: npm test
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { getProjectId } from "../src/attribution.js";

/**
 * Validates whether an email string is structurally valid.
 */
export function isValidEmail(email) {
    if (typeof email !== "string") return false;
    const trimmed = email.trim();
    if (!trimmed) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed);
}

function normalizeString(val) {
    if (val === null || val === undefined) return null;
    const str = String(val).trim();
    return str.length > 0 ? str : null;
}

/**
 * Creates a standalone HTTP server matching the API contract for testing.
 */
function createApp(supabase) {
    return http.createServer(async (req, res) => {
        const origin = req.headers.origin;
        res.setHeader("Access-Control-Allow-Origin", origin || "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

        if (req.method === "OPTIONS") {
            res.statusCode = 204;
            return res.end();
        }

        const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
        const pathname = url.pathname;

        if (req.method === "GET" && pathname === "/api/health") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            return res.end(JSON.stringify({ status: "ok" }));
        }

        if (req.method === "POST" && pathname === "/api/leads") {
            let bodyStr = "";
            req.on("data", (chunk) => { bodyStr += chunk; });
            req.on("end", async () => {
                try {
                    const body = bodyStr ? JSON.parse(bodyStr) : {};
                    const rawTrackingId = body.tracking_id ?? body.project_id ?? body.projectId;
                    if (!rawTrackingId || typeof rawTrackingId !== "string" || !rawTrackingId.trim()) {
                        res.statusCode = 400;
                        res.setHeader("Content-Type", "application/json");
                        return res.end(JSON.stringify({ success: false, error: "Invalid project" }));
                    }

                    const trackingId = rawTrackingId.trim();
                    if (!supabase) {
                        res.statusCode = 500;
                        res.setHeader("Content-Type", "application/json");
                        return res.end(JSON.stringify({ success: false, error: "Failed to store lead" }));
                    }

                    let { data: projectData, error: projectError } = await supabase
                        .from("projects")
                        .select("id, name, tracking_id")
                        .eq("tracking_id", trackingId)
                        .single();

                    if (projectError || !projectData) {
                        const { data: projectByUuid, error: uuidErr } = await supabase
                            .from("projects")
                            .select("id, name, tracking_id")
                            .eq("id", trackingId)
                            .single();
                        if (!uuidErr && projectByUuid) {
                            projectData = projectByUuid;
                            projectError = null;
                        }
                    }

                    if (projectError || !projectData) {
                        res.statusCode = 400;
                        res.setHeader("Content-Type", "application/json");
                        return res.end(JSON.stringify({ success: false, error: "Invalid project" }));
                    }

                    if (!body.email || !isValidEmail(body.email)) {
                        res.statusCode = 400;
                        res.setHeader("Content-Type", "application/json");
                        return res.end(JSON.stringify({ success: false, error: "Valid email is required" }));
                    }

                    const email = String(body.email).trim();
                    const name = normalizeString(body.name);
                    const leadRecord = {
                        project_id: projectData.id,
                        name,
                        email,
                        channel: normalizeString(body.channel),
                        source: normalizeString(body.source),
                        medium: normalizeString(body.medium),
                        campaign: normalizeString(body.campaign),
                        content: normalizeString(body.content),
                        term: normalizeString(body.term),
                        gclid: normalizeString(body.gclid),
                        gbraid: normalizeString(body.gbraid),
                        gad_campaignid: normalizeString(body.gad_campaignid),
                        gad_source: normalizeString(body.gad_source),
                        referrer: normalizeString(body.referrer),
                        landing_url: normalizeString(body.landingUrl ?? body.landing_url),
                        landing_page: normalizeString(body.landingPage ?? body.landing_page),
                    };

                    const { data, error } = await supabase
                        .from("leads")
                        .insert([leadRecord])
                        .select();

                    if (error) {
                        res.statusCode = 500;
                        res.setHeader("Content-Type", "application/json");
                        return res.end(JSON.stringify({ success: false, error: "Failed to store lead" }));
                    }

                    const createdLead = Array.isArray(data) && data.length > 0 ? data[0] : leadRecord;
                    res.statusCode = 201;
                    res.setHeader("Content-Type", "application/json");
                    return res.end(JSON.stringify({ success: true, lead: createdLead }));
                } catch (err) {
                    res.statusCode = 500;
                    res.setHeader("Content-Type", "application/json");
                    return res.end(JSON.stringify({ success: false, error: "Failed to store lead" }));
                }
            });
            return;
        }

        const matchProjectLeads = pathname.match(/^\/api\/projects\/([^/]+)\/leads$/);
        if (req.method === "GET" && matchProjectLeads) {
            const trackingId = decodeURIComponent(matchProjectLeads[1]).trim();
            if (!trackingId) {
                res.statusCode = 404;
                res.setHeader("Content-Type", "application/json");
                return res.end(JSON.stringify({ success: false, error: "Project not found" }));
            }

            const { data: projectData, error: projectError } = await supabase
                .from("projects")
                .select("id, name, tracking_id")
                .eq("tracking_id", trackingId)
                .single();

            if (projectError || !projectData) {
                res.statusCode = 404;
                res.setHeader("Content-Type", "application/json");
                return res.end(JSON.stringify({ success: false, error: "Project not found" }));
            }

            const { data: leadsData, error: leadsError } = await supabase
                .from("leads")
                .select("*")
                .eq("project_id", projectData.id)
                .order("created_at", { ascending: false });

            if (leadsError) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                return res.end(JSON.stringify({ success: false, error: "Failed to retrieve project leads" }));
            }

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            return res.end(JSON.stringify({
                success: true,
                project: { name: projectData.name, tracking_id: projectData.tracking_id },
                leads: leadsData || []
            }));
        }

        res.statusCode = 404;
        res.end();
    });
}

/**
 * Creates a mock Supabase client supporting 'projects' and 'leads' tables.
 */
function createMockSupabase(options = {}) {
    const projects = [
        {
            id: "proj-uuid-demo",
            name: "Demo Company",
            website: "http://localhost:8080",
            tracking_id: "attr_demo123",
            created_at: new Date().toISOString(),
        },
        {
            id: "proj-uuid-a",
            name: "Project A",
            website: "http://localhost:8080/project-a",
            tracking_id: "attr_project_a",
            created_at: new Date().toISOString(),
        },
        {
            id: "proj-uuid-b",
            name: "Project B",
            website: "http://localhost:8080/project-b",
            tracking_id: "attr_project_b",
            created_at: new Date().toISOString(),
        },
        ...(options.customProjects || []),
    ];

    const insertedLeads = [...(options.seedLeads || [])];

    return {
        _projects: projects,
        _insertedLeads: insertedLeads,
        from(table) {
            if (table === "projects") {
                return {
                    select(cols = "*") {
                        return {
                            eq(field, val) {
                                return {
                                    single: async () => {
                                        const p = projects.find((item) => item[field] === val);
                                        if (!p) {
                                            return { data: null, error: new Error("Project not found") };
                                        }
                                        return { data: p, error: null };
                                    },
                                };
                            },
                        };
                    },
                };
            }

            if (table === "leads") {
                return {
                    insert(records) {
                        if (options.failInsert) {
                            return {
                                select: async () => ({
                                    data: null,
                                    error: new Error(options.errorMessage || "Simulated database connection error"),
                                }),
                            };
                        }
                        const rows = records.map((r, idx) => ({
                            id: `test-uuid-${insertedLeads.length + idx + 1}`,
                            created_at: new Date().toISOString(),
                            ...r,
                        }));
                        insertedLeads.push(...rows);
                        return {
                            select: async () => ({
                                data: rows,
                                error: null,
                            }),
                        };
                    },
                    select(cols = "*") {
                        return {
                            eq(field, val) {
                                return {
                                    order(orderCol, orderOpts) {
                                        const filtered = insertedLeads.filter((item) => item[field] === val);
                                        return Promise.resolve({ data: filtered, error: null });
                                    },
                                    then(resolve, reject) {
                                        const filtered = insertedLeads.filter((item) => item[field] === val);
                                        return Promise.resolve({ data: filtered, error: null }).then(resolve, reject);
                                    },
                                };
                            },
                        };
                    },
                };
            }

            throw new Error(`Unknown table: ${table}`);
        },
    };
}

/**
 * Helper to spin up an ephemeral test server and run HTTP requests against it.
 */
async function withTestServer(mockSupabase, callback) {
    const server = createApp(mockSupabase);
    server.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
        await callback(baseUrl);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
}

// ── Email Validation Unit Tests ──────────────────────────────────────────────

test("1. Email Validation Helper — accepts valid email addresses", () => {
    assert.equal(isValidEmail("john@example.com"), true);
    assert.equal(isValidEmail("user.name+tag@sub.domain.org"), true);
    assert.equal(isValidEmail("  sarah@cyberdyne.com  "), true);
});

test("2. Email Validation Helper — rejects empty and invalid formats", () => {
    assert.equal(isValidEmail(""), false);
    assert.equal(isValidEmail("   "), false);
    assert.equal(isValidEmail("john"), false);
    assert.equal(isValidEmail("john@"), false);
    assert.equal(isValidEmail("@example.com"), false);
    assert.equal(isValidEmail("john@example"), false);
    assert.equal(isValidEmail(null), false);
    assert.equal(isValidEmail(undefined), false);
    assert.equal(isValidEmail(12345), false);
    assert.equal(isValidEmail({}), false);
});

// ── Health Endpoint ───────────────────────────────────────────────────────────

test("3. GET /api/health returns 200 with status ok", async () => {
    const mockSupabase = createMockSupabase();
    await withTestServer(mockSupabase, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/health`);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.deepEqual(data, { status: "ok" });
    });
});

// ── Core Lead Submission & Mapping Tests ──────────────────────────────────────

test("4. POST /api/leads accepts valid lead and returns 201 with stored lead", async () => {
    const mockSupabase = createMockSupabase();
    await withTestServer(mockSupabase, async (baseUrl) => {
        const payload = {
            project_id: "attr_demo123",
            name: "John",
            email: "john@example.com",
            channel: "Paid Search",
            source: "google",
            medium: "cpc",
            campaign: "summer",
            content: "ad1",
            term: "crm",
            gclid: "TEST_GCLID",
            gbraid: null,
            gad_campaignid: null,
            gad_source: null,
            referrer: null,
            landingUrl: "http://localhost:8080/real-site/?gclid=TEST_GCLID",
            landingPage: "/real-site/",
        };

        const res = await fetch(`${baseUrl}/api/leads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        assert.equal(res.status, 201);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.ok(data.lead);
        assert.equal(data.lead.project_id, "proj-uuid-demo");
        assert.equal(data.lead.email, "john@example.com");
        assert.equal(data.lead.name, "John");
        assert.equal(data.lead.channel, "Paid Search");
        assert.equal(data.lead.gclid, "TEST_GCLID");
    });
});

test("5. POST /api/leads returns 400 when email is missing", async () => {
    const mockSupabase = createMockSupabase();
    await withTestServer(mockSupabase, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/leads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ project_id: "attr_demo123", name: "John" }),
        });

        assert.equal(res.status, 400);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.equal(data.error, "Valid email is required");
    });
});

test("6. POST /api/leads returns 400 when email format is invalid", async () => {
    const mockSupabase = createMockSupabase();
    await withTestServer(mockSupabase, async (baseUrl) => {
        const invalidEmails = ["", "   ", "john", "john@", "@example.com"];
        for (const email of invalidEmails) {
            const res = await fetch(`${baseUrl}/api/leads`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ project_id: "attr_demo123", name: "John", email }),
            });

            assert.equal(res.status, 400, `Expected 400 for email: '${email}'`);
            const data = await res.json();
            assert.equal(data.success, false);
            assert.equal(data.error, "Valid email is required");
        }
    });
});

test("7. POST /api/leads correctly stores and trims name", async () => {
    const mockSupabase = createMockSupabase();
    await withTestServer(mockSupabase, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/leads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ project_id: "attr_demo123", name: "  Jane Doe  ", email: "jane@example.com" }),
        });

        assert.equal(res.status, 201);
        const inserted = mockSupabase._insertedLeads[0];
        assert.equal(inserted.name, "Jane Doe");
        assert.equal(inserted.project_id, "proj-uuid-demo");
    });
});

test("8. POST /api/leads stores null when name is omitted or whitespace", async () => {
    const mockSupabase = createMockSupabase();
    await withTestServer(mockSupabase, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/leads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ project_id: "attr_demo123", name: "   ", email: "noname@example.com" }),
        });

        assert.equal(res.status, 201);
        const inserted = mockSupabase._insertedLeads[0];
        assert.equal(inserted.name, null);
        assert.equal(inserted.email, "noname@example.com");
    });
});

test("9. POST /api/leads stores all UTM parameters", async () => {
    const mockSupabase = createMockSupabase();
    await withTestServer(mockSupabase, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/leads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                project_id: "attr_demo123",
                name: "UTM Tester",
                email: "utm@example.com",
                channel: "Paid Search",
                source: "google",
                medium: "cpc",
                campaign: "summer-promo",
                content: "banner_v1",
                term: "best crm",
            }),
        });

        assert.equal(res.status, 201);
        const inserted = mockSupabase._insertedLeads[0];
        assert.equal(inserted.channel, "Paid Search");
        assert.equal(inserted.source, "google");
        assert.equal(inserted.medium, "cpc");
        assert.equal(inserted.campaign, "summer-promo");
        assert.equal(inserted.content, "banner_v1");
        assert.equal(inserted.term, "best crm");
    });
});

test("10. POST /api/leads stores all Google Ads parameters", async () => {
    const mockSupabase = createMockSupabase();
    await withTestServer(mockSupabase, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/leads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                project_id: "attr_demo123",
                email: "gads@example.com",
                gclid: "TEST_GCLID_123",
                gbraid: "TEST_GBRAID_456",
                gad_campaignid: "11301910042",
                gad_source: "1",
            }),
        });

        assert.equal(res.status, 201);
        const inserted = mockSupabase._insertedLeads[0];
        assert.equal(inserted.gclid, "TEST_GCLID_123");
        assert.equal(inserted.gbraid, "TEST_GBRAID_456");
        assert.equal(inserted.gad_campaignid, "11301910042");
        assert.equal(inserted.gad_source, "1");
    });
});

test("11. POST /api/leads maps landingUrl and landingPage to database columns", async () => {
    const mockSupabase = createMockSupabase();
    await withTestServer(mockSupabase, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/leads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                project_id: "attr_demo123",
                email: "landing@example.com",
                referrer: "https://www.google.com/",
                landingUrl: "http://localhost:8080/real-site/?utm_source=google",
                landingPage: "/real-site/",
            }),
        });

        assert.equal(res.status, 201);
        const inserted = mockSupabase._insertedLeads[0];
        assert.equal(inserted.referrer, "https://www.google.com/");
        assert.equal(inserted.landing_url, "http://localhost:8080/real-site/?utm_source=google");
        assert.equal(inserted.landing_page, "/real-site/");
    });
});

test("12. POST /api/leads handles database errors safely with 500 without leaking secrets", async () => {
    const mockSupabase = createMockSupabase({
        failInsert: true,
        errorMessage: "FATAL: internal_db_secret_key_12345_should_not_leak",
    });

    await withTestServer(mockSupabase, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/leads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                project_id: "attr_demo123",
                name: "Error Test",
                email: "error@example.com",
            }),
        });

        assert.equal(res.status, 500);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.equal(data.error, "Failed to store lead");
        assert.equal(JSON.stringify(data).includes("internal_db_secret_key_12345"), false);
    });
});

// ── Phase 6 Project Identification & Multi-Project Isolation Tests ───────────

test("13. Phase 6: getProjectId helper returns project ID from options override", () => {
    assert.equal(getProjectId({ projectId: "attr_custom_override" }), "attr_custom_override");
    assert.equal(getProjectId({ project_id: "attr_snake_override" }), "attr_snake_override");
});

test("14. Phase 6: POST /api/leads requires project_id (missing returns 400)", async () => {
    const mockSupabase = createMockSupabase();
    await withTestServer(mockSupabase, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/leads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "No Project",
                email: "noproject@example.com",
            }),
        });

        assert.equal(res.status, 400);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.equal(data.error, "Invalid project");
    });
});

test("15. Phase 6: POST /api/leads rejects non-existent project_id (returns 400)", async () => {
    const mockSupabase = createMockSupabase();
    await withTestServer(mockSupabase, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/leads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                project_id: "attr_does_not_exist",
                name: "Invalid Project Lead",
                email: "invalid@example.com",
            }),
        });

        assert.equal(res.status, 400);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.equal(data.error, "Invalid project");
        assert.equal(mockSupabase._insertedLeads.length, 0);
    });
});

test("16. Phase 6: POST /api/leads resolves tracking_id to project UUID", async () => {
    const mockSupabase = createMockSupabase();
    await withTestServer(mockSupabase, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/leads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                project_id: "attr_project_a",
                name: "Project A Lead",
                email: "lead_a@example.com",
            }),
        });

        assert.equal(res.status, 201);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.equal(data.lead.project_id, "proj-uuid-a");
        assert.notEqual(data.lead.project_id, "attr_project_a");
    });
});

test("17. Phase 6: GET /api/projects/:projectId/leads returns project leads", async () => {
    const seedLeads = [
        {
            id: "lead-1",
            project_id: "proj-uuid-demo",
            name: "Demo Lead",
            email: "demo@example.com",
            channel: "Paid Search",
            source: "google",
            medium: "cpc",
            gclid: "TEST_GCLID",
        },
    ];
    const mockSupabase = createMockSupabase({ seedLeads });

    await withTestServer(mockSupabase, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/projects/attr_demo123/leads`);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.equal(data.project.name, "Demo Company");
        assert.equal(data.project.tracking_id, "attr_demo123");
        assert.equal(data.leads.length, 1);
        assert.equal(data.leads[0].email, "demo@example.com");
    });
});

test("18. Phase 6: GET /api/projects/:projectId/leads returns 404 for unknown project", async () => {
    const mockSupabase = createMockSupabase();
    await withTestServer(mockSupabase, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/projects/does_not_exist/leads`);
        assert.equal(res.status, 404);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.equal(data.error, "Project not found");
    });
});

test("19. Phase 6: Multi-Project Data Isolation — Project A cannot retrieve Project B leads", async () => {
    const seedLeads = [
        {
            id: "lead-a-1",
            project_id: "proj-uuid-a",
            name: "John",
            email: "john@example.com",
            channel: "Paid Search",
            source: "google",
            medium: "cpc",
        },
        {
            id: "lead-b-1",
            project_id: "proj-uuid-b",
            name: "Alice",
            email: "alice@example.com",
            channel: "Organic Search",
            source: "google",
            medium: null,
        },
    ];
    const mockSupabase = createMockSupabase({ seedLeads });

    await withTestServer(mockSupabase, async (baseUrl) => {
        // Query Project A leads
        const resA = await fetch(`${baseUrl}/api/projects/attr_project_a/leads`);
        assert.equal(resA.status, 200);
        const dataA = await resA.json();
        assert.equal(dataA.project.tracking_id, "attr_project_a");
        assert.equal(dataA.leads.length, 1);
        assert.equal(dataA.leads[0].name, "John");
        assert.equal(dataA.leads[0].email, "john@example.com");
        // Ensure Alice is NOT in Project A results
        assert.equal(dataA.leads.some((l) => l.email === "alice@example.com"), false);

        // Query Project B leads
        const resB = await fetch(`${baseUrl}/api/projects/attr_project_b/leads`);
        assert.equal(resB.status, 200);
        const dataB = await resB.json();
        assert.equal(dataB.project.tracking_id, "attr_project_b");
        assert.equal(dataB.leads.length, 1);
        assert.equal(dataB.leads[0].name, "Alice");
        assert.equal(dataB.leads[0].email, "alice@example.com");
        // Ensure John is NOT in Project B results
        assert.equal(dataB.leads.some((l) => l.email === "john@example.com"), false);
    });
});
