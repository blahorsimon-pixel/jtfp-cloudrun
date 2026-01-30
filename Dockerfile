# 微信云托管 Dockerfile - Express.js + Vue 3 前端
# 使用 Node.js 18 官方镜像

FROM node:18-alpine

# 设置时区为上海
RUN apk add --no-cache tzdata && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && echo Asia/Shanghai > /etc/timezone

# 指定工作目录
WORKDIR /app

# 使用国内 npm 镜像
RUN npm config set registry https://registry.npmmirror.com/

# ============ 复制静态资源（先复制，避免被覆盖） ============
COPY public ./public

# ============ 安装后端依赖并构建 ============
COPY package*.json ./
RUN npm install

COPY src ./src
COPY tsconfig.json ./
RUN npm run build

# ============ 构建 Admin 前端 ============
COPY jintai-property/admin ./jintai-property/admin
WORKDIR /app/jintai-property/admin
RUN npm install && CLOUD_RUN=true npm run build
WORKDIR /app

# ============ 构建 H5 前端 ============
COPY jintai-property/h5 ./jintai-property/h5
WORKDIR /app/jintai-property/h5
RUN npm install && CLOUD_RUN=true npm run build
WORKDIR /app

# ============ 整理产物 ============
# 复制前端构建产物到 public 目录
RUN mkdir -p public/admin public/h5 \
    && cp -r jintai-property/admin/dist/* public/admin/ \
    && cp -r jintai-property/h5/dist/* public/h5/

# 清理不需要的文件，减小镜像体积
RUN rm -rf jintai-property/*/node_modules \
    && rm -rf jintai-property/*/src \
    && rm -rf src \
    && npm prune --production

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=80

# 启动命令
CMD ["npm", "start"]
