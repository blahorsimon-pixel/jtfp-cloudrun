# 房源商城改造 - 完整部署文档

## 📋 改造概述

本次改造将房源管理模块升级为商城商品系统，支持富文本图文详情录入，并开放API供H5前端商城展示。

## ✅ 已完成的工作

### 1. 数据库改造 ✓
- 创建迁移脚本: `sql/alter_properties_mall.sql`
- 已执行数据库迁移，properties表新增字段：
  - `price_cent` INT - 价格(分)
  - `cover_url` VARCHAR(500) - 封面图URL
  - `description` LONGTEXT - 富文本详情(HTML)
  - `status` TINYINT - 上架状态 (0=下架 1=上架)
  - `is_featured` TINYINT - 是否置顶推荐
  - `sort_order` INT - 排序值(越大越靠前)
  - `stock` INT - 库存数量

### 2. 后端API开发 ✓
**文件位置:**
- 管理API: `src/routes/api_v1/admin/properties.ts`
- 商城API: `src/routes/api_v1/properties_mall.ts`
- 路由注册: `src/server.ts`

**API端点:**
- `GET /api/v1/properties/mall` - 房源商品列表（支持搜索、分页）
- `GET /api/v1/properties/mall/:id` - 房源商品详情
- `POST /api/v1/admin/properties` - 创建房源（支持商品字段）
- `PUT /api/v1/admin/properties/:id` - 更新房源（支持商品字段）

### 3. H5前端开发 ✓
**文件位置:**
- 列表页: `JTFPh5-ui/src/views/PropertyMall.vue`
- 详情页: `JTFPh5-ui/src/views/PropertyDetailMall.vue`
- 路由配置: `JTFPh5-ui/src/router/index.ts`

**前端路由:**
- `/properties` - 房源商品列表
- `/property/:id` - 房源商品详情

### 4. 代码编译 ✓
- 后端TypeScript代码已编译到 `dist/` 目录
- 前端Vue代码已编译到 `JTFPh5-ui/dist/` 目录

## 🚀 服务启动步骤

### 方法一：使用Python管理脚本（推荐）

```bash
cd /www/wwwroot/JTFP
python3 manage_service.py restart
```

### 方法二：手动启动

```bash
cd /www/wwwroot/JTFP

# 1. 停止旧服务
pkill -f "node dist/index.js"
lsof -ti:3100 | xargs kill -9 2>/dev/null

# 2. 插入测试数据（首次运行）
mysql -u root h5mall < insert_test_data.sql

# 3. 启动服务
nohup node dist/index.js > logs/server.log 2>&1 &

# 4. 等待服务启动
sleep 5

# 5. 验证服务
curl http://localhost:3100/health
curl "http://localhost:3100/api/v1/properties/mall?pageSize=1"
```

## 🌐 访问地址

### 后台管理系统
- **URL**: https://www.jintai.cloud/JTFP/H5/admin/
- **功能**: 
  - 房源列表查看
  - 添加/编辑房源
  - 上传封面图
  - 富文本详情编辑
  - 上架/下架管理
  - 置顶推荐设置

### H5商城前端
- **房源列表**: https://www.jintai.cloud/h5/#/properties
- **房源详情**: https://www.jintai.cloud/h5/#/property/1

### API接口
- **列表接口**: https://www.jintai.cloud/h5/api/api/v1/properties/mall
- **详情接口**: https://www.jintai.cloud/h5/api/api/v1/properties/mall/:id

## 📝 后台管理操作指南

### 添加新房源

1. 访问后台管理: https://www.jintai.cloud/JTFP/H5/admin/
2. 点击"房源管理"菜单
3. 点击"新增房源"按钮
4. 填写表单：

**基础信息（原有字段）:**
- 小区名称（必填）
- 户型（如：3室2厅）
- 建筑面积
- 楼层信息
- 详细地址
- 学区、商圈等

**商品信息（新增字段）:**
- **售价**: 输入元为单位的价格（如：200，表示200万元）
- **封面图**: 点击上传按钮，选择图片（支持JPG/PNG/GIF/WEBP，最大5MB）
- **富文本详情**: 
  - 使用富文本编辑器编辑
  - 可插入图片、设置文字格式
  - 支持HTML标签
- **上架状态**: 
  - 0 = 下架（仅后台可见）
  - 1 = 上架（H5商城可见）
- **是否置顶**: 勾选后在列表中优先显示
- **排序值**: 数字越大越靠前
- **库存**: 默认1（房源通常为唯一）

5. 点击"保存"

### 编辑房源

1. 在房源列表中找到要编辑的房源
2. 点击"编辑"按钮
3. 修改相应字段
4. 点击"保存"

### 批量导入

1. 点击"下载模板"获取Excel模板
2. 按模板格式填写房源数据
3. 点击"导入"上传Excel文件
4. 系统自动批量创建房源

## 🎨 H5商城展示

