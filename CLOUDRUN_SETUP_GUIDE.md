# 微信云托管配置指南

## 当前状态

✅ **服务已成功部署**
- 版本: express-749a-004
- 状态: 正常运行
- 实例: 1个
- 服务地址: https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com

✅ **前端页面可访问**
- 管理后台: https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/admin/
- H5商城: https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/h5/
- 健康检查: https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/health

⚠️ **待配置**
- 需要配置环境变量（JWT_SECRET）
- 需要初始化数据库

---

## 配置步骤

### 步骤1：配置环境变量

1. 打开微信云托管控制台: https://cloud.weixin.qq.com/cloudrun/service/express-749a

2. 点击「服务设置」标签页

3. 找到「环境变量」配置区域，点击「编辑」

4. 添加以下环境变量：

```bash
# JWT密钥（用于管理员认证）
JWT_SECRET=nXMe2zAurNAKlLVDdzDs2CUL6LXM5jPl5a6XCokySL4=
```

5. 点击「保存」

**注意**: 
- 数据库相关变量（`MYSQL_ADDRESS`、`MYSQL_USERNAME`、`MYSQL_PASSWORD`）会由云托管**自动注入**，**无需手动配置**。
- 这些变量在服务启动时自动可用，应用会自动读取并连接数据库。

---

### 步骤2：初始化数据库 ⚠️ **重要**

> **警告**: 必须使用完整的 `cloud_init_database.sql` 脚本初始化数据库！
> 
> 如果使用旧版脚本或手动建表，可能缺少必需字段，导致房源保存和批量导入失败。

#### 方式A：通过云托管控制台（推荐）

1. 在云托管控制台，点击左侧菜单「MySQL」

2. 进入数据库管理界面

3. 选择数据库 `jtfp_property`（如果不存在，先创建）

4. 点击「SQL窗口」或「执行SQL」

5. **必须使用完整的 `sql/cloud_init_database.sql` 脚本**

   你可以：
   - 直接从项目中复制 `sql/cloud_init_database.sql` 文件内容
   - 或使用下面的快速版本（包含所有必需字段）

6. 复制并执行以下SQL脚本：

```sql
-- ========== 1. 房源表 ==========
CREATE TABLE IF NOT EXISTS `properties` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  
  -- 基本信息
  `auction_time` VARCHAR(100) COMMENT '开拍时间',
  `bidding_phase` VARCHAR(50) COMMENT '竞价阶段',
  `community_name` VARCHAR(200) NOT NULL COMMENT '小区名称',
  `detail_address` TEXT COMMENT '详细地址',
  `building_area` VARCHAR(50) COMMENT '建筑面积/㎡',
  `house_type` VARCHAR(50) COMMENT '房屋户型',
  `floor_info` VARCHAR(50) COMMENT '楼层',
  `building_year` VARCHAR(50) COMMENT '建筑年份',
  `decoration_status` VARCHAR(50) COMMENT '装修情况',
  `property_status` VARCHAR(100) COMMENT '物业现状',
  `holding_years` VARCHAR(50) COMMENT '持有年数',
  `property_type` VARCHAR(50) COMMENT '物业类型',
  
  -- 价格信息
  `starting_price` VARCHAR(50) COMMENT '起拍价',
  `starting_unit_price` VARCHAR(50) COMMENT '起拍单价',
  `auction_platform` VARCHAR(100) COMMENT '竞拍平台',
  `auction_deposit` VARCHAR(50) COMMENT '竞拍保证金',
  `price_increment` VARCHAR(50) COMMENT '加价幅度',
  `evaluation_total_price` VARCHAR(50) COMMENT '评估总价',
  `evaluation_unit_price` VARCHAR(50) COMMENT '评估单价',
  
  -- 贷款信息
  `loan_70_percent` VARCHAR(50) COMMENT '7成可贷金额',
  `loan_80_percent` VARCHAR(50) COMMENT '8成可贷金额',
  `loan_90_percent` VARCHAR(50) COMMENT '9成可贷金额',
  
  -- 市场信息
  `market_total_price` VARCHAR(50) COMMENT '市场参考总价',
  `market_unit_price` VARCHAR(50) COMMENT '市场参考单价',
  `school_district` VARCHAR(200) COMMENT '学区',
  `business_circle` VARCHAR(200) COMMENT '商圈',
  `profit_space` VARCHAR(50) COMMENT '捡漏空间',
  
  -- 授权与税费
  `auth_code` VARCHAR(100) COMMENT '授权码',
  `deed_tax_rate` VARCHAR(50) COMMENT '契税率',
  `deed_tax_amount` VARCHAR(50) COMMENT '契税金额',
  `vat_rate` VARCHAR(50) COMMENT '增值税率',
  `vat_amount` VARCHAR(50) COMMENT '增值税金额',
  `income_tax_rate` VARCHAR(50) COMMENT '个税率',
  `income_tax_amount` VARCHAR(50) COMMENT '个税金额',
  
  -- 客户信息
  `customer_name` VARCHAR(100) COMMENT '客户姓名',
  `customer_phone` VARCHAR(50) COMMENT '客户联系号码',
  `customer_survey_brief` TEXT COMMENT '客户尽调简介',
  `assigned_salesman` VARCHAR(100) COMMENT '归属业务员',
  `unionID` VARCHAR(100) COMMENT 'unionID',
  `openID` VARCHAR(100) COMMENT 'OpenID',
  
  -- 商城字段
  `price_cent` INT DEFAULT 0 COMMENT '价格(分)',
  `cover_url` VARCHAR(500) COMMENT '封面图URL',
  `images` TEXT COMMENT '图片集合(JSON数组)',
  `description` LONGTEXT COMMENT '富文本详情(HTML)',
  `status` TINYINT DEFAULT 0 COMMENT '上架状态 0=下架 1=上架',
  `is_featured` TINYINT DEFAULT 0 COMMENT '是否置顶推荐',
  `sort_order` INT DEFAULT 0 COMMENT '排序值(越大越靠前)',
  `stock` INT DEFAULT 1 COMMENT '库存数量',
  `module_config` JSON DEFAULT NULL COMMENT '模块配置JSON',
  `category_id` INT DEFAULT NULL COMMENT '分类ID',
  
  -- 时间戳
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 索引
  INDEX `idx_community_name` (`community_name`),
  INDEX `idx_customer_phone` (`customer_phone`),
  INDEX `idx_auth_code` (`auth_code`),
  INDEX `idx_status` (`status`),
  INDEX `idx_is_featured` (`is_featured`),
  INDEX `idx_sort` (`is_featured`, `sort_order`),
  INDEX `idx_category_id` (`category_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='房源信息表';

