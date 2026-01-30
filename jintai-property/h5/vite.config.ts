import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from 'unplugin-vue-components/resolvers'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // 云托管模式使用 /h5/，本地模式使用 /JTFP/h5/
  const isCloudRun = env.VITE_CLOUD_RUN === 'true' || process.env.CLOUD_RUN === 'true'
  const base = isCloudRun ? '/h5/' : '/JTFP/h5/'
  
  return {
    plugins: [
      vue(),
      Components({
        resolvers: [VantResolver()]
      })
    ],
    base,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      port: 6002,
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
    preview: {
      port: 6004,
      host: '0.0.0.0',
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
