import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // `pg` is a native CommonJS driver. Without this, the bundler would try to
  // trace it into the server bundle and break on its dynamic requires.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
