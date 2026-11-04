/** @type {import('next').NextConfig} */
import path from "node:path";

const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.experiments = {
      ...(config.experiments ?? {}),
      asyncWebAssembly: true,
    };

    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "onnxruntime-web$": path.resolve(
        "node_modules/onnxruntime-web/dist/ort.bundle.min.mjs"
      ),
      "onnxruntime-web/webgpu$": path.resolve(
        "node_modules/onnxruntime-web/dist/ort.wasm.bundle.min.mjs"
      ),
    };

    return config;
  },
};

export default nextConfig;
