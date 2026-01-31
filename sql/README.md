# 数据库脚本说明

## 文件列表

### 初始化脚本

- **`cloud_init_database.sql`** ⭐ **推荐**
  - 用途：微信云托管环境的完整数据库初始化脚本
  - 包含：所有表结构 + 默认数据 + 完整字段（47个字段）
  - 使用场景：首次部署到云托管时使用
  - 特点：包含所有必需的商城字段和扩展字段

- **`init_database.sql`**
  - 用途：本地开发环境初始化（包含数据库创建）
  - 包含：CREATE DATABASE + 完整表结构
  - 使用场景：本地开发环境首次搭建

- **`quick_init.sql`**
  - 用途：快速初始化（最小化脚本）
  - 包含：基础表结构
  - 使用场景：快速测试环境搭建

- **`complete_init.sql`**
  - 用途：完整初始化（包含示例数据）
  - 包含：完整表结构 + 示例房源
  - 使用场景：需要测试数据的开发环境

### 迁移/修复脚本

- **`diagnose_missing_fields.sql`** 🔍
  - 用途：诊断 properties 表缺失的字段
  - 输出：字段检查报告，显示哪些字段缺失
  - 使用场景：出现"Unknown column"错误时
  - 使用方法：在数据库控制台执行，查看结果

- **`fix_missing_fields.sql`** 🔧
  - 用途：修复缺失的字段
  - 功能：安全添加所有可能缺失的字段（使用存储过程）
  - 特点：可重复执行，不会报错
  - 使用场景：诊断发现字段缺失后执行修复

### 历史迁移脚本

- **`create_properties_table.sql`**
  - ⚠️ 已过时，仅包含基础字段（40个），缺少商城字段
  - 不建议使用（会导致房源保存失败）

- **`alter_properties_mall.sql`**
  - 用途：为旧表添加商城字段
  - 如果使用了旧版建表脚本，需要执行此脚本

- **`add_module_config_to_properties.sql`**
  - 用途：添加模块配置字段
  - 用于支持Tab模块的显示/隐藏配置

- **`update_categories_20260129.sql`**
  - 用途：添加分类关联字段
  - 用于支持房源分类功能

### 示例数据

- **`insert_sample_properties.sql`**
  - 用途：插入示例房源数据
  - 使用场景：测试和演示

## 使用指南

### 场景1：首次部署到云托管

```bash
# 在云托管数据库控制台执行
sql/cloud_init_database.sql
```

### 场景2：房源保存失败（字段缺失）

**步骤1：诊断问题**

```bash
# 方式A：在数据库控制台执行
sql/diagnose_missing_fields.sql

# 方式B：使用迁移工具（本地）
npm run migrate:diagnose
```

**步骤2：执行修复**

```bash
# 方式A：在数据库控制台执行
sql/fix_missing_fields.sql

# 方式B：使用迁移工具（本地）
npm run migrate:fix
```

**步骤3：重启服务**

在云托管控制台重新部署服务。

### 场景3：本地开发环境搭建

```bash
# 方式A：使用 MySQL 命令行
mysql -u root -p < sql/init_database.sql

# 方式B：使用 npm scripts
npm run schema:apply
```

### 场景4：从旧版本升级

如果你的数据库是用旧版脚本创建的，需要执行迁移：

```bash
# 1. 添加商城字段
sql/alter_properties_mall.sql

# 2. 添加模块配置
sql/add_module_config_to_properties.sql

# 3. 添加分类关联
sql/update_categories_20260129.sql

# 或直接使用修复脚本（推荐）
sql/fix_missing_fields.sql
```

## 故障排查

### 错误：Unknown column 'holding_years' in 'field list'

**原因**：数据库缺少必需字段

**解决**：执行 `fix_missing_fields.sql` 修复脚本

### 错误：Table 'properties' doesn't exist

**原因**：数据库未初始化

**解决**：执行 `cloud_init_database.sql` 初始化脚本

### 如何确认数据库表结构完整？

执行诊断脚本：

```sql
SELECT COUNT(*) AS '字段总数'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'properties';
```

**预期结果**：47个字段

如果少于47个，说明有字段缺失，需要执行修复脚本。

## 数据库迁移工具

项目提供了自动化迁移工具（需要在本地环境运行）：

```bash
# 测试数据库连接
npm run migrate:test

# 诊断缺失字段
npm run migrate:diagnose

# 执行修复（添加缺失字段）
npm run migrate:fix
```

工具位置：`scripts/migrate_production_db.ts`

## 注意事项

1. **生产环境操作前备份**
   - 在执行任何迁移脚本前，建议备份数据库
   - 云托管控制台提供数据库备份功能

2. **脚本执行顺序**
   - 首次部署：使用 `cloud_init_database.sql`
   - 已有数据库：先诊断（`diagnose_missing_fields.sql`），再修复（`fix_missing_fields.sql`）

3. **修复脚本安全性**
   - `fix_missing_fields.sql` 使用存储过程实现 IF NOT EXISTS 逻辑
   - 可以重复执行，不会破坏已有数据
   - 不会删除或修改现有字段

4. **兼容性**
   - 修复脚本兼容 MySQL 5.7+
   - 云托管默认使用 MySQL 5.7

## 相关文档

- [云托管配置指南](../CLOUDRUN_SETUP_GUIDE.md)
- [开发指南](../DEVELOPMENT_GUIDE.md)
- [部署指南](../DEPLOYMENT_GUIDE.md)
