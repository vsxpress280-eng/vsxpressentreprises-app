import path from 'node:path'
import react from '@vitejs/plugin-react'
import { createLogger, defineConfig } from 'vite'

const isDev = process.env.NODE_ENV !== 'production'

async function loadDevPlugins() {
  if (!isDev) return []
  try {
    const inlineEditPlugin = (await import('./plugins/visual-editor/vite-plugin-react-inline-editor.js')).default
    const editModeDevPlugin = (await import('./plugins/visual-editor/vite-plugin-edit-mode.js')).default
    const iframeRouteRestorationPlugin = (await import('./plugins/vite-plugin-iframe-route-restoration.js')).default
    const selectionModePlugin = (await import('./plugins/selection-mode/vite-plugin-selection-mode.js')).default
    return [
      inlineEditPlugin(),
      editModeDevPlugin(),
      iframeRouteRestorationPlugin(),
      selectionModePlugin(),
    ]
  } catch {
    // Sur Codemagic (CI), si /plugins n’existe pas, on build quand même
    return []
  }
}

console.warn = () => {}

const logger = createLogger()
const loggerError = logger.error

logger.error = (msg, options) => {
  if (options?.error?.toString()?.includes('CssSyntaxError: [postcss]')) return
  loggerError(msg, options)
}

export default defineConfig(async () => {
  const devPlugins = await loadDevPlugins()

  return {
    customLogger: logger,
    plugins: [...devPlugins, react()],
    server: {
      cors: true,
      headers: { 'Cross-Origin-Embedder-Policy': 'credentialless' },
      allowedHosts: true,
    },
    resolve: {
      extensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
      alias: { '@': path.resolve(__dirname, './src') },
    },
    build: {
      rollupOptions: {
        external: ['@babel/parser', '@babel/traverse', '@babel/generator', '@babel/types'],
      },
    },
  }
})
