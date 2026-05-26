/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    // server actions are on by default in 15; keep this block for future flags
  },
};

export default nextConfig;
