const anthropicProvider = require('./anthropicProvider');
const geminiProvider = require('./geminiProvider');

// Registry of available providers.
const PROVIDERS = {
  anthropic: anthropicProvider,
  gemini: geminiProvider,
};

const PROVIDER_NAME = process.env.AI_PROVIDER || 'gemini';

function isAiConfigured() {
  if (PROVIDER_NAME === 'anthropic') {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  if (PROVIDER_NAME === 'gemini') {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  return false;
}

function getProvider() {
  const provider = PROVIDERS[PROVIDER_NAME];

  if (!provider) {
    throw new Error(
      `Unknown AI provider configured: "${PROVIDER_NAME}"`
    );
  }

  return provider;
}

module.exports = {
  getProvider,
  isAiConfigured,
  PROVIDER_NAME,
};