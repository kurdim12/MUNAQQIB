/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle for container hosts (Railway/Docker).
  output: "standalone",
  // D1/R2 secrets are read server-side only; nothing here is exposed to the client.
};

export default nextConfig;
