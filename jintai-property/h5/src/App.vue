<template>
  <router-view />
</template>

<script setup lang="ts">
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  /* 禁止字体缩放 */
  -webkit-text-size-adjust: 100%;
  -ms-text-size-adjust: 100%;
  text-size-adjust: 100%;
  /* 优化滚动 */
  -webkit-overflow-scrolling: touch;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Segoe UI, Arial,
    Roboto, 'PingFang SC', 'miui', 'Hiragino Sans GB', 'Microsoft Yahei', sans-serif;
  background: var(--jintai-bg);
  /* 确保宽度不超出屏幕 */
  max-width: 100vw;
  overflow-x: hidden;
}

#app {
  min-height: 100vh;
  /* 确保宽度不超出屏幕 */
  max-width: 100vw;
  overflow-x: hidden;
}

/* 响应式图片 */
img {
  max-width: 100%;
  height: auto;
}
</style>
