import type { NextConfig } from "next";

type ImageProtocol = "http" | "https";

function getSupabaseImageOrigin(): {
  protocol: ImageProtocol;
  hostname: string;
  port: string;
} {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!configuredUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is required to configure Supabase Storage images."
    );
  }

  let url: URL;

  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.");
  }

  const isLocal = ["localhost", "127.0.0.1"].includes(url.hostname);

  if (
    url.protocol !== "https:" &&
    !(isLocal && url.protocol === "http:")
  ) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must use HTTPS outside local development."
    );
  }

  return {
    protocol: url.protocol.slice(0, -1) as ImageProtocol,
    hostname: url.hostname,
    port: url.port,
  };
}

const supabaseImageOrigin = getSupabaseImageOrigin();

const nextConfig: NextConfig = {
  reactCompiler: true,

  images: {
    remotePatterns: [
      {
        ...supabaseImageOrigin,
        pathname: "/storage/v1/object/public/product-images/**",
      },
    ],
  },
};

export default nextConfig;
