import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ei1bcw8zdb.ufs.sh",
        pathname: "/f/**",
      },
    ],
  },
};

export default nextConfig;
