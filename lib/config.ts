export const config = {
  avatar: {
    provider: process.env.AVATAR_PROVIDER || "did",
    apiKey: process.env.DID_API_KEY || "",
  },
  voiceover: {
    provider: process.env.VOICEOVER_PROVIDER || "elevenlabs",
    apiKey: process.env.ELEVENLABS_API_KEY || "",
  },
  imageGeneration: {
    provider: process.env.IMAGE_PROVIDER || "flux",
    apiKey: process.env.FLUX_API_KEY || "",
  },
};

export default config;
