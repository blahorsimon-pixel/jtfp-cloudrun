import { Router } from 'express';
import { requireAdminToken } from '../../../middlewares/admin_auth';
import { storage } from '../../../storage';
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

    const result = storage.properties.list({
      page,
      pageSize,
      communityName: query.communityName,
      customerPhone: query.customerPhone,
      authCode: query.authCode,
      startAt: query.startAt,
      endAt: query.endAt,
    });

    res.json({
      total: result.total,
      page,
      pageSize,
      properties: result.properties,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/admin/properties/communities - 获取所有小区名称（用于自动补全）
router.get('/communities', async (req, res) => {
  try {
    const communities = storage.properties.getCommunityNames();
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
            
            if (cellObj.value instanceof Date) {
              const date = cellObj.value as Date;
              const year = date.getUTCFullYear();
              const month = date.getUTCMonth() + 1;
              const day = date.getUTCDate();
              const hours = date.getUTCHours();
              const minutes = date.getUTCMinutes();
              const seconds = date.getUTCSeconds();
              
              const fmt = cellObj.numFmt || '';
              if (fmt.includes('h:mm:ss') || fmt.includes('hh:mm:ss')) {
                finalValue = `${year}/${month}/${day} ${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
              } else if (fmt.includes('h:mm') || fmt.includes('hh:mm')) {
                finalValue = `${year}/${month}/${day} ${hours}:${minutes.toString().padStart(2, '0')}:00`;
              } else {
                finalValue = `${year}/${month}/${day}`;
              }
            } else if (typeof cellObj.value === 'string') {
              finalValue = cellObj.value;
            } else if (cellObj.value && typeof cellObj.value === 'object' && 'richText' in cellObj.value) {
              finalValue = cellObj.value.richText.map((t: any) => t.text).join('');
            } else if (cellObj.value && typeof cellObj.value === 'object' && 'result' in cellObj.value) {
              finalValue = cellObj.value.result;
            } else if (cellObj.value) {
              finalValue = cellObj.value;
            }
            
            rowData[dbField] = finalValue?.toString ? finalValue.toString().trim() : finalValue;
          } else {
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

    // 批量插入
    const successCount = storage.properties.bulkInsert(rows);

    res.json({
      success: true,
      message: `成功导入 ${successCount} 条房源数据`,
      count: successCount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/admin/properties/:id - 获取单个房源详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const property = storage.properties.findById(Number(id));

    if (!property) {
      return res.status(404).json({ error: '房源不存在' });
    }

    res.json({ property });
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

    // 处理商品字段
    const propertyData: any = { ...data };
    
    if (data.priceYuan !== undefined) {
      propertyData.price_cent = Math.round(Number(data.priceYuan) * 100) || 0;
    }
    if (data.coverUrl !== undefined) {
      propertyData.cover_url = data.coverUrl;
    }
    if (data.images !== undefined) {
      propertyData.images = typeof data.images === 'string' ? data.images : JSON.stringify(data.images);
    }
    if (data.isFeatured !== undefined) {
      propertyData.is_featured = data.isFeatured ? 1 : 0;
    }
    if (data.sortOrder !== undefined) {
      propertyData.sort_order = Number(data.sortOrder) || 0;
    }
    if (data.module_config !== undefined) {
      propertyData.module_config = typeof data.module_config === 'string' 
        ? data.module_config 
        : JSON.stringify(data.module_config);
    }

    const property = storage.properties.create(propertyData);

    res.json({
      success: true,
      message: '房源创建成功',
      id: property.id,
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
    const existing = storage.properties.findById(Number(id));
    if (!existing) {
      return res.status(404).json({ error: '房源不存在' });
    }

    // 处理商品字段
    const updateData: any = { ...data };
    
    if (data.priceYuan !== undefined) {
      updateData.price_cent = Math.round(Number(data.priceYuan) * 100) || 0;
    }
    if (data.coverUrl !== undefined) {
      updateData.cover_url = data.coverUrl;
    }
    if (data.images !== undefined) {
      updateData.images = typeof data.images === 'string' ? data.images : JSON.stringify(data.images);
    }
    if (data.isFeatured !== undefined) {
      updateData.is_featured = data.isFeatured ? 1 : 0;
    }
    if (data.sortOrder !== undefined) {
      updateData.sort_order = Number(data.sortOrder) || 0;
    }
    if (data.module_config !== undefined) {
      updateData.module_config = typeof data.module_config === 'string' 
        ? data.module_config 
        : JSON.stringify(data.module_config);
    }

    storage.properties.update(Number(id), updateData);

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
    const existing = storage.properties.findById(Number(id));
    if (!existing) {
      return res.status(404).json({ error: '房源不存在' });
    }

    storage.properties.remove(Number(id));

    res.json({
      success: true,
      message: '房源删除成功',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
