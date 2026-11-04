/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // qpdf (encryption) and the background remover ship WebAssembly modules.
  webpack: (config) => {
    config.experiments = { ...(config.experiments ?? {}), asyncWebAssembly: true };
    return config;
  },
};

export default nextConfig;
