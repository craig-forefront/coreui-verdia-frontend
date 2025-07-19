import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import autoprefixer from 'autoprefixer'
import svgr from 'vite-plugin-svgr'

export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '')
  
  // Get API URLs from environment with fallbacks
  const primaryApiUrl = env.VITE_PRIMARY_API_URL || 'http://localhost:8000'
  const secondaryApiUrl = env.VITE_SECONDARY_API_URL || 'http://localhost:8001'
  
  return {
    base: './',
    build: {
      outDir: 'build',
    },
    css: {
      postcss: {
        plugins: [
          autoprefixer({})
        ],
      },
    },
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      force: true,
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    plugins: [
      svgr({ 
        exportAsDefault: true,
        svgrOptions: {
          icon: true,
        }
      }),
      react(),
    ],
    resolve: {
      alias: [
        {
          find: 'src/',
          replacement: `${path.resolve(__dirname, 'src')}/`,
        },
      ],
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss'],
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: primaryApiUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/detect': {
          target: primaryApiUrl,
          changeOrigin: true,
        },
        '/health': {
          target: primaryApiUrl,
          changeOrigin: true,
        }
      }
    },
  }
})
