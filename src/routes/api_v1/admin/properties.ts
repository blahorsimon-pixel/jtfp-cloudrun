import { Router } from 'express';
import { pool } from '../../../db/mysql';
import { requireAdminToken } from '../../../middlewares/admin_auth';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import ExcelJS from 'exceljs';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const HEADER_MAP: Record<string, string> = {
  '开拍时间': 'auction_time',
  '竞价阶段': 'bidding_phase',
  '小区名称': 'community_name',
  '详细地址': 'detail_address',
  '建筑面积/㎡': 'building_area',
  '房屋户型': 'house_type',
  '楼层': 'floor_info',
  '建筑年份': 'building_year',
  '装修情况': 'decoration_status',
  '物业现状': 'property_status',
  '持有年数': 'holding_years',
  '物业类型': 'property_type',
  '起拍价': 'starting_price',
  '起拍单价': 'starting_unit_price',
  '竞拍平台': 'auction_platform',
  '竞拍保证金': 'auction_deposit',
  '加价幅度': 'price_increment',
  '评估总价': 'evaluation_total_price',
  '评估单价': 'evaluation_unit_price',
  '7成可贷金额': 'loan_70_percent',
  '8成可贷金额': 'loan_80_percent',
  '9成可贷金额': 'loan_90_percent',
  '市场参考总价': 'market_total_price',
  '市场参考单价': 'market_unit_price',
  '学区': 'school_district',
  '商圈': 'business_circle',
  '捡漏空间': 'profit_space',
  '授权码': 'auth_code',
  '契税率': 'deed_tax_rate',
  '契税金额': 'deed_tax_amount',
  '增值税率': 'vat_rate',
  '增值税金额': 'vat_amount',
  '个税率': 'income_tax_rate',
  '个税金额': 'income_tax_amount',
  '客户姓名': 'customer_name',
  '客户联系号码': 'customer_phone',
  '客户尽调简介': 'customer_survey_brief',
  '归属业务员': 'assigned_salesman',
  'unionID': 'unionID',
  'OpenID': 'openID'
};

// Apply admin auth to all routes in this router
router.use((req, res, next) => {
  next();
});
router.use(requireAdminToken);

interface PropertyListQuery {
  page?: string;
  pageSize?: string;
  communityName?: string;
  customerPhone?: string;
  authCode?: string;
  startAt?: string;
  endAt?: string;
}

