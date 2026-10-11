import { defineConfig } from 'vite'
import { federation } from '@module-federation/vite'

export default defineConfig({
  plugins: [
    federation({
      name: 'repro',
      filename: 'remoteEntry.js',
      dts: false,
      exposes: { './app': './src/main.js' },
      shared: {
        esmbug: { singleton: true },
        esmok: { singleton: true },
      },
    }),
  ],
  build: { target: 'esnext' },
})
