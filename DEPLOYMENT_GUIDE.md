# 房源商城部署指南

## 当前状态

由于Shell会话异常，需要手动执行以下步骤来启动服务。

## 快速启动步骤

### 1. 插入测试数据

```bash
cd /www/wwwroot/JTFP
mysql -u root h5mall < insert_test_data.sql
```

### 2. 启动后端服务

```bash
cd /www/wwwroot/JTFP

# 停止旧服务
pkill -f "node dist/index.js"
lsof -ti:3100 | xargs kill -9 2>/dev/null

# 启动新服务
nohup node dist/index.js > logs/server.log 2>&1 &

# 等待3秒
sleep 3

# 验证服务
curl http://localhost:3100/health
```

### 3. 测试API

```bash
# 测试房源列表API
curl "http://localhost:3100/api/v1/properties/mall?pageSize=10"

# 测试房源详情API
curl "http://localhost:3100/api/v1/properties/mall/1"
```

## 访问地址

### 后台管理
- URL: https://www.jintai.cloud/JTFP/H5/admin/
- 功能: 房源管理、添加/编辑房源、上传图片

### H5商城
- 房源列表: https://www.jintai.cloud/h5/#/properties
- 房源详情: https://www.jintai.cloud/h5/#/property/1

### API接口
- 列表: https://www.jintai.cloud/h5/api/api/v1/properties/mall
- 详情: https://www.jintai.cloud/h5/api/api/v1/properties/mall/:id

## 数据库表结构

properties表新增字段：
- `price_cent` INT - 价格(分)
- `cover_url` VARCHAR(500) - 封面图URL
- `description` LONGTEXT - 富文本详情(HTML)
- `status` TINYINT - 上架状态 (0=下架 1=上架)
- `is_featured` TINYINT - 是否置顶推荐
- `sort_order` INT - 排序值
- `stock` INT - 库存数量

## 后台管理操作指南

### 添加新房源

1. 登录后台: https://www.jintai.cloud/JTFP/H5/admin/
2. 进入"房源管理"模块
3. 点击"新增房源"
4. 填写基本信息：
   - 小区名称（必填）
   - 户型、面积、楼层等
5. 填写商品信息：
   - 售价（元）
   - 上传封面图
   - 富文本详情（支持图片、格式化文字）
   - 上架状态
   - 是否置顶
6. 保存

### 编辑房源

1. 在房源列表中找到要编辑的房源
2. 点击"编辑"按钮
3. 修改信息后保存

### 上传图片

- 封面图：在房源编辑页面上传
- 详情图：在富文本编辑器中插入图片
- 支持格式：JPG, PNG, GIF, WEBP
- 大小限制：5MB

## H5商城功能

### 房源列表页 (/properties)
- 展示所有上架的房源
- 支持搜索（小区名称、地址）
- 显示封面图、标题、价格、标签
- 置顶房源优先显示

### 房源详情页 (/property/:id)
- 完整房源信息
- 富文本详情展示
- 价格信息、贷款参考
- 配套信息、拍卖信息
- 联系按钮

## 故障排查

### 服务无法启动

1. 检查端口占用：
```bash
lsof -i:3100
```

2. 查看错误日志：
```bash
tail -50 /www/wwwroot/JTFP/logs/server.log
```

3. 检查数据库连接：
```bash
mysql -u root h5mall -e "SELECT 1"
```

### API返回404

1. 确认服务已启动
2. 检查路由注册：
```bash
grep "properties/mall" /www/wwwroot/JTFP/dist/server.js
```

### 前端页面空白

1. 检查前端编译：
```bash
cd /www/wwwroot/JTFP/JTFPh5-ui
npm run build
```

2. 检查路由配置：
```bash
grep "PropertyMall" /www/wwwroot/JTFP/JTFPh5-ui/dist/assets/*.js
```

## 已完成的改造

✅ 数据库迁移
✅ 后端管理API支持商品字段
✅ 房源商城公开API
✅ H5前端列表页和详情页
✅ 路由配置
✅ 代码编译

## 下一步

1. 手动执行上述启动步骤
2. 访问后台添加房源数据
3. 访问H5商城验证展示效果
4. 根据实际需求调整样式和功能
