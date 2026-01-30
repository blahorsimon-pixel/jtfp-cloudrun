# 金泰资产严选房源系统 - 快速入门指南

## 🎯 10分钟快速部署

### 第一步：配置数据库（2分钟）

```bash
cd /www/wwwroot/JTFP/jintai-property

# 1. 导入数据库表结构
mysql -u root -p < server/database.sql
# 输入MySQL密码后，会自动创建 jintai_property 数据库和表

# 2. 配置后端环境变量
cd server
cp env.example .env

# 3. 编辑.env文件，修改数据库配置
nano .env
```

**编辑 .env 文件内容：**
```env
PORT=6000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=jintai_property

ADMIN_TOKEN=jintai_admin_2026
```

### 第二步：一键部署（5分钟）

```bash
cd /www/wwwroot/JTFP/jintai-property

# 执行一键部署脚本
./deploy.sh
```

脚本会自动完成：
- ✅ 构建后端服务
- ✅ 构建管理后台
- ✅ 构建H5商城
- ✅ 启动PM2服务

### 第三步：配置Nginx（3分钟）

```bash
# 1. 编辑Nginx配置
sudo nano /etc/nginx/sites-available/www.jintai.cloud

# 2. 在现有的 server { ... } 块中添加以下内容：
```

```nginx
# 后端API
location /JTFP/api/ {
    proxy_pass http://127.0.0.1:6000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# 管理后台
location /JTFP/admin/ {
    alias /www/wwwroot/JTFP/jintai-property/admin/dist/;
    try_files $uri $uri/ /JTFP/admin/index.html;
    index index.html;
}

# H5商城
location /JTFP/h5/ {
    alias /www/wwwroot/JTFP/jintai-property/h5/dist/;
    try_files $uri $uri/ /JTFP/h5/index.html;
    index index.html;
}
```

```bash
# 3. 测试Nginx配置
sudo nginx -t

# 4. 重载Nginx
sudo nginx -s reload
```

## ✅ 验证部署

```bash
# 1. 检查PM2服务状态
pm2 status

# 应该看到3个服务都是 online 状态：
# jintai-server  | online | 2
# jintai-admin   | online | 1  
# jintai-h5      | online | 1

# 2. 测试后端API
curl https://www.jintai.cloud/JTFP/api/health
# 应该返回：{"status":"ok","service":"金泰资产严选房源API",...}

# 3. 浏览器访问
# 管理后台：https://www.jintai.cloud/JTFP/admin/
# H5商城：https://www.jintai.cloud/JTFP/h5/
```

## 🔑 登录管理后台

1. 访问：https://www.jintai.cloud/JTFP/admin/
2. 输入账号密码：
   - 用户名：`admin`
   - 密码：`admin123`
3. 点击登录

## 📱 测试H5商城

1. 访问：https://www.jintai.cloud/JTFP/h5/
2. 手机扫码或直接在手机浏览器打开
3. 可以看到金色主题的房源列表

## 🎉 开始使用

### 管理后台操作

#### 1. 下载导入模板
- 点击"下载模板"按钮
- 获得包含40个字段的Excel模板

#### 2. 批量导入房源
- 点击"批量导入"按钮
- 选择填好的Excel文件
- 点击"确定导入"
- 等待导入完成

#### 3. 手动添加房源
- 点击"新增房源"按钮
- 填写表单（小区名称为必填项）
- 设置上架状态和推荐标识
- 点击"立即创建"

#### 4. 导出数据
- 勾选需要导出的房源
- 点击"导出选中"按钮
- 自动下载Excel文件

### H5商城效果

- 用户可以浏览所有上架的房源
- 点击房源卡片查看详细信息
- 搜索小区名称、地址、学区等
- 查看价格、户型、贷款、税费等信息

## 🔧 常见问题

### Q1: PM2服务启动失败？

```bash
# 查看错误日志
pm2 logs jintai-server --lines 50

# 常见原因：
# 1. 数据库连接失败 - 检查 server/.env 配置
# 2. 端口被占用 - 检查端口占用：netstat -tuln | grep 6000
# 3. Node版本过低 - 升级到 Node.js 16+
```

### Q2: Nginx 404错误？

```bash
# 检查文件路径是否正确
ls -la /www/wwwroot/JTFP/jintai-property/admin/dist/
ls -la /www/wwwroot/JTFP/jintai-property/h5/dist/

# 如果dist目录不存在，重新构建
cd /www/wwwroot/JTFP/jintai-property/admin
npm run build

cd /www/wwwroot/JTFP/jintai-property/h5
npm run build
```

### Q3: 管理后台无法登录？

- 默认账号：`admin`
- 默认密码：`admin123`
- Token：`jintai_admin_2026`

如果需要修改，编辑 `server/.env` 文件中的 `ADMIN_TOKEN`

### Q4: Excel导入失败？

- 确保使用官方下载的模板
- 小区名称不能为空
- Excel格式必须是.xlsx或.xls
- 文件大小不超过10MB

### Q5: H5商城显示"暂无房源"？

- 检查数据库中是否有数据：
  ```bash
  mysql -u root -p -e "USE jintai_property; SELECT COUNT(*) FROM properties WHERE status=1;"
  ```
- 确保房源的 `status` 字段设置为 1（已上架）
- 在管理后台编辑房源，设置"上架状态"为"上架"

## 📞 技术支持

如遇到其他问题，请：
1. 查看日志：`pm2 logs`
2. 检查服务状态：`pm2 status`
3. 查看Nginx错误日志：`tail -f /var/log/nginx/error.log`

## 🔄 日常运维

```bash
# 重启服务
pm2 restart jintai-server

# 查看日志
pm2 logs jintai-server --lines 100

# 数据库备份
mysqldump -u root -p jintai_property > backup_$(date +%Y%m%d).sql

# 更新代码后重新部署
cd /www/wwwroot/JTFP/jintai-property
./deploy.sh
```

---

**恭喜！您已成功部署金泰资产严选房源系统！** 🎉
