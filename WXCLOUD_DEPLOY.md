# 微信云托管部署指南

## 一、云托管环境信息

- **域名**: `https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com`
- **数据库账号**: `root`
- **数据库密码**: `M7XM48Kd`

---

## 二、部署步骤

### 步骤 1：初始化数据库

1. 登录微信云托管控制台
2. 进入「数据库」-「MySQL」
3. 创建数据库 `jtfp_property`（或使用默认数据库）
4. 在 SQL 执行器中执行 `sql/cloud_init_database.sql` 脚本
5. 记录数据库内网地址（格式：`10.x.x.x:3306` 或 `mysql.xxx.tcloudbase.com:3306`）

### 步骤 2：配置 Git 仓库

云托管已绑定仓库 `WeixinCloud/wxcloudrun-express`，你需要：

**方式 A：Fork 官方仓库（推荐）**
1. 在 GitHub 上 Fork `WeixinCloud/wxcloudrun-express` 到你的账号
2. 将本项目代码推送到你 Fork 的仓库
3. 在云托管控制台修改代码来源为你的 Fork 仓库

**方式 B：创建新仓库**
1. 创建一个新的 Git 仓库
2. 将本项目代码推送到新仓库
3. 在云托管控制台「服务」-「代码来源」中重新绑定

**推送代码命令：**
```bash
cd /www/wwwroot/jtfp
git init
git add .
git commit -m "feat: 适配微信云托管部署"
git remote add origin <你的Git仓库地址>
git branch -M main
git push -u origin main
```

### 步骤 3：配置环境变量

在云托管控制台「服务设置」-「环境变量」中添加：

| 变量名 | 值 | 说明 |
|--------|----|----|
| `NODE_ENV` | `production` | 生产环境 |
| `PORT` | `80` | 服务端口 |
| `DB_NAME` | `jtfp_property` | 数据库名 |
| `JWT_SECRET` | `你的密钥` | JWT 签名密钥 |
| `ADMIN_TOKEN` | `你的管理员Token` | 管理后台认证 |

> 注意：`MYSQL_ADDRESS`、`MYSQL_USERNAME`、`MYSQL_PASSWORD` 由云托管自动注入，无需手动配置。

### 步骤 4：（可选）配置微信支付

如果需要微信支付功能，需要配置以下环境变量：

| 变量名 | 说明 |
|--------|------|
| `WECHAT_MP_APPID` | 公众号 AppID |
| `WECHAT_MP_SECRET` | 公众号 AppSecret |
| `WECHAT_MINI_APPID` | 小程序 AppID |
| `WECHAT_MINI_SECRET` | 小程序 AppSecret |
| `WX_MCH_ID` | 商户号 |
| `WX_CERT_SERIAL_NO` | 商户证书序列号 |
| `WX_API_V3_KEY` | API v3 密钥 |
| `WX_PRIVATE_KEY_CONTENT` | 商户私钥（Base64 编码）|
| `WX_PLATFORM_CERT_CONTENT` | 平台证书（Base64 编码）|

**证书 Base64 编码方法**：
```bash
# Linux/Mac
cat apiclient_key.pem | base64 -w 0

# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("apiclient_key.pem"))
```

### 步骤 5：触发部署

1. 在云托管控制台点击「发布」
2. 选择版本并确认
3. 等待构建和部署完成（约 3-5 分钟）

---

## 三、访问地址

部署成功后，可通过以下地址访问：

| 模块 | 地址 |
|------|------|
| API 健康检查 | `https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/health` |
| 管理后台 | `https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/admin/` |
| H5 商城 | `https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/h5/` |

---

## 四、本地开发

本地开发时，现有服务不受影响：
- Admin: `http://localhost:6001/JTFP/admin/`
- H5: `http://localhost:6002/JTFP/h5/`
- API: `http://localhost:6200/`

---

## 五、目录结构

```
├── Dockerfile              # Docker 构建文件
├── container.config.json   # 云托管配置
├── .dockerignore          # Docker 忽略文件
├── src/                   # 后端源码
├── jintai-property/
│   ├── admin/             # Admin 前端
│   └── h5/                # H5 前端
├── public/                # 静态文件（构建后）
│   ├── admin/             # Admin 构建产物
│   └── h5/                # H5 构建产物
└── sql/
    └── cloud_init_database.sql  # 云托管数据库初始化脚本
```

---

## 六、常见问题

### Q: 部署后访问返回 502
A: 检查环境变量配置是否正确，特别是数据库连接信息。查看云托管日志排查。

### Q: 前端资源 404
A: 确保 Dockerfile 正确复制了前端构建产物到 `public/admin` 和 `public/h5` 目录。

### Q: 数据库连接失败
A: 云托管会自动注入 `MYSQL_ADDRESS` 等环境变量，确保代码正确解析这些变量。

### Q: 如何查看日志
A: 在云托管控制台「服务」-「日志」中查看运行日志。

---

## 七、回滚

如需回滚到之前版本：
1. 进入云托管控制台「版本管理」
2. 选择要回滚的版本
3. 点击「流量切换」将 100% 流量切到该版本
