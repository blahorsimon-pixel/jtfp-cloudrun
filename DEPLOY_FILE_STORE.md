# FileStore 模式部署指南（无需 MySQL）

## 概述

本项目已切换到 **FileStore** 模式，使用本地 JSON 文件存储数据，**无需配置 MySQL 数据库**。

## 部署步骤

### 1. 确认代码已提交

```bash
cd /www/wwwroot/jtfp
git status
git add .
git commit -m "feat: 切换到 FileStore 存储模式"
git push
```

### 2. 在云托管控制台配置环境变量

1. 打开微信云托管控制台：https://cloud.weixin.qq.com/cloudrun/service/express-749a
2. 点击「服务设置」标签页
3. 找到「环境变量」配置区域，点击「编辑」
4. 确保有以下环境变量：

```bash
# 必需的环境变量
NODE_ENV=production
STORAGE_DRIVER=file          # 使用 FileStore（默认值，可不设置）
JWT_SECRET=nXMe2zAurNAKlLVDdzDs2CUL6LXM5jPl5a6XCokySL4=
ADMIN_TOKEN=LLJKLJAFJKLK87987289739skjkwhhh

# 可选：自定义数据文件路径（默认：/tmp/jtfp_store.json）
FILE_STORE_PATH=/tmp/jtfp_store.json
```

5. 点击「保存」

**重要说明**：
- ✅ **不需要**配置 `MYSQL_ADDRESS`、`MYSQL_USERNAME`、`MYSQL_PASSWORD`
- ✅ **不需要**初始化 MySQL 数据库
- ✅ **不需要**执行任何 SQL 脚本

### 3. 触发部署

1. 在云托管控制台点击「部署发布」标签页
2. 点击「发布新版本」或「重新部署」
3. 选择代码分支（通常是 `main` 或 `master`）
4. 点击「确认部署」
5. 等待构建和部署完成（约 3-5 分钟）

### 4. 验证部署

部署完成后，检查服务日志：

```bash
# 在云托管控制台查看「日志」标签页
# 应看到以下日志：
# [Storage] 使用存储驱动: file
# [FileStore] 数据初始化完成，文件路径: /tmp/jtfp_store.json
# ✓ FileStore 初始化完成
# ✓ H5 Mall server listening on http://0.0.0.0:80
```

访问健康检查接口：
```bash
curl https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/health
# 应返回: {"ok":true,"env":"production"}
```

访问管理后台：
- 地址：https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/admin/
- 用户名：`admin`
- 密码：`admin123`

## 数据存储说明

### 存储位置
- 数据文件：`/tmp/jtfp_store.json`（容器内）
- 数据格式：JSON

### 数据持久化
⚠️ **重要**：数据存储在容器的 `/tmp` 目录，重启或重新部署会丢失数据。

如果需要持久化数据：
1. 使用云托管的数据卷挂载功能
2. 或定期导出 `/tmp/jtfp_store.json` 文件
3. 或切换回 MySQL 模式（设置 `STORAGE_DRIVER=mysql`）

### 数据初始化
服务首次启动时会自动创建：
- 默认分类：住宅、公寓、别墅、商铺、写字楼
- 默认管理员：用户名 `admin`，密码 `admin123`

## 回滚到 MySQL

如果需要切换回 MySQL：

1. 在云托管控制台设置环境变量：
   ```
   STORAGE_DRIVER=mysql
   DB_NAME=jtfp_property
   ```

2. 确保 MySQL 数据库已初始化（执行 `sql/cloud_init_database.sql`）

3. 重新部署服务

## 故障排查

### 问题：服务启动失败

**检查日志**：
- 查看云托管控制台的「日志」标签页
- 确认是否有错误信息

**常见原因**：
- 环境变量未正确配置
- 代码编译失败
- 端口冲突

### 问题：数据丢失

**原因**：容器重启或重新部署会清空 `/tmp` 目录

**解决**：
- 使用数据卷挂载持久化存储
- 或定期备份数据文件

### 问题：无法访问管理后台

**检查**：
1. 服务是否正常运行（查看日志）
2. 环境变量 `ADMIN_TOKEN` 是否正确
3. 前端静态资源是否正确构建

## 性能说明

- ✅ 适合数据量 ≤ 200 条的场景
- ✅ 单实例部署（不支持多实例）
- ✅ 读写性能满足小规模应用需求

## 相关文档

- 完整部署文档：`WXCLOUD_DEPLOY.md`
- 存储实现：`src/storage/file_store.ts`
- 驱动选择：`src/storage/driver.ts`
