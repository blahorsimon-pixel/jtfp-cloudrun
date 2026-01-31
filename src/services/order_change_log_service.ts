/**
 * Order Change Log Service - 订单变更日志服务
 */

import { storage } from '../storage';

export enum OrderChangeType {
  STATUS_CHANGE = 'STATUS_CHANGE',
  REMARK_CHANGE = 'REMARK_CHANGE',
  AMOUNT_CHANGE = 'AMOUNT_CHANGE',
  ADDRESS_CHANGE = 'ADDRESS_CHANGE',
  SHIPPING_CHANGE = 'SHIPPING_CHANGE',
}

export interface OrderChangeLog {
  id: number;
  order_no: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  operator: string;
  created_at: string;
}

/**
 * 记录订单变更日志
 */
export async function logOrderChange(
  orderNo: string,
  changeType: OrderChangeType | string,
  oldValue: string | null,
  newValue: string | null,
  operator: string = 'system'
): Promise<void> {
  storage.orders.logChange(orderNo, changeType, oldValue || '', newValue || '', operator);
}

/**
 * 获取订单变更日志
 */
export async function getOrderChangeLogs(orderNo: string): Promise<OrderChangeLog[]> {
  return storage.orders.getChangeLogs(orderNo) as OrderChangeLog[];
}