-- ========== 2. 分类表 ==========
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL COMMENT '分类名称',
  `icon` VARCHAR(200) COMMENT '分类图标URL',
  `sort_order` INT DEFAULT 0 COMMENT '排序值',
  `status` TINYINT DEFAULT 1 COMMENT '状态 0=禁用 1=启用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_sort` (`sort_order`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分类表';

-- 插入默认分类
INSERT INTO `categories` (`name`, `sort_order`, `status`) VALUES
('住宅', 100, 1),
('公寓', 90, 1),
('别墅', 80, 1),
('商铺', 70, 1),
('写字楼', 60, 1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- ========== 3. 管理员表 ==========
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码',
  `token` VARCHAR(100) COMMENT '当前token',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`),
  INDEX `idx_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员表';

-- 插入默认管理员（密码：admin123）
INSERT INTO `admins` (`username`, `password`, `token`) VALUES 
('admin', 'admin123', 'jintai_admin_2026')
ON DUPLICATE KEY UPDATE `token` = 'jintai_admin_2026';

-- ========== 4. 用户表 ==========
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `openid` VARCHAR(100) NOT NULL COMMENT '微信OpenID',
  `unionid` VARCHAR(100) COMMENT '微信UnionID',
  `nickname` VARCHAR(100) COMMENT '昵称',
  `avatar_url` VARCHAR(500) COMMENT '头像URL',
  `phone` VARCHAR(20) COMMENT '手机号',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_openid` (`openid`),
  INDEX `idx_unionid` (`unionid`),
  INDEX `idx_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ========== 5. 订单表 ==========
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_no` VARCHAR(50) NOT NULL UNIQUE COMMENT '订单号',
  `user_id` INT COMMENT '用户ID',
  `property_id` INT COMMENT '房源ID',
  `amount_cent` INT NOT NULL DEFAULT 0 COMMENT '订单金额(分)',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '订单状态',
  `payment_method` VARCHAR(20) COMMENT '支付方式',
  `paid_at` TIMESTAMP NULL COMMENT '支付时间',
  `contact_name` VARCHAR(50) COMMENT '联系人姓名',
  `contact_phone` VARCHAR(20) COMMENT '联系人电话',
  `remark` TEXT COMMENT '备注',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_property_id` (`property_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- ========== 完成 ==========
SELECT '数据库初始化完成！' AS message;
```

6. 执行成功后，会显示"数据库初始化完成！"

#### 方式B：使用本地SQL文件

如果控制台不方便，也可以将 `sql/cloud_init_database.sql` 文件内容上传到云托管的SQL管理工具执行。

#### 方式C：使用数据库迁移工具（适用于已部署环境）

如果你已经部署了服务，但发现数据库表结构不完整，可以使用自动迁移工具：

1. **诊断问题**（检查缺失字段）：
```bash
npm run migrate:diagnose
```

2. **执行修复**（添加缺失字段）：
```bash
npm run migrate:fix
```

这些命令会自动连接到云托管的数据库并执行必要的表结构修复。

> **注意**: 迁移工具需要在本地环境运行，并需要配置数据库连接信息。

---

### 步骤3：重启服务

配置完环境变量和数据库后，需要重启服务以使配置生效：

1. 在云托管控制台，点击「部署发布」标签页

2. 点击「重新部署」按钮（或发布新版本）

3. 选择当前版本 express-749a-004，点击确认

4. 等待部署完成（约2-3分钟）

---

## 测试验证

### 1. 测试健康检查

```bash
curl https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/health
# 预期输出: {"ok":true,"env":"production"}
```

### 2. 测试管理后台

访问: https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/admin/

- 用户名: `admin`
- 密码: `admin123`

登录成功后应能看到管理后台界面

### 3. 测试H5商城

访问: https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/h5/

应能看到商城首页

### 4. 测试API接口

```bash
# 测试房源商城API（需要数据库）
curl https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/api/v1/properties/mall

# 测试分类API（需要token）
curl -H "Authorization: jintai_admin_2026" \
  https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/api/v1/admin/categories
```

---

## 默认账号和密码

### 管理后台

- 用户名: `admin`
- 密码: `admin123`
- Token: `jintai_admin_2026`

⚠️ **安全提醒**: 首次登录后，请立即修改管理员密码！

---

## 常见问题

### Q1: 登录时提示"数据库连接失败"

**原因**: 数据库未初始化或环境变量未配置

**解决**: 按照步骤2完成数据库初始化

### Q2: API返回"INTERNAL_ERROR"

**原因**: 数据库连接失败

**解决**: 
1. 检查数据库是否已初始化
2. 确认数据库名称为 `jtfp_property`
3. 检查云托管是否正确绑定了MySQL

### Q3: 前端页面无法加载静态资源

**原因**: Docker构建时静态资源未正确复制

**解决**: 
1. 检查 `public/admin` 和 `public/h5` 目录是否存在
2. 重新部署服务

### Q4: 房源保存失败，提示 "Unknown column 'holding_years' in 'field list'"

**原因**: 数据库表结构不完整，缺少必需字段

**表现**: 
- 新建房源无法保存
- 批量导入失败
- 后端日志显示字段不存在错误

**解决方法**:

1. **诊断问题**（推荐第一步）：
   
   登录云托管数据库控制台，执行诊断脚本：
   ```sql
   -- 从 sql/diagnose_missing_fields.sql 复制内容执行
   ```
   
   或使用迁移工具：
   ```bash
   npm run migrate:diagnose
   ```

2. **执行修复**：
   
   在云托管数据库控制台执行修复脚本：
   ```sql
   -- 从 sql/fix_missing_fields.sql 复制内容执行
   ```
   
   或使用迁移工具：
   ```bash
   npm run migrate:fix
   ```

3. **重启服务**（修复后必需）：
   
   在云托管控制台重新部署服务，使更改生效。

4. **验证修复**：
   
   - 检查服务启动日志，应显示"✓ 数据库表结构检查通过"
   - 尝试在管理后台创建新房源
   - 测试批量导入功能

**预防措施**:
- 首次部署时，**必须**使用 `sql/cloud_init_database.sql` 完整脚本初始化数据库
- 不要使用旧版 `create_properties_table.sql`（缺少商城字段）
- 更新代码后，检查是否有新的数据库迁移脚本

### Q5: 启动时显示警告 "properties 表缺失以下字段"

**原因**: 应用检测到数据库表结构不完整

**解决**: 参考 Q4 的解决方法执行数据库修复

---

## 下一步

完成配置后，你可以：

1. 登录管理后台，添加房源数据
2. 配置分类和商城设置
3. 测试H5商城展示效果
4. 如需微信支付，继续配置微信支付参数（参考 `WXCLOUD_DEPLOY.md`）

---

## 技术支持

- 部署文档: `WXCLOUD_DEPLOY.md`
- 完整SQL脚本: `sql/cloud_init_database.sql`
- 配置文件: `container.config.json`
