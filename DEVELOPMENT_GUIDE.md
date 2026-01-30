# 金泰房产项目 - 开发部署指南

本文档说明如何在本地修改代码后，自动部署到微信云托管。

---

## 一、项目架构

```
jtfp/
├── src/                      # 后端源码 (Express.js + TypeScript)
│   ├── config/               # 配置文件
│   ├── db/                   # 数据库连接
│   ├── routes/               # API 路由
│   └── server.ts             # 主入口
├── jintai-property/
│   ├── admin/                # 管理后台 (Vue 3 + Element Plus)
│   └── h5/                   # H5 商城 (Vue 3 + Vant)
├── public/                   # 静态资源（构建后的前端产物）
│   ├── admin/
│   └── h5/
├── sql/                      # 数据库脚本
├── Dockerfile                # Docker 构建配置
├── container.config.json     # 云托管配置
└── package.json              # 后端依赖
```

---

## 二、环境要求

- Node.js 18+
- npm 或 yarn
- Git
- MySQL 8.0（本地开发用）

---

## 三、本地开发

### 3.1 克隆项目

```bash
git clone https://github.com/blahorsimon-pixel/jtfp-cloudrun.git
cd jtfp-cloudrun
```

### 3.2 安装依赖

```bash
# 安装后端依赖
npm install

# 安装管理后台依赖
cd jintai-property/admin && npm install && cd ../..

# 安装 H5 商城依赖
cd jintai-property/h5 && npm install && cd ../..
```

### 3.3 本地运行

```bash
# 后端开发模式
npm run dev

# 管理后台开发模式（另开终端）
cd jintai-property/admin && npm run dev

# H5 商城开发模式（另开终端）
cd jintai-property/h5 && npm run dev
```

---

## 四、代码修改与部署流程

### 4.1 修改代码

根据需求修改对应的代码：

| 修改内容 | 文件位置 |
|---------|---------|
| 后端 API | `src/routes/` |
| 数据库配置 | `src/config/index.ts` |
| 管理后台页面 | `jintai-property/admin/src/` |
| H5 商城页面 | `jintai-property/h5/src/` |
| 环境变量 | `container.config.json` |
| Docker 构建 | `Dockerfile` |

### 4.2 本地测试

```bash
# 运行 TypeScript 编译检查
npm run build

# 运行前端构建（可选，云托管会自动构建）
cd jintai-property/admin && npm run build
cd jintai-property/h5 && npm run build
```

### 4.3 提交代码

```bash
# 查看修改的文件
git status

# 添加修改的文件
git add .

# 提交（写清楚修改内容）
git commit -m "feat: 添加XXX功能"

# 或者修复 bug
git commit -m "fix: 修复XXX问题"
```

### 4.4 推送到 GitHub（触发自动部署）

```bash
git push origin main
```

**推送后，微信云托管会自动：**
1. 检测到代码更新
2. 拉取最新代码
3. 执行 Dockerfile 构建镜像
4. 部署新版本
5. 版本号自动递增（如 express-749a-010 → express-749a-011）

---

## 五、手动发布（可选）

如果自动部署未触发，可以手动发布：

1. 登录 [微信云托管控制台](https://cloud.weixin.qq.com/cloudrun)
2. 进入服务 `express-749a`
3. 点击「部署发布」
4. 点击「发布」按钮
5. 等待构建完成（约 2-5 分钟）

---

## 六、版本管理规范

### 6.1 Git 提交信息规范

```
<type>: <description>

类型说明：
- feat: 新功能
- fix: 修复 bug
- docs: 文档更新
- style: 代码格式（不影响功能）
- refactor: 重构
- perf: 性能优化
- test: 测试
- chore: 构建/工具变动
```

### 6.2 示例

```bash
git commit -m "feat: 添加房源筛选功能"
git commit -m "fix: 修复登录页面样式问题"
git commit -m "docs: 更新部署文档"
```

---

## 七、配置说明

### 7.1 环境变量 (container.config.json)

```json
{
  "envParams": {
    "NODE_ENV": "production",
    "DB_NAME": "jtfp_property",
    "JWT_SECRET": "你的密钥"
  }
}
```

**重要：** 不要手动配置 `MYSQL_ADDRESS`、`MYSQL_USERNAME`、`MYSQL_PASSWORD`，云托管会自动注入。

### 7.2 数据库配置

数据库连接信息由云托管平台自动注入：
- `MYSQL_ADDRESS`: 数据库地址（host:port）
- `MYSQL_USERNAME`: 用户名
- `MYSQL_PASSWORD`: 密码

### 7.3 端口配置

云托管要求服务监听 80 端口，已在 `container.config.json` 中配置：

```json
{
  "containerPort": 80
}
```

---

## 八、常见问题

### Q1: 推送后没有自动部署？

**解决方案：**
1. 检查 GitHub 仓库是否绑定正确
2. 在云托管控制台手动点击「发布」

### Q2: 构建失败？

**排查步骤：**
1. 查看云托管控制台的构建日志
2. 检查 `Dockerfile` 是否正确
3. 检查 `package.json` 依赖是否完整

### Q3: API 返回 INTERNAL_ERROR？

**排查步骤：**
1. 在 DMC 控制台执行 `SELECT 1;` 唤醒数据库（MySQL 自动暂停）
2. 访问 `/debug/db` 检查数据库连接状态
3. 查看云托管日志中的详细错误信息

### Q4: 前端页面空白或 404？

**排查步骤：**
1. 检查 `public/admin/` 和 `public/h5/` 目录是否有构建产物
2. 检查 Dockerfile 中的 COPY 命令是否正确
3. 确认前端 `vite.config.ts` 中的 `base` 路径配置正确

### Q5: 数据库表不存在？

**解决方案：**
在 DMC 控制台执行 `sql/complete_init.sql` 初始化数据库。

---

## 九、服务地址

| 服务 | 地址 |
|-----|------|
| API 接口 | https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/api/v1/ |
| 管理后台 | https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/admin/ |
| H5 商城 | https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/h5/ |
| 健康检查 | https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/health |
| 数据库诊断 | https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/debug/db |

---

## 十、快速命令参考

```bash
# 一键提交并部署
git add . && git commit -m "update: 描述修改内容" && git push origin main

# 查看远程仓库
git remote -v

# 查看提交历史
git log --oneline -10

# 回滚到上一个版本（谨慎使用）
git revert HEAD
git push origin main
```

---

## 十一、联系与支持

- GitHub 仓库: https://github.com/blahorsimon-pixel/jtfp-cloudrun
- 微信云托管控制台: https://cloud.weixin.qq.com/cloudrun

---

*文档更新日期: 2026-01-30*
