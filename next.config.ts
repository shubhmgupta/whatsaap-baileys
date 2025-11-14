import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@whiskeysockets/baileys',
    'pino',
    'pino-pretty',
    'qrcode',
    'sharp',
    'jimp',
    'thread-stream'
  ],
  turbopack: {},
};

export default nextConfig;