### 列表页特性
- 卡片式布局，展示封面图
- 显示小区名称、户型、价格
- 标签展示：面积、楼层、学区等
- 置顶房源带"推荐"标签
- 支持搜索（小区名称、地址）
- 下拉加载更多

### 详情页特性
- 大图展示封面
- 价格信息突出显示
- 基本参数模块化展示
- 价格信息卡片（评估价、市场价、捡漏空间）
- 贷款参考卡片（7/8/9成可贷）
- 配套信息（学区、商圈）
- 拍卖信息（开拍时间、平台、保证金）
- 富文本详情完整渲染
- 底部联系按钮

## 🔧 故障排查

### 1. 服务无法启动

**症状**: 端口被占用
```
Error: listen EADDRINUSE: address already in use :::3100
```

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i:3100

# 杀死进程
kill -9 <PID>

# 或使用脚本
python3 manage_service.py restart
```

### 2. API返回404

**症状**: `Cannot GET /api/v1/properties/mall`

**检查步骤**:
1. 确认服务已启动: `curl http://localhost:3100/health`
2. 检查路由注册: `grep "properties/mall" dist/server.js`
3. 查看服务日志: `tail -50 logs/server.log`

### 3. API返回500

**症状**: `{"code":"INTERNAL_ERROR"}`

**检查步骤**:
1. 查看详细错误: `tail -100 logs/server.log`
2. 检查数据库连接: `mysql -u root h5mall -e "SELECT 1"`
3. 验证表结构: `mysql -u root h5mall -e "DESC properties"`

### 4. 前端页面空白

**检查步骤**:
1. 打开浏览器控制台查看错误
2. 确认前端已编译: `ls JTFPh5-ui/dist/assets/`
3. 检查路由配置: `grep "PropertyMall" JTFPh5-ui/dist/assets/*.js`

### 5. 图片无法上传

**检查步骤**:
1. 确认上传目录存在: `ls -la /www/wwwroot/H5/h5-ui/dist/images/uploads/`
2. 检查目录权限: `chmod 755 /www/wwwroot/H5/h5-ui/dist/images/uploads/`
3. 查看上传API日志

## 📊 测试数据

系统提供了3条测试房源数据（执行 `insert_test_data.sql`）:

1. **金泰花园** - 3室2厅，120㎡，置顶推荐
2. **阳光新城** - 2室1厅，85㎡，普通房源
3. **江景豪庭** - 4室2厅，180㎡，豪华复式

## 🔄 重新编译

如果修改了代码，需要重新编译：

### 后端
```bash
cd /www/wwwroot/JTFP
npm run build
python3 manage_service.py restart
```

### 前端
```bash
cd /www/wwwroot/JTFP/JTFPh5-ui
npm run build
```

## 📦 文件清单

### 新增文件
- `sql/alter_properties_mall.sql` - 数据库迁移脚本
- `sql/insert_test_data.sql` - 测试数据
- `src/routes/api_v1/properties_mall.ts` - 商城API
- `JTFPh5-ui/src/views/PropertyMall.vue` - 列表页
- `JTFPh5-ui/src/views/PropertyDetailMall.vue` - 详情页
- `manage_service.py` - 服务管理脚本
- `DEPLOYMENT_GUIDE.md` - 部署指南
- `README_DEPLOYMENT.md` - 本文档

### 修改文件
- `src/routes/api_v1/admin/properties.ts` - 支持商品字段
- `src/server.ts` - 注册新路由
- `JTFPh5-ui/src/router/index.ts` - 添加前端路由

## ✨ 功能特性

### 后台管理
- ✅ 房源CRUD操作
- ✅ 图片上传（封面图）
- ✅ 富文本编辑器（支持图文混排）
- ✅ 上架/下架管理
- ✅ 置顶推荐设置
- ✅ 排序控制
- ✅ Excel批量导入

### H5商城
- ✅ 响应式卡片布局
- ✅ 搜索功能
- ✅ 分页加载
- ✅ 详情页完整展示
- ✅ 富文本渲染
- ✅ 模块化信息展示

### API接口
- ✅ RESTful设计
- ✅ 分页支持
- ✅ 关键词搜索
- ✅ 只返回上架房源
- ✅ 按置顶和排序排列

## 🎯 下一步建议

1. **数据录入**: 通过后台管理添加真实房源数据
2. **样式调整**: 根据品牌VI调整H5商城配色和样式
3. **功能增强**: 
   - 添加房源收藏功能
   - 添加在线预约看房
   - 添加分享功能
4. **性能优化**: 
   - 图片CDN加速
   - API缓存
   - 前端懒加载

## 📞 技术支持

如遇问题，请检查：
1. 服务日志: `/www/wwwroot/JTFP/logs/server.log`
2. 数据库连接
3. 端口占用情况

---

**改造完成时间**: 2026-01-21  
**版本**: v1.0.0  
**状态**: ✅ 开发完成，待手动启动服务验证
