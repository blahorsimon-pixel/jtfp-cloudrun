/**
 * Orders Repository - 订单仓储
 */

import * as store from '../file_store';

export interface Order {
  id: number;
  order_no: string;
  user_id?: number;
  property_id?: number;
  type?: string;
  status: string;
  total_amount: number;
  goods_amount?: number;
  freight_amount?: number;
  discount_amount?: number;
  manual_adjust_amount?: number;
  points_cost?: number;
  address_snapshot?: string;
  invite_code?: string;
  buyer_note?: string;
  payment_method?: string;
  paid_at?: string;
  contact_name?: string;
  contact_phone?: string;
  remark?: string;
  version?: number;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id: number;
  order_no: string;
  sku_id?: number;
  product_id?: number;
  sku_code?: string;
  sku_title?: string;
  sku_cover?: string;
  sku_spec?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at?: string;
}

export interface OrderChangeLog {
  id: number;
  order_no: string;
  field_name: string;
  old_value?: string;
  new_value?: string;
  operator?: string;
  created_at?: string;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  orderNo?: string;
  phone?: string;
  startAt?: string;
  endAt?: string;
  userId?: number;
}

/**
 * 生成订单号
 */
export function generateOrderNo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}${random}`;
}

/**
 * 获取订单列表（分页）
 */
export function list(query: ListQuery): { total: number; orders: any[] } {
  let rows = store.getTable<Order>('orders');
  
  // 筛选
  if (query.status) {
    rows = rows.filter(r => r.status === query.status);
  }
  if (query.orderNo) {
    rows = rows.filter(r => r.order_no.includes(query.orderNo!));
  }
  if (query.userId) {
    rows = rows.filter(r => r.user_id === query.userId);
  }
  if (query.phone) {
    const kw = query.phone;
    rows = rows.filter(r => {
      if (!r.address_snapshot) return false;
      try {
        const addr = JSON.parse(r.address_snapshot);
        return addr.phone?.includes(kw);
      } catch {
        return false;
      }
    });
  }
  if (query.startAt) {
    rows = rows.filter(r => r.created_at && r.created_at >= query.startAt!);
  }
  if (query.endAt) {
    rows = rows.filter(r => r.created_at && r.created_at <= query.endAt!);
  }
  
  const total = rows.length;
  
  // 排序：created_at DESC
  rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  
  // 分页
  const page = query.page || 1;
  const pageSize = Math.min(query.pageSize || 20, 100);
  const offset = (page - 1) * pageSize;
  const paginated = rows.slice(offset, offset + pageSize);
  
  // 关联用户信息
  const users = store.getTable<any>('users');
  const userMap = new Map(users.map(u => [u.id, u]));
  
  const ordersWithUser = paginated.map(order => {
    const user = order.user_id ? userMap.get(order.user_id) : null;
    let addressData: any = {};
    if (order.address_snapshot) {
      try {
        addressData = JSON.parse(order.address_snapshot);
      } catch {}
    }
    return {
      ...order,
      user_nickname: user?.nickname || null,
      user_phone: user?.phone || addressData.phone || null,
      address_name: addressData.name || null,
      address_phone: addressData.phone || null,
      address_detail: addressData.detail || null,
    };
  });
  
  return { total, orders: ordersWithUser };
}

/**
 * 根据订单号获取订单
 */
export function findByOrderNo(orderNo: string): Order | null {
  return store.findOne<Order>('orders', r => r.order_no === orderNo);
}

/**
 * 根据 ID 获取订单
 */
export function findById(id: number): Order | null {
  return store.findById<Order>('orders', id);
}

/**
 * 创建订单
 */
export function create(data: Partial<Order>): Order {
  const orderNo = data.order_no || generateOrderNo();
  return store.insert<Partial<Order>>('orders', {
    ...data,
    order_no: orderNo,
    status: data.status || 'pending',
    total_amount: data.total_amount || 0,
    version: 0,
  }) as Order;
}

/**
 * 更新订单
 */
export function update(orderNo: string, data: Partial<Order>): boolean {
  const order = findByOrderNo(orderNo);
  if (!order) return false;
  return store.update('orders', order.id, data);
}

/**
 * 更新订单状态
 */
export function updateStatus(orderNo: string, status: string, extraData?: Partial<Order>): boolean {
  const order = findByOrderNo(orderNo);
  if (!order) return false;
  return store.update('orders', order.id, { status, ...extraData });
}

/**
 * 删除订单
 */
export function remove(orderNo: string): boolean {
  const order = findByOrderNo(orderNo);
  if (!order) return false;
  // 同时删除订单项
  store.removeWhere<OrderItem>('order_items', r => r.order_no === orderNo);
  return store.remove('orders', order.id);
}

/**
 * 获取订单项
 */
export function getOrderItems(orderNo: string): OrderItem[] {
  return store.findAll<OrderItem>('order_items', r => r.order_no === orderNo);
}

/**
 * 添加订单项
 */
export function addOrderItem(item: Partial<OrderItem>): OrderItem {
  return store.insert<Partial<OrderItem>>('order_items', item) as OrderItem;
}

/**
 * 记录订单变更日志
 */
export function logChange(orderNo: string, fieldName: string, oldValue: string, newValue: string, operator?: string): void {
  store.insert<Partial<OrderChangeLog>>('order_change_logs', {
    order_no: orderNo,
    field_name: fieldName,
    old_value: oldValue,
    new_value: newValue,
    operator: operator || 'system',
  });
}

/**
 * 获取订单变更日志
 */
export function getChangeLogs(orderNo: string): OrderChangeLog[] {
  return store.findAll<OrderChangeLog>('order_change_logs', r => r.order_no === orderNo)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

/**
 * 统计订单数量
 */
export function countByStatus(status?: string): number {
  if (status) {
    return store.count<Order>('orders', r => r.status === status);
  }
  return store.count('orders');
}

/**
 * 根据邀请码查找订单
 */
export function findByInviteCode(inviteCode: string): Order | null {
  return store.findOne<Order>('orders', r => r.invite_code === inviteCode);
}
