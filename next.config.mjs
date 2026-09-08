/** @type {import('next').NextConfig} */

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://api.hubapi.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co https://api.hubapi.com https://app.hubspot.com https://api.salesforce.com https://checkout.razorpay.com wss://*.supabase.co",
      "frame-src https://checkout.razorpay.com",
      "form-action 'self'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  allowedDevOrigins: ["192.168.56.1"],
  experimental: {
    cpus: 1,
    workerThreads: false,
  },

  /**
   * Redirect the legacy root-level SDK path to the versioned path.
   * Customers with the old snippet still work; new snippets use /sdk/v1/attributer.js.
   */
  async redirects() {
    return [
      {
        source: "/attributer.js",
        destination: "/sdk/v1/attributer.js",
        permanent: false, // 307 — can change version later without clients caching 301
      },
    ];
  },

  async headers() {
    return [
      // Versioned SDK: long-lived cache + open CORS (public CDN asset)
      {
        source: "/sdk/v1/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
        ],
      },

      // Security headers on all app routes
      {
        source: "/((?!sdk/).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
