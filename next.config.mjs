import withSerwistInit from "@serwist/next";

const isProd = process.env.NODE_ENV === "production";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: !isProd,
});

const supabaseHost = (() => {
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
    }
  } catch {
    return "";
  }
  return "";
})();

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com https://*.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' data: blob: ${supabaseHost} https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com https://*.gstatic.com`.trim(),
  "font-src 'self' data: https://fonts.gstatic.com",
  "worker-src 'self' blob:",
  `connect-src 'self' ${supabaseHost} https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://*.googleapis.com https://*.gstatic.com`.trim(),
  "frame-src 'self' https://my.matterport.com https://matterport.com",
  "frame-ancestors 'self' https://aistudio.google.com https://*.google.com",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    const securityHeaders = [
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
    ];

    if (isProd) {
      securityHeaders.unshift({
        key: "Content-Security-Policy",
        value: cspDirectives,
      });
    }

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default isProd ? withSerwist(nextConfig) : nextConfig;
