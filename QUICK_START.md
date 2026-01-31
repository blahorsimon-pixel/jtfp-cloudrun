# 🚀 快速启动清单

完成以下3个步骤，即可开始使用系统！

---

## ✅ 第1步：配置环境变量（3分钟）

1. 打开: https://cloud.weixin.qq.com/cloudrun/service/express-749a
2. 点击「服务设置」标签
3. 找到「环境变量」，点击「编辑」
4. 添加：
   ```
   JWT_SECRET=nXMe2zAurNAKlLVDdzDs2CUL6LXM5jPl5a6XCokySL4=
   ```
5. 点击「保存」

---

## ✅ 第2步：初始化数据库（5分钟）

1. 在云托管控制台，点击左侧菜单「MySQL」
2. 选择数据库 `jtfp_property`
3. 点击「SQL窗口」或「执行SQL」
4. 复制 `CLOUDRUN_SETUP_GUIDE.md` 中的完整SQL脚本
5. 粘贴并执行
6. 看到"数据库初始化完成！"即成功

**快捷方式**: 也可以直接执行项目中的 `sql/cloud_init_database.sql` 文件

---

## ✅ 第3步：重启服务（2分钟）

1. 点击「部署发布」标签
2. 点击「重新部署」按钮
3. 选择当前版本 express-749a-004
4. 等待部署完成（约2分钟）

---

## 🎉 开始使用

配置完成后，访问以下地址：

### 管理后台
- 地址: https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/admin/
- 账号: `admin`
- 密码: `admin123`

### H5商城
- 地址: https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/h5/

### API接口
- 健康检查: https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/health
- 房源API: https://express-749a-222470-8-1400738122.sh.run.tcloudbase.com/api/v1/properties/mall

---

## ⏱️ 总耗时：约10分钟

---

## 📞 遇到问题？

查看详细文档：
- `CLOUDRUN_SETUP_GUIDE.md` - 完整配置指南
- `TEST_RESULTS.md` - 测试结果报告
- `WXCLOUD_DEPLOY.md` - 部署说明文档
