# 项目后端代码清理总结

## 清理日期
2026-01-28

## 问题描述
项目中存在两套独立的后端服务代码，导致功能重复和潜在的维护混乱：
- 主后端：`src/` 目录（端口6200）
- 重复后端：`jintai-property/server/` 目录（端口6000）

## 执行的清理步骤

### 1. 用户选择
✅ 用户选择保留主后端（方案一），因为它功能更完整，包含订单、支付、微信集成等扩展功能。

### 2. 停止服务
✅ 停止并删除了 `jintai-server` PM2进程（jintai-property的后端服务）

### 3. 删除重复代码
✅ 删除了以下目录和文件：
- `/www/wwwroot/jtfp/jintai-property/server/` - 完整的后端代码目录
- `/www/wwwroot/jtfp/jintai-property/ecosystem.config.js` - PM2配置文件

### 4. 更新配置

#### 4.1 前端开发代理配置
更新了Vite配置，将API代理从6000端口改为6200端口：
- `jintai-property/admin/vite.config.ts` - Admin管理后台
- `jintai-property/h5/vite.config.ts` - H5商城前端

#### 4.2 主后端数据库配置
更新了 `ecosystem.config.js` 中的数据库配置：
- 原配置：DB_USER=mall, DB_NAME=jtfpmall（不存在）
- 新配置：DB_USER=jintaisql, DB_NAME=jtfp_property（正确）

### 5. 重启服务
✅ 重新启动了主后端服务和前端开发服务器，使新配置生效

## 清理后的架构

### 当前运行的服务

| 服务名 | 端口 | 作用 | 状态 |
|--------|------|------|------|
| jtfp-server | 6200 | 主后端API服务（cluster模式2实例） | ✅ 正常 |
| jintai-admin | 6001 | Admin管理后台前端（Vite开发服务器） | ✅ 正常 |
| jintai-h5 | 6002 | H5商城前端（Vite开发服务器） | ✅ 正常 |

### 目录结构

```
/www/wwwroot/jtfp/
├── src/                          # 主后端代码（保留）
├── dist/                         # 主后端编译输出
├── ecosystem.config.js           # 主后端PM2配置（已更新）
├── package.json                  # 主后端依赖
├── jintai-property/
│   ├── admin/                    # 管理后台前端（保留）
│   ├── h5/                       # H5商城前端（保留）
│   ├── DEPLOYMENT_SUMMARY.md     # 文档（保留）
│   └── README.md                 # 文档（保留）
└── CLEANUP_SUMMARY.md            # 本文件
```

### API路由

#### 开发环境
- Admin前端：http://localhost:6001 → `/api/*` 代理到 http://localhost:6200
- H5前端：http://localhost:6002 → `/api/*` 代理到 http://localhost:6200

#### 生产环境（需要Nginx配置）
- `/JTFP/api/*` 应代理到 http://localhost:6200

## 验证结果

### API测试
✅ 所有主要API接口测试通过：
- 健康检查：`http://localhost:6200/health` → 正常
- 房源管理API：`/api/v1/admin/properties` → 正常（需要Authorization）
- 房源商城API：`/api/v1/properties/mall` → 正常（公开接口）

### 前端代理测试
✅ 前端开发服务器的API代理正常：
- Admin前端 → 主后端：正常
- H5前端 → 主后端：正常

## 数据库配置

当前使用的数据库：
- 主机：127.0.0.1
- 端口：3306
- 用户：jintaisql
- 数据库：jtfp_property

## 注意事项

### 1. 生产部署
生产环境不应使用Vite开发服务器（6001和6002端口），而应：
- 构建前端：`npm run build`（在admin/和h5/目录下）
- 使用Nginx托管静态文件（dist/目录）
- Nginx配置API代理到6200端口

### 2. 数据库表结构
确保 `jtfp_property` 数据库中包含完整的 `properties` 表结构，包括：
- 40个房源信息字段
- 商城相关字段（status, is_featured, cover_url, images等）
- 模块配置字段（module_config）

### 3. 备份建议
虽然已删除重复代码，但建议定期备份：
- 主后端代码（`/www/wwwroot/jtfp/src/`）
- 数据库（`jtfp_property`）
- PM2配置（`ecosystem.config.js`）

## 清理带来的改进

1. **消除混淆**：只有一套后端代码，升级时不会错乱
2. **简化维护**：减少重复代码，降低维护成本
3. **统一配置**：所有服务使用同一套数据库和配置
4. **功能完整**：保留了订单、支付、微信集成等完整功能

## 后续建议

1. 更新 `jintai-property/README.md`，反映新的架构（只有前端，后端使用主服务）
2. 配置生产环境的Nginx，确保API正确代理到6200端口
3. 如果不需要开发服务器常驻，可以停止6001和6002端口的服务
4. 定期检查数据库连接和API性能
