# 微信云托管 Dockerfile - Express.js + Vue 3 前端
# 参考官方模板: WeixinCloud/wxcloudrun-express

# 使用 Alpine 基础镜像（与官方模板一致）
FROM alpine:3.13

# 设置时区为上海
RUN apk add tzdata && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && echo Asia/Shanghai > /etc/timezone

# HTTPS 证书
RUN apk add ca-certificates

# 安装 Node.js 和 npm（使用国内镜像）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tencent.com/g' /etc/apk/repositories \
    && apk add --update --no-cache nodejs npm

# 指定工作目录
WORKDIR /app

# 使用国内 npm 镜像
RUN npm config set registry https://mirrors.cloud.tencent.com/npm/

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

# 复制静态资源
COPY public ./public

# 清理不需要的文件，减小镜像体积
RUN rm -rf jintai-property/*/node_modules \
    && rm -rf jintai-property/*/src \
    && rm -rf src \
    && npm prune --production

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=80

# 启动命令（与官方模板一致，使用 npm start）
CMD ["npm", "start"]
