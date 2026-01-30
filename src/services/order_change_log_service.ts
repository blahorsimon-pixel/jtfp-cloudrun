import { PoolConnection } from 'mysql2/promise';
import { pool } from '../db/mysql';

export enum OrderChangeType {
  ORDER_STATUS = 'ORDER_STATUS',
  ADDRESS = 'ADDRESS',
  SHIPMENT = 'SHIPMENT',
  ITEM_SKU = 'ITEM_SKU',
  ITEM_QUANTITY = 'ITEM_QUANTITY',
  ITEM_PRICE = 'ITEM_PRICE',
  ORDER_AMOUNT = 'ORDER_AMOUNT',
  CLOSE = 'CLOSE',
  REOPEN = 'REOPEN',
  DELETE = 'DELETE',
  OTHER = 'OTHER',
}

export interface OrderChangeLog {
  order_no: string;
  order_item_id?: number | null;
  change_type: OrderChangeType;
  field_name?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  operator: string;
  reason?: string | null;
}

/**
 * 记录订单变更日志
 * @param log 日志内容
 * @param conn 可选的数据库连接（用于事务）
 */
export async function logOrderChange(log: OrderChangeLog, conn?: PoolConnection) {
  const sql = `
    INSERT INTO order_change_log (
      order_no, order_item_id, change_type, field_name, 
      old_value, new_value, operator, reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    log.order_no,
    log.order_item_id || null,
    log.change_type,
    log.field_name || null,
    log.old_value || null,
    log.new_value || null,
    log.operator,
    log.reason || null,
  ];

  if (conn) {
    await conn.query(sql, params);
  } else {
    await pool.query(sql, params);
  }
}

/**
 * 批量记录订单变更日志
 * @param logs 日志列表
 * @param conn 可选的数据库连接
 */
export async function logOrderChanges(logs: OrderChangeLog[], conn?: PoolConnection) {
  if (logs.length === 0) return;
  
  const sql = `
    INSERT INTO order_change_log (
      order_no, order_item_id, change_type, field_name, 
      old_value, new_value, operator, reason
    ) VALUES ?
  `;
  const params = [
    logs.map(log => [
      log.order_no,
      log.order_item_id || null,
      log.change_type,
      log.field_name || null,
      log.old_value || null,
      log.new_value || null,
      log.operator,
      log.reason || null,
    ])
  ];

  if (conn) {
    await conn.query(sql, params);
  } else {
    await pool.query(sql, params);
  }
}

/**
 * 获取订单的变更记录
 */
export async function getOrderChangeLogs(orderNo: string) {
  const [rows] = await pool.query(
    'SELECT * FROM order_change_log WHERE order_no = ? ORDER BY created_at DESC',
    [orderNo]
  );
  return rows;
}

/**
 * 获取订单明细的变更记录
 */
export async function getOrderItemChangeLogs(orderItemId: number) {
  const [rows] = await pool.query(
    'SELECT * FROM order_change_log WHERE order_item_id = ? ORDER BY created_at DESC',
    [orderItemId]
  );
  return rows;
}