// GET /api/v1/admin/properties - 获取房源列表
router.get('/', async (req, res) => {
  try {
    const query = req.query as PropertyListQuery;
    const page = parseInt(query.page || '1', 10);
    const pageSize = Math.min(parseInt(query.pageSize || '20', 10), 100);
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: any[] = [];

    if (query.communityName) {
      conditions.push('community_name LIKE ?');
      params.push(`%${query.communityName}%`);
    }
    if (query.customerPhone) {
      conditions.push('customer_phone LIKE ?');
      params.push(`%${query.customerPhone}%`);
    }
    if (query.authCode) {
      conditions.push('auth_code LIKE ?');
      params.push(`%${query.authCode}%`);
    }
    if (query.startAt) {
      conditions.push('created_at >= ?');
      params.push(query.startAt);
    }
    if (query.endAt) {
      conditions.push('created_at <= ?');
      params.push(query.endAt);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 获取总数
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM properties ${whereClause}`,
      params
    );
    const total = (countRows?.[0] as any)?.total ?? 0;

    // 获取数据（包含商品字段）
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT *, 
        price_cent, cover_url, description, status, is_featured, sort_order, stock
       FROM properties 
       ${whereClause}
       ORDER BY is_featured DESC, sort_order DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({
      total,
      page,
      pageSize,
      properties: rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/admin/properties/communities - 获取所有小区名称（用于自动补全）
router.get('/communities', async (req, res) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT community_name 
       FROM properties 
       WHERE community_name IS NOT NULL AND community_name != ''
       ORDER BY community_name ASC`
    );

    const communities = rows.map((row: any) => row.community_name);
    res.json({ communities });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/admin/properties/template - 下载导入模板
router.get('/template', async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('房源导入模板');

    // 设置表头
    const headers = Object.keys(HEADER_MAP);
    worksheet.addRow(headers);

    // 添加示例数据
    worksheet.addRow([
      '2026-02-01 10:00', '一拍', '示例小区', 'XX市XX区XX路XX号', '89.5', '3室2厅', '12/26', '2010', '精装', '空置', '5年', '住宅', 
      '200', '2.2', '京东司法拍卖', '20', '1', '300', '3.3', '210', '240', '270', '320', '3.5', 'XX小学', '市中心', '20', 
      'AUTH123', '1%', '3', '5%', '15', '1%', '3', '张三', '13800138000', '客户诚意度高', '业务员A', 'UID123', 'OID123'
    ]);

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=property_import_template.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/admin/properties/import - Excel 批量导入
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer as any);
    const worksheet = workbook.getWorksheet(1);
    
    if (!worksheet) {
      return res.status(400).json({ error: 'Excel文件内容为空' });
    }

    const rows: any[] = [];
    const headers: string[] = [];

    // 读取第一行作为表头
    const firstRow = worksheet.getRow(1);
    firstRow.eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value?.toString().trim() || '';
    });

    // 从第二行开始读取数据
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      const rowData: any = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber];
        if (header && HEADER_MAP[header]) {
          const dbField = HEADER_MAP[header];
          
          // 对于开拍时间字段，特殊处理以保留原始格式
          if (dbField === 'auction_time') {
            const cellObj = cell as any;
            let finalValue = null;
            
            // 如果是日期类型，使用单元格的格式化字符串来还原
            if (cellObj.value instanceof Date) {
              // ExcelJS 存储的是 UTC 时间，需要使用 UTC 方法获取原始值
              const date = cellObj.value as Date;
              const year = date.getUTCFullYear();
              const month = date.getUTCMonth() + 1;
              const day = date.getUTCDate();
              const hours = date.getUTCHours();
              const minutes = date.getUTCMinutes();
              const seconds = date.getUTCSeconds();
              
              // 根据 numFmt 格式化
              const fmt = cellObj.numFmt || '';
              if (fmt.includes('h:mm:ss') || fmt.includes('hh:mm:ss')) {
                // 包含秒
                finalValue = `${year}/${month}/${day} ${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
              } else if (fmt.includes('h:mm') || fmt.includes('hh:mm')) {
                // 包含时分
                finalValue = `${year}/${month}/${day} ${hours}:${minutes.toString().padStart(2, '0')}:00`;
              } else {
                // 只有日期
                finalValue = `${year}/${month}/${day}`;
              }
            }
            // 如果是字符串，直接使用
            else if (typeof cellObj.value === 'string') {
              finalValue = cellObj.value;
            }
            // 如果是富文本
            else if (cellObj.value && typeof cellObj.value === 'object' && 'richText' in cellObj.value) {
              finalValue = cellObj.value.richText.map((t: any) => t.text).join('');
            }
            // 如果是公式结果
            else if (cellObj.value && typeof cellObj.value === 'object' && 'result' in cellObj.value) {
              finalValue = cellObj.value.result;
            }
            // 其他情况
            else if (cellObj.value) {
              finalValue = cellObj.value;
            }
            
            rowData[dbField] = finalValue?.toString ? finalValue.toString().trim() : finalValue;
          } else {
            // 其他字段按原逻辑处理
            let value = cell.value;
            if (value && typeof value === 'object' && 'result' in value) {
               value = (value as any).result;
            }
            rowData[dbField] = value?.toString().trim() || null;
          }
        }
      });

      if (rowData.community_name) {
        rows.push(rowData);
      }
    });

    if (rows.length === 0) {
      return res.status(400).json({ error: '未找到有效数据（小区名称不能为空）' });
    }

    // 批量插入数据库
    const fields = Object.values(HEADER_MAP);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      let successCount = 0;
      for (const row of rows) {
        const values = fields.map(f => row[f] || null);
        const placeholders = fields.map(() => '?').join(', ');
        
        await connection.query(
          `INSERT INTO properties (${fields.join(', ')}) VALUES (${placeholders})`,
          values
        );
        successCount++;
      }

      await connection.commit();
      res.json({
        success: true,
        message: `成功导入 ${successCount} 条房源数据`,
        count: successCount
      });
    } catch (err: any) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/admin/properties/:id - 获取单个房源详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM properties WHERE id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '房源不存在' });
    }

    res.json({ property: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/admin/properties - 创建新房源
router.post('/', async (req, res) => {
  try {
    const data = req.body;

    // 必填字段验证
    if (!data.community_name) {
      return res.status(400).json({ error: '小区名称为必填项' });
    }

    // 构建插入字段（包含商品字段）
    const fields = [
      'auction_time', 'bidding_phase', 'community_name', 'detail_address',
      'building_area', 'house_type', 'floor_info', 'building_year',
      'decoration_status', 'property_status', 'holding_years', 'property_type',
      'starting_price', 'starting_unit_price', 'auction_platform', 'auction_deposit',
      'price_increment', 'evaluation_total_price', 'evaluation_unit_price',
      'loan_70_percent', 'loan_80_percent', 'loan_90_percent',
      'market_total_price', 'market_unit_price', 'school_district',
      'business_circle', 'profit_space', 'auth_code',
      'deed_tax_rate', 'deed_tax_amount', 'vat_rate', 'vat_amount',
      'income_tax_rate', 'income_tax_amount', 'customer_name',
      'customer_phone', 'customer_survey_brief', 'assigned_salesman',
      'unionID', 'openID'
    ];

    const values: any[] = [];
    const placeholders: string[] = [];
    const fieldNames: string[] = [];

    fields.forEach(field => {
      if (data[field] !== undefined) {
        fieldNames.push(field);
        values.push(data[field] || null);
        placeholders.push('?');
      }
    });

    // 处理商品字段（价格转换为分）
    if (data.priceYuan !== undefined) {
      fieldNames.push('price_cent');
      values.push(Math.round(Number(data.priceYuan) * 100) || 0);
      placeholders.push('?');
    }
    // 处理 cover_url 字段（同时支持 snake_case 和 camelCase）
    if (data.cover_url !== undefined || data.coverUrl !== undefined) {
      fieldNames.push('cover_url');
      values.push(data.cover_url || data.coverUrl || null);
      placeholders.push('?');
    }
    // 处理 images 字段
    if (data.images !== undefined) {
      fieldNames.push('images');
      values.push(typeof data.images === 'string' ? data.images : JSON.stringify(data.images));
      placeholders.push('?');
    }
    if (data.description !== undefined) {
      fieldNames.push('description');
      values.push(data.description || null);
      placeholders.push('?');
    }
    if (data.status !== undefined) {
      fieldNames.push('status');
      values.push(Number(data.status) || 0);
      placeholders.push('?');
    }
    if (data.isFeatured !== undefined) {
      fieldNames.push('is_featured');
      values.push(data.isFeatured ? 1 : 0);
      placeholders.push('?');
    }
    if (data.sortOrder !== undefined) {
      fieldNames.push('sort_order');
      values.push(Number(data.sortOrder) || 0);
      placeholders.push('?');
    }
    if (data.stock !== undefined) {
      fieldNames.push('stock');
      values.push(Number(data.stock) || 1);
      placeholders.push('?');
    }
    if (data.category_id !== undefined) {
      fieldNames.push('category_id');
      values.push(data.category_id || null);
      placeholders.push('?');
    }
    // 处理模块配置字段
    if (data.module_config !== undefined) {
      fieldNames.push('module_config');
      // 如果是对象，转换为JSON字符串；如果已经是字符串，直接使用
      const moduleConfig = typeof data.module_config === 'string' 
        ? data.module_config 
        : JSON.stringify(data.module_config);
      values.push(moduleConfig || null);
      placeholders.push('?');
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO properties (${fieldNames.join(', ')}) VALUES (${placeholders.join(', ')})`,
      values
    );

    res.json({
      success: true,
      message: '房源创建成功',
      id: result.insertId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/admin/properties/:id - 更新房源
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // 检查房源是否存在
    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM properties WHERE id = ? LIMIT 1`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: '房源不存在' });
    }

    // 构建更新字段
    const fields = [
      'auction_time', 'bidding_phase', 'community_name', 'detail_address',
      'building_area', 'house_type', 'floor_info', 'building_year',
      'decoration_status', 'property_status', 'holding_years', 'property_type',
      'starting_price', 'starting_unit_price', 'auction_platform', 'auction_deposit',
      'price_increment', 'evaluation_total_price', 'evaluation_unit_price',
      'loan_70_percent', 'loan_80_percent', 'loan_90_percent',
      'market_total_price', 'market_unit_price', 'school_district',
      'business_circle', 'profit_space', 'auth_code',
      'deed_tax_rate', 'deed_tax_amount', 'vat_rate', 'vat_amount',
      'income_tax_rate', 'income_tax_amount', 'customer_name',
      'customer_phone', 'customer_survey_brief', 'assigned_salesman',
      'unionID', 'openID'
    ];

    const updates: string[] = [];
    const values: any[] = [];

    fields.forEach(field => {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(data[field] || null);
      }
    });

    // 处理商品字段
    if (data.priceYuan !== undefined) {
      updates.push('price_cent = ?');
      values.push(Math.round(Number(data.priceYuan) * 100) || 0);
    }
    // 处理 cover_url 字段（同时支持 snake_case 和 camelCase）
    if (data.cover_url !== undefined || data.coverUrl !== undefined) {
      updates.push('cover_url = ?');
      values.push(data.cover_url || data.coverUrl || null);
    }
    // 处理 images 字段
    if (data.images !== undefined) {
      updates.push('images = ?');
      values.push(typeof data.images === 'string' ? data.images : JSON.stringify(data.images));
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description || null);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(Number(data.status) || 0);
    }
    if (data.isFeatured !== undefined) {
      updates.push('is_featured = ?');
      values.push(data.isFeatured ? 1 : 0);
    }
    if (data.sortOrder !== undefined) {
      updates.push('sort_order = ?');
      values.push(Number(data.sortOrder) || 0);
    }
    if (data.stock !== undefined) {
      updates.push('stock = ?');
      values.push(Number(data.stock) || 1);
    }
    if (data.category_id !== undefined) {
      updates.push('category_id = ?');
      values.push(data.category_id || null);
    }
    // 处理模块配置字段
    if (data.module_config !== undefined) {
      updates.push('module_config = ?');
      // 如果是对象，转换为JSON字符串；如果已经是字符串，直接使用
      const moduleConfig = typeof data.module_config === 'string' 
        ? data.module_config 
        : JSON.stringify(data.module_config);
      values.push(moduleConfig || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '没有要更新的字段' });
    }

    values.push(id);

    await pool.query(
      `UPDATE properties SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: '房源更新成功',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/admin/properties/:id - 删除房源
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 检查房源是否存在
    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM properties WHERE id = ? LIMIT 1`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: '房源不存在' });
    }

    await pool.query(`DELETE FROM properties WHERE id = ?`, [id]);

    res.json({
      success: true,
      message: '房源删除成功',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
