/**
 * Storage - 统一导出
 * 
 * 使用方式：
 * import { storage } from '../storage';
 * storage.properties.list(...)
 * storage.categories.findById(...)
 */

import { currentDriver, useFileStore, useMysql, initStorage } from './driver';
import * as fileStore from './file_store';

// 仓储模块
import * as propertiesRepo from './repositories/properties';
import * as categoriesRepo from './repositories/categories';
import * as usersRepo from './repositories/users';
import * as ordersRepo from './repositories/orders';
import * as productsRepo from './repositories/products';
import * as welfareCodesRepo from './repositories/welfare_codes';
import * as reviewsRepo from './repositories/reviews';
import * as adminsRepo from './repositories/admins';

// 统一存储接口
export const storage = {
  properties: propertiesRepo,
  categories: categoriesRepo,
  users: usersRepo,
  orders: ordersRepo,
  products: productsRepo,
  welfareCodes: welfareCodesRepo,
  reviews: reviewsRepo,
  admins: adminsRepo,
  
  // 底层操作（用于事务等）
  core: fileStore,
};

// 导出配置
export { currentDriver, useFileStore, useMysql, initStorage };

// 导出事务支持
export const withTransaction = fileStore.withTransaction;
