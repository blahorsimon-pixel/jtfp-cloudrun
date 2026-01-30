import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // 云托管模式使用 /admin/，本地模式使用 /JTFP/admin/
  const isCloudRun = env.VITE_CLOUD_RUN === 'true' || process.env.CLOUD_RUN === 'true'
  const base = isCloudRun ? '/admin/' : '/JTFP/admin/'
  
  return {
    plugins: [vue()],
    base,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      port: 6001,
      host: '0.0.0.0',
      allowedHosts: ['jintai.cloud'],
      proxy: {
        '/api': {
          target: 'http://localhost:6200',
          changeOrigin: true
        },
        '/JTFP/h5/images': {
          target: 'http://localhost:6200',
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets'
    }
  }
})
