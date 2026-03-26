/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    DID_API_KEY: process.env.DID_API_KEY,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    FLUX_API_KEY: process.env.FLUX_API_KEY,
  },
};

module.exports = nextConfig;
