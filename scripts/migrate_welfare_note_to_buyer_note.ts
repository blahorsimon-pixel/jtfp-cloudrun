import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

type Json = Record<string, any>;

function parseArgs(argv: string[]) {
  const args = new Set(argv);
  const getVal = (k: string) => {
    const idx = argv.indexOf(k);
    if (idx >= 0 && idx + 1 < argv.length) return argv[idx + 1];
    return undefined;
  };
  return {
    apply: args.has('--apply'),
    dryRun: args.has('--dry-run') || !args.has('--apply'),
    outDir: getVal('--out') || '',
    socketPath: getVal('--socket') || process.env.DB_SOCKET || '',
    help: args.has('--help') || args.has('-h'),
  };
}

function usage() {
  return [
    '用法：',
    '  npx ts-node scripts/migrate_welfare_note_to_buyer_note.ts --dry-run --out <输出目录>',
    '  npx ts-node scripts/migrate_welfare_note_to_buyer_note.ts --apply --out <输出目录>',
    '',
    '可选参数：',
    '  --socket <socket路径>   当 DB_USER=root 且启用 auth_socket 时使用（例如 /var/lib/mysql/mysql.sock）',
    '  --out <目录>           输出目录（写入 after 快照与报告）',
    '',
    '说明：',
    '  - 仅迁移 welfare_codes.product_id=1 且 status=2 且 consumed_order_no 非空的记录',
    '  - 双重一致性校验：orders.order_no=consumed_order_no 且 orders.invite_code=code，不满足则中止',
    '  - 执行内容：覆盖写入 orders.buyer_note = welfare_codes.note；并清空福利订单明细 order_items.sku_attrs（sku_id=1）',
  ].join('\n');
}

function readJsonlToMap(filePath: string, keyFn: (o: any) => string) {
  const m = new Map<string, any>();
  if (!fs.existsSync(filePath)) return m;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
  for (const ln of lines) {
    const obj = JSON.parse(ln);
    m.set(keyFn(obj), obj);
  }
  return m;
}

function writeJsonl(filePath: string, rows: Json[]) {
  const out = rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : '');
  fs.writeFileSync(filePath, out, 'utf8');
}

function rowsToMap<T extends Json>(rows: T[], key: keyof T) {
  const m = new Map<string, T>();
  for (const r of rows) m.set(String(r[key]), r);
  return m;
}

