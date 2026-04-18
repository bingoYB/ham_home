import { vi } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const projectRoot = path.resolve(__dirname);
const envFile = path.resolve(projectRoot, '.env.test');
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

export const testConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.TEST_MODEL || 'gpt-4',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
    model: process.env.TEST_MODEL || 'claude-3-sonnet-20240229',
  },
  agentUrl: process.env.TEST_AGENT_URL || '',
};

vi.stubEnv('OPENAI_API_KEY', testConfig.openai.apiKey);
vi.stubEnv('ANTHROPIC_API_KEY', testConfig.anthropic.apiKey);
