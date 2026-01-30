# 模板文件目录

此目录用于存放管理后台下载模板文件的静态资源。

## 当前模板

### property_import_template.xlsx
- **用途**：房源批量导入模板
- **位置**：管理后台 > 房源管理 > 下载模板
- **字段数**：40个
- **文件大小**：约 7.5 KB

## 访问方式

前端直接通过静态路径访问：
```
/templates/property_import_template.xlsx
```

无需后端认证，公开下载。

## 更新方法

如需更新模板文件，运行：
```bash
cd /www/wwwroot/jtfp
npx ts-node scripts/generate_property_template.ts
```

## 注意事项

1. 该目录下的文件会被 Express.js 作为静态资源提供服务
2. 修改模板文件后无需重启服务，立即生效
3. 确保文件权限允许 Web 服务器读取（644 或 755）
