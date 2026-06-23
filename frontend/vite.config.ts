import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const repoName = 'Inversiones'
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true'
const basePath = process.env.VITE_BASE_PATH

// https://vitejs.dev/config/
export default defineConfig({
  base: basePath || (isGitHubActions ? `/${repoName}/` : '/'),
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/*.d.ts',
        'src/**/test/**',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
      ],
      thresholds: {
        lines: 80,
        functions: 55,
        branches: 70,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    open: true,
  },
})