async function connectDb(socketPathArg: string) {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'h5mall';

  const base = {
    host,
    port,
    user,
    password,
    database,
    timezone: '+08:00',
    decimalNumbers: true,
  } as mysql.PoolOptions;

  // 优先用 env 账号连接；失败且提供 socketPath 时 fallback
  try {
    const pool = mysql.createPool(base);
    await pool.query('SELECT 1');
    return pool;
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (socketPathArg) {
      const pool = mysql.createPool({
        ...base,
        host: 'localhost',
        socketPath: socketPathArg,
        password: '', // socket 登录通常不需要
      } as any);
      await pool.query('SELECT 1');
      return pool;
    }
    throw new Error(`数据库连接失败：${msg}`);
  }
}

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  const { apply, dryRun, outDir, socketPath, help } = parseArgs(process.argv.slice(2));
  if (help) {
    console.log(usage());
    process.exit(0);
  }
  if (!outDir) {
    console.error('缺少 --out 输出目录参数（用于写入迁移后快照与报告）');
    console.log(usage());
    process.exit(2);
  }
  fs.mkdirSync(outDir, { recursive: true });

  const pool = await connectDb(socketPath);
  const conn = await pool.getConnection();
  try {
    // 1) 读取将迁移的“已消费福利码”集合，并校验双重一致性
    const [targets] = await conn.query<any[]>(
      `SELECT
         w.code,
         w.note,
         w.consumed_order_no,
         w.status,
         o.invite_code
       FROM welfare_codes w
       JOIN orders o ON o.order_no = w.consumed_order_no
       WHERE w.product_id = 1
         AND w.status = 2
         AND w.consumed_order_no IS NOT NULL
         AND w.consumed_order_no <> ''`
    );

    const mismatches = targets.filter((t) => String(t.invite_code || '') !== String(t.code || ''));
    if (mismatches.length > 0) {
      throw new Error(
        `一致性校验失败：发现 ${mismatches.length} 条 orders.invite_code != welfare_codes.code（已消费订单不应发生）。示例：` +
          JSON.stringify(mismatches.slice(0, 3))
      );
    }

    // 2) 统计将被影响的行数（预估）
    const [cntOrdersRows] = await conn.query<any[]>(
      `SELECT COUNT(*) AS c
       FROM orders o
       JOIN welfare_codes w ON w.consumed_order_no = o.order_no
       WHERE w.product_id=1 AND w.status=2 AND w.consumed_order_no IS NOT NULL AND w.consumed_order_no<>'' AND o.invite_code = w.code`
    );
    const [cntItemsRows] = await conn.query<any[]>(
      `SELECT COUNT(*) AS c
       FROM order_items oi
       JOIN welfare_codes w ON w.consumed_order_no = oi.order_no
       JOIN orders o ON o.order_no = oi.order_no
       WHERE w.product_id=1 AND w.status=2 AND w.consumed_order_no IS NOT NULL AND w.consumed_order_no<>'' AND o.invite_code = w.code
         AND oi.sku_id = 1`
    );
    const targetOrders = Number(cntOrdersRows?.[0]?.c || 0);
    const targetItems = Number(cntItemsRows?.[0]?.c || 0);

    // 3) 输出迁移后快照（用于对比）
    const [afterOrders] = await conn.query<any[]>(
      `SELECT
          o.order_no,
          o.invite_code,
          o.buyer_note,
          w.note AS welfare_note,
          w.consumed_order_no AS welfare_consumed_order_no,
          w.status AS welfare_status,
          w.product_id AS welfare_product_id
       FROM welfare_codes w
       JOIN orders o ON o.order_no = w.consumed_order_no
       WHERE w.product_id=1 AND w.status=2 AND w.consumed_order_no IS NOT NULL AND w.consumed_order_no<>'' 
       ORDER BY o.created_at DESC`
    );
    const afterOrdersJson = (afterOrders as any[]).map((r) => ({
      order_no: r.order_no,
      invite_code: r.invite_code,
      buyer_note: r.buyer_note,
      welfare_note: r.welfare_note,
      welfare_consumed_order_no: r.welfare_consumed_order_no,
      welfare_status: r.welfare_status,
      welfare_product_id: r.welfare_product_id,
    }));

    const [afterItems] = await conn.query<any[]>(
      `SELECT
          oi.id,
          oi.order_no,
          oi.sku_id,
          oi.sku_title,
          oi.quantity,
          oi.sale_price,
          oi.total_price,
          oi.sku_attrs
       FROM welfare_codes w
       JOIN orders o ON o.order_no = w.consumed_order_no
       JOIN order_items oi ON oi.order_no = o.order_no
       WHERE w.product_id=1 AND w.status=2 AND w.consumed_order_no IS NOT NULL AND w.consumed_order_no<>'' 
       ORDER BY oi.order_no DESC, oi.id ASC`
    );
    const afterItemsJson = (afterItems as any[]).map((r) => ({
      id: r.id,
      order_no: r.order_no,
      sku_id: r.sku_id,
      sku_title: r.sku_title,
      quantity: r.quantity,
      sale_price: r.sale_price,
      total_price: r.total_price,
      sku_attrs: r.sku_attrs,
    }));

    // 注意：这里先写“执行前(after=当前库)”快照；apply 后会再写一次真正 after
    writeJsonl(path.join(outDir, 'current_consumed_orders.jsonl'), afterOrdersJson);
    writeJsonl(path.join(outDir, 'current_consumed_order_items.jsonl'), afterItemsJson);

    const reportBase: any = {
      mode: dryRun ? 'dry-run' : 'apply',
      targetConsumedCodes: targets.length,
      targetOrders,
      targetItemsSkuId1: targetItems,
      time: new Date().toISOString(),
    };

    if (dryRun) {
      fs.writeFileSync(path.join(outDir, 'dry_run_report.json'), JSON.stringify(reportBase, null, 2), 'utf8');
      console.log(JSON.stringify(reportBase, null, 2));
      return;
    }

    // 4) apply 之前生成“before”快照（由 mysql2 取数 + JSON.stringify 写盘，确保每条一行可解析）
    writeJsonl(path.join(outDir, 'before_consumed_orders.jsonl'), afterOrdersJson);
    writeJsonl(path.join(outDir, 'before_consumed_order_items.jsonl'), afterItemsJson);
    const beforeOrders = rowsToMap(afterOrdersJson, 'order_no');
    const beforeItems = rowsToMap(afterItemsJson, 'id');

    // 5) 正式执行迁移（事务）
    await conn.beginTransaction();
    try {
      const [u1] = await conn.query<any>(
        `UPDATE orders o
         JOIN welfare_codes w ON w.consumed_order_no = o.order_no
         SET o.buyer_note = w.note
         WHERE w.product_id=1
           AND w.status=2
           AND w.consumed_order_no IS NOT NULL
           AND w.consumed_order_no <> ''
           AND o.invite_code = w.code`
      );

      const [u2] = await conn.query<any>(
        `UPDATE order_items oi
         JOIN orders o ON o.order_no = oi.order_no
         JOIN welfare_codes w ON w.consumed_order_no = o.order_no
         SET oi.sku_attrs = NULL
         WHERE w.product_id=1
           AND w.status=2
           AND w.consumed_order_no IS NOT NULL
           AND w.consumed_order_no <> ''
           AND o.invite_code = w.code
           AND oi.sku_id = 1`
      );

      await conn.commit();

      reportBase.updatedOrdersAffectedRows = Number(u1?.affectedRows ?? 0);
      reportBase.updatedOrderItemsAffectedRows = Number(u2?.affectedRows ?? 0);
    } catch (e) {
      try {
        await conn.rollback();
      } catch {}
      throw e;
    }

    // 6) 迁移后写 after 快照 + 做一对一比对（只允许 buyer_note/sku_attrs(福利行)变化）

    const [finalOrdersRows] = await conn.query<any[]>(
      `SELECT
          o.order_no,
          o.invite_code,
          o.buyer_note,
          w.note AS welfare_note,
          w.consumed_order_no AS welfare_consumed_order_no,
          w.status AS welfare_status,
          w.product_id AS welfare_product_id
       FROM welfare_codes w
       JOIN orders o ON o.order_no = w.consumed_order_no
       WHERE w.product_id=1 AND w.status=2 AND w.consumed_order_no IS NOT NULL AND w.consumed_order_no<>'' 
       ORDER BY o.created_at DESC`
    );
    const finalOrders = (finalOrdersRows as any[]).map((r) => ({
      order_no: r.order_no,
      invite_code: r.invite_code,
      buyer_note: r.buyer_note,
      welfare_note: r.welfare_note,
      welfare_consumed_order_no: r.welfare_consumed_order_no,
      welfare_status: r.welfare_status,
      welfare_product_id: r.welfare_product_id,
    }));
    writeJsonl(path.join(outDir, 'after_consumed_orders.jsonl'), finalOrders);

    const [finalItemsRows] = await conn.query<any[]>(
      `SELECT
          oi.id,
          oi.order_no,
          oi.sku_id,
          oi.sku_title,
          oi.quantity,
          oi.sale_price,
          oi.total_price,
          oi.sku_attrs
       FROM welfare_codes w
       JOIN orders o ON o.order_no = w.consumed_order_no
       JOIN order_items oi ON oi.order_no = o.order_no
       WHERE w.product_id=1 AND w.status=2 AND w.consumed_order_no IS NOT NULL AND w.consumed_order_no<>'' 
       ORDER BY oi.order_no DESC, oi.id ASC`
    );
    const finalItems = (finalItemsRows as any[]).map((r) => ({
      id: r.id,
      order_no: r.order_no,
      sku_id: r.sku_id,
      sku_title: r.sku_title,
      quantity: r.quantity,
      sale_price: r.sale_price,
      total_price: r.total_price,
      sku_attrs: r.sku_attrs,
    }));
    writeJsonl(path.join(outDir, 'after_consumed_order_items.jsonl'), finalItems);

    let errors: string[] = [];
    // 订单层校验：buyer_note 必须等于 welfare_note（允许 NULL/空串差异以 welfare_note 为准）
    for (const o of finalOrders) {
      const before = beforeOrders.get(String(o.order_no));
      if (!before) {
        errors.push(`before 快照缺失订单：${o.order_no}`);
        continue;
      }
      const expected = o.welfare_note == null ? null : String(o.welfare_note);
      const actual = o.buyer_note == null ? null : String(o.buyer_note);
      if (actual !== expected) {
        errors.push(`buyer_note 不一致 order_no=${o.order_no} expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`);
      }
      // 关键字段不应变化：invite_code / order_no
      if (String(before.invite_code || '') !== String(o.invite_code || '')) {
        errors.push(`invite_code 被意外改动 order_no=${o.order_no}`);
      }
    }

    // 明细层校验：sku_attrs 只允许在 sku_id=1 上变为 NULL；其余字段必须与 before 一致
    for (const it of finalItems) {
      const before = beforeItems.get(String(it.id));
      if (!before) {
        errors.push(`before 快照缺失明细：id=${it.id}`);
        continue;
      }
      const sameFields = ['order_no', 'sku_id', 'sku_title', 'quantity', 'sale_price', 'total_price'] as const;
      for (const f of sameFields) {
        const b = (before as any)[f];
        const a = (it as any)[f];
        if (String(b) !== String(a)) {
          errors.push(`明细字段被意外改动 id=${it.id} field=${String(f)} before=${JSON.stringify(b)} after=${JSON.stringify(a)}`);
        }
      }
      if (Number(it.sku_id) === 1) {
        if (it.sku_attrs !== null) {
          errors.push(`福利明细 sku_attrs 未清空 id=${it.id} sku_attrs=${JSON.stringify(it.sku_attrs)}`);
        }
      } else {
        // 非福利 sku 行不应该被清空（保持原值）
        if (String(before.sku_attrs ?? '') !== String(it.sku_attrs ?? '')) {
          errors.push(`非福利明细 sku_attrs 被意外改动 id=${it.id}`);
        }
      }
    }

    reportBase.verifyErrors = errors.length;
    reportBase.verifyErrorSamples = errors.slice(0, 20);
    fs.writeFileSync(path.join(outDir, 'apply_report.json'), JSON.stringify(reportBase, null, 2), 'utf8');

    if (errors.length > 0) {
      console.error(JSON.stringify(reportBase, null, 2));
      throw new Error(`迁移后校验失败：errors=${errors.length}，详见 ${path.join(outDir, 'apply_report.json')}`);
    }
    console.log(JSON.stringify(reportBase, null, 2));
  } finally {
    try {
      conn.release();
    } catch {}
    try {
      await pool.end();
    } catch {}
  }
}

main().catch((e) => {
  console.error(String(e?.stack || e?.message || e));
  process.exit(1);
});


