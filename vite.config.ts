import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

/**
 * Plugin to stub out uninstalled optional dependencies from Para SDK.
 * The Para SDK bundles connectors for Solana and Cosmos, but we only
 * use EVM/Base. This plugin intercepts imports to those missing packages
 * and returns an empty module instead of crashing.
 */
function stubMissingDeps(): Plugin {
  // Broad patterns for packages we don't need (Cosmos + Solana ecosystem)
  const stubbedPatterns = [
    /^graz/,
    /^@cosmos/,
    /^cosmjs-types/,
    /^@cosmjs\//,
    /^@keplr-wallet\//,
    /^@solana\//,
    /^@solana-mobile\//,
    /^@celo\//,
  ]

  return {
    name: 'stub-missing-deps',
    enforce: 'pre',
    resolveId(id) {
      if (stubbedPatterns.some(pattern => pattern.test(id))) {
        return '\0stub:' + id
      }
    },
    load(id) {
      if (id.startsWith('\0stub:')) {
        return 'export default {}; export {};'
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    stubMissingDeps(),
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'stream', 'events', 'crypto', 'http', 'https', 'os', 'url', 'assert', 'path', 'string_decoder'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
    react(),
  ],
  build: {
    rollupOptions: {
      external: (id) => {
        if (id.includes('@solana') || id.includes('solana')) return true
        if (id.includes('graz') || id.includes('@cosmos') || id.includes('cosmjs')) return true
        if (id.includes('@keplr') || id.includes('@celo')) return true
        return false
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
    exclude: [
      '@getpara/solana-wallet-connectors',
      '@getpara/cosmos-wallet-connectors',
      '@getpara/cosmjs-v0-integration',
      '@getpara/core-components',
      '@getpara/react-components',
    ],
  },
})
