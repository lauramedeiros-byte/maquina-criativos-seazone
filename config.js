import dotenv from 'dotenv';

dotenv.config();

export const config = {
  avatar: {
    provider: process.env.AVATAR_PROVIDER || 'did',
    apiKey: process.env.DID_API_KEY || '',
  },
  voiceover: {
    provider: process.env.VOICEOVER_PROVIDER || 'elevenlabs',
    apiKey: process.env.ELEVENLABS_API_KEY || '',
  },
  imageGeneration: {
    provider: process.env.IMAGE_PROVIDER || 'flux',
    apiKey: process.env.FLUX_API_KEY || '',
  },
  app: {
    verbose: process.env.VERBOSE === 'true',
    tempDir: process.env.TEMP_DIR || './temp',
    outputDir: process.env.OUTPUT_DIR || './output',
  },
};

export default config;
