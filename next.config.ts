import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// Minimal shapes of the webpack APIs used below (Next bundles webpack without public types).
type Compilation = {
  hooks: { processAssets: { tap(options: { name: string; stage: number }, fn: () => void): void } };
  getAsset(name: string): unknown;
  emitAsset(name: string, source: unknown): void;
};
type Compiler = {
  outputPath: string;
  webpack: {
    Compilation: { PROCESS_ASSETS_STAGE_ADDITIONAL: number };
    sources: { RawSource: new (buffer: Buffer) => unknown };
  };
  hooks: { thisCompilation: { tap(name: string, fn: (compilation: Compilation) => void): void } };
};

const securityHeaders = [
  // Don't let other sites frame ours (clickjacking); CSP frame-ancestors is the modern form.
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Razorpay Checkout may use the Payment Request API inside its iframe.
  {
    key: "Permissions-Policy",
    value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com")',
  },
  // Browsers only honour this over HTTPS, so it is harmless in local development.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const PRISMA_CLIENT_DIR = path.join(process.cwd(), "lib", "generated", "prisma");

/**
 * The Prisma client is generated into lib/generated/prisma (custom output), so
 * Next's server bundles don't carry its query-engine binary. At runtime on
 * Vercel, Prisma looks for it in `.next/server/chunks` — copy it there.
 * (Without this every database-backed page fails with "Prisma Client could
 * not locate the Query Engine for runtime rhel-openssl-3.0.x".)
 */
class CopyPrismaEnginePlugin {
  apply(compiler: Compiler) {
    const { Compilation, sources } = compiler.webpack;
    compiler.hooks.thisCompilation.tap("CopyPrismaEnginePlugin", (compilation) => {
      compilation.hooks.processAssets.tap(
        { name: "CopyPrismaEnginePlugin", stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
        () => {
          if (!fs.existsSync(PRISMA_CLIENT_DIR)) return;
          for (const file of fs.readdirSync(PRISMA_CLIENT_DIR)) {
            // Engine libraries only (skip half-written *.node.tmp files).
            if (!file.endsWith(".node")) continue;
            // Next's server compiler may already emit into `.next/server/chunks`.
            const asset = path.basename(compiler.outputPath) === "chunks" ? file : `chunks/${file}`;
            if (compilation.getAsset(asset)) continue;
            compilation.emitAsset(asset, new sources.RawSource(fs.readFileSync(path.join(PRISMA_CLIENT_DIR, file))));
          }
        }
      );
    });
  }
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Only hosts we trust are optimised; other admin-entered URLs render
    // unoptimised (see components/SmartImage.tsx) so the optimiser can't be
    // used as an open image proxy.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  // Make sure the copied engine ships with every server function.
  outputFileTracingIncludes: {
    "/**": ["./.next/server/chunks/*.node"],
  },
  webpack(config, { isServer, nextRuntime }) {
    if (isServer && nextRuntime === "nodejs") {
      config.plugins.push(new CopyPrismaEnginePlugin());
    }
    return config;
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
