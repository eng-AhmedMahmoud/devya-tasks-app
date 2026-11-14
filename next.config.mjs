/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server for the Docker image (Dockerfile, VPS hosting).
  output: 'standalone',
  async rewrites() {
    const upstream = process.env.API_PROXY_TARGET ?? 'https://api.devya-solutions.com';
    return [{ source: '/api/:path*', destination: `${upstream}/api/:path*` }];
  },
};
export default nextConfig;
