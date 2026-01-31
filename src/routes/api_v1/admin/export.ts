import { Router } from 'express';
import { requireAdminToken } from '../../../middlewares/admin_auth';
import { storage } from '../../../storage';
import ExcelJS from 'exceljs';

const router = Router();
router.use(requireAdminToken);

// 导出订单
router.post('/orders', async (req, res) => {
  try {
    const { status, startAt, endAt } = req.body;

    const result = storage.orders.list({
      status,
      startAt,
      endAt,
      pageSize: 10000, // 导出最多 10000 条
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('订单列表');

    worksheet.columns = [
      { header: '订单号', key: 'order_no', width: 20 },
      { header: '状态', key: 'status', width: 15 },
      { header: '金额', key: 'total_amount', width: 12 },
      { header: '收货人', key: 'receiver_name', width: 15 },
      { header: '电话', key: 'receiver_phone', width: 15 },
      { header: '地址', key: 'receiver_address', width: 30 },
      { header: '创建时间', key: 'created_at', width: 20 },
    ];

    result.orders.forEach((order: any) => {
      worksheet.addRow({
        order_no: order.order_no,
        status: order.status,
        total_amount: order.total_amount / 100,
        receiver_name: order.address_name || '',
        receiver_phone: order.address_phone || '',
        receiver_address: order.address_detail || '',
        created_at: order.created_at,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 导出房源
router.post('/properties', async (req, res) => {
  try {
    const result = storage.properties.list({ pageSize: 10000 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('房源列表');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: '小区名称', key: 'community_name', width: 20 },
      { header: '详细地址', key: 'detail_address', width: 30 },
      { header: '户型', key: 'house_type', width: 12 },
      { header: '面积', key: 'building_area', width: 10 },
      { header: '起拍价', key: 'starting_price', width: 12 },
      { header: '状态', key: 'status', width: 8 },
      { header: '创建时间', key: 'created_at', width: 20 },
    ];

    result.properties.forEach((p: any) => {
      worksheet.addRow({
        id: p.id,
        community_name: p.community_name,
        detail_address: p.detail_address,
        house_type: p.house_type,
        building_area: p.building_area,
        starting_price: p.starting_price,
        status: p.status === 1 ? '上架' : '下架',
        created_at: p.created_at,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=properties.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
