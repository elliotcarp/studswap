/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow Vercel Blob storage URLs for flat photos
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  experimental: {
    // The legal pages read legal/*.md from disk at request time (see
    // src/lib/legalContent.ts) rather than importing it, so it isn't
    // automatically picked up by build-time file tracing — include it
    // explicitly so it's present in the deployed output.
    outputFileTracingIncludes: {
      "/terms": ["./legal/**"],
      "/privacy": ["./legal/**"],
      "/peer-agreement": ["./legal/**"],
    },
  },
};

export default nextConfig;
