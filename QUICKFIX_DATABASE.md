# 快速修复：房源保存失败问题

## 问题现象

- ❌ 新建房源无法保存
- ❌ 批量导入失败
- ❌ 后端错误：`Unknown column 'holding_years' in 'field list'`

## 原因

生产数据库 `properties` 表缺少必需字段，代码中使用了这些字段但数据库中不存在。

## 快速修复步骤（5分钟）

### 方法A：云托管控制台修复（推荐）⭐

**步骤1：登录云托管控制台**

访问：https://cloud.weixin.qq.com/cloudrun/service/express-749a

**步骤2：打开数据库管理**

1. 点击左侧菜单「MySQL」
2. 选择数据库 `jtfp_property`
3. 点击「SQL窗口」

**步骤3：执行诊断脚本（可选，查看问题）**

从 `sql/diagnose_missing_fields.sql` 复制内容到SQL窗口执行，查看缺失哪些字段。

**步骤4：执行修复脚本**

**选项A（推荐）**：使用简化版脚本
- 打开 `sql/fix_missing_fields_simple.sql`
- 复制**完整内容**到SQL窗口
- 点击「执行」

**选项B**：使用完整版脚本（带详细日志）
- 打开 `sql/fix_missing_fields.sql`
- 复制**完整内容**到SQL窗口
- 点击「执行」

执行成功后会显示：`✓ 修复完成！`

**步骤5：重启服务**

1. 返回云托管控制台首页
2. 点击「部署发布」标签页
3. 点击「重新部署」
4. 等待约2-3分钟

**步骤6：验证修复**

访问管理后台，尝试创建新房源：
https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/JTFP/admin/properties/create

---

### 方法B：使用迁移工具（服务器上执行）

> ⚠️ **注意**：云托管环境会自动注入 `MYSQL_ADDRESS`、`MYSQL_USERNAME`、`MYSQL_PASSWORD` 环境变量，无需手动配置！

**适用场景**：通过 SSH 登录到服务器执行

**步骤1：在服务器上进入项目目录**

```bash
cd /www/wwwroot/jtfp
```

**步骤2：执行修复**

```bash
# 诊断问题（可选）
npm run migrate:diagnose

# 执行修复
npm run migrate:fix
```

迁移工具会自动使用云托管注入的数据库连接信息。

**步骤3：重启服务**

在云托管控制台重新部署服务。

---

## 修复后验证清单

- [ ] 服务启动日志显示：`✓ 数据库表结构检查通过`
- [ ] 可以在管理后台创建新房源
- [ ] 批量导入功能正常工作
- [ ] 已有房源数据不受影响

## 修复的字段

修复脚本会添加以下缺失字段（如果不存在）：

### 基础字段
- `holding_years` - 持有年数

### 商城字段
- `price_cent` - 价格（分）
- `cover_url` - 封面图URL
- `description` - 富文本详情
- `status` - 上架状态
- `is_featured` - 是否置顶
- `sort_order` - 排序值
- `stock` - 库存数量
- `images` - 图片集合

### 扩展字段
- `module_config` - 模块配置（JSON）
- `category_id` - 分类ID

### 索引
- `idx_status`
- `idx_is_featured`
- `idx_sort`
- `idx_category_id`

## 安全性说明

- ✅ 修复脚本使用 `IF NOT EXISTS` 逻辑，不会破坏现有数据
- ✅ 可以重复执行，不会报错
- ✅ 只添加字段，不修改或删除现有字段
- ✅ 不会影响已有房源数据

## 如何预防此问题

1. **首次部署时**，使用完整的 `sql/cloud_init_database.sql` 脚本
2. **不要使用**旧版的 `create_properties_table.sql`（缺少商城字段）
3. **代码更新后**，检查是否有新的数据库迁移脚本
4. **定期备份**数据库，以防万一

## 故障排查

### 修复后仍然保存失败

1. 检查是否已重启服务
2. 查看服务启动日志，是否显示字段检查通过
3. 在数据库中执行验证查询：
   ```sql
   SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = 'jtfp_property' 
     AND TABLE_NAME = 'properties';
   ```
   应该返回 47 个字段

### 无法连接数据库

1. 确认数据库名称为 `jtfp_property`
2. 检查云托管是否正确绑定了MySQL
3. 查看云托管控制台的数据库连接信息

### 其他字段缺失

如果修复后仍提示其他字段缺失，可能需要完全重建表：

```sql
-- 备份现有数据
CREATE TABLE properties_backup AS SELECT * FROM properties;

-- 删除旧表
DROP TABLE properties;

-- 执行完整初始化脚本
-- 从 sql/cloud_init_database.sql 复制内容执行

-- 恢复数据（需要字段映射调整）
```

> ⚠️ 重建表有风险，建议联系技术支持

## 需要帮助？

- 查看完整文档：`CLOUDRUN_SETUP_GUIDE.md`
- 查看SQL脚本说明：`sql/README.md`
- 迁移工具源码：`scripts/migrate_production_db.ts`

## 相关文件

- 诊断脚本：`sql/diagnose_missing_fields.sql`
- 修复脚本：`sql/fix_missing_fields.sql`
- 完整初始化：`sql/cloud_init_database.sql`
- 迁移工具：`scripts/migrate_production_db.ts`
