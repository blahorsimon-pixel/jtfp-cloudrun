// 兼容别名：历史上该模块叫 inventory（库存管理），现在迁移为 products（商品管理）。
// 旧路径 /api/v1/admin/inventory* 继续可用，内部实现以 products 路由为准。
export { default } from './products';

