# 🚀 快速启动指南

## 第一步：配置数据库

```bash
# 1. 创建数据库并导入表结构
mysql -u root -p < /www/wwwroot/JTFP/jintai-property/server/database.sql

# 2. 配置后端环境变量
cd /www/wwwroot/JTFP/jintai-property/server
cat > .env << EOF
PORT=6000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=jintai_property
ADMIN_TOKEN=jintai_admin_2026
EOF
```

## 第二步：开发模式测试

```bash
# 在3个终端中分别运行：

# 终端1 - 后端API
cd /www/wwwroot/JTFP/jintai-property/server
npm run dev

# 终端2 - 管理后台
cd /www/wwwroot/JTFP/jintai-property/admin
npm run dev

# 终端3 - H5商城
cd /www/wwwroot/JTFP/jintai-property/h5
npm run dev
```

访问测试：
- 后端健康检查: http://localhost:6000/health
- 管理后台: http://localhost:6001 (账号: admin / admin123)
- H5商城: http://localhost:6002

## 第三步：生产部署

```bash
# 一键部署
cd /www/wwwroot/JTFP/jintai-property
./deploy.sh
```

## 第四步：配置Nginx

```bash
# 1. 编辑Nginx配置
sudo nano /etc/nginx/sites-available/www.jintai.cloud

# 2. 在 server 块中添加以下配置（参考 nginx.conf.example）：

location /JTFP/api/ {
    proxy_pass http://127.0.0.1:6000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /JTFP/admin/ {
    alias /www/wwwroot/JTFP/jintai-property/admin/dist/;
    try_files $uri $uri/ /JTFP/admin/index.html;
}

location /JTFP/h5/ {
    alias /www/wwwroot/JTFP/jintai-property/h5/dist/;
    try_files $uri $uri/ /JTFP/h5/index.html;
}

# 3. 测试并重载Nginx
sudo nginx -t
sudo nginx -s reload
```

## 第五步：验证部署

```bash
# 检查PM2状态
pm2 status

# 访问生产环境
# 管理后台: https://www.jintai.cloud/JTFP/admin/
# H5商城: https://www.jintai.cloud/JTFP/h5/
# API健康检查: https://www.jintai.cloud/JTFP/api/health
```

## 常见问题

### 1. 端口被占用
```bash
# 检查端口占用
netstat -tuln | grep -E ':(6000|6001|6002)'
# 或
lsof -i :6000
```

### 2. 数据库连接失败
- 检查 MySQL 是否运行: `systemctl status mysql`
- 检查 `.env` 文件中的数据库密码
- 确认数据库 `jintai_property` 已创建

### 3. PM2启动失败
```bash
# 查看详细日志
pm2 logs jintai-server --lines 50

# 重启服务
pm2 restart all
```

### 4. Nginx 404错误
- 确认 dist 目录已构建: `ls -la admin/dist h5/dist`
- 检查 alias 路径是否正确
- 确认 Nginx 有读取权限

## 🎉 完成！

系统部署完成后，您可以：
1. 访问管理后台录入房源数据
2. 使用Excel批量导入功能
3. 在H5商城查看上架的房源
