import { Router } from 'express';
import { pool } from '../../db/mysql';
import type { RowDataPacket } from 'mysql2/promise';

/**
 * 房源商城公开接口
 * 供H5前端商城展示房源商品
 */
const router = Router();

function toInt(v: any, fallback: number) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * GET /api/v1/properties/mall - 获取上架房源列表
 * Query参数：
 *  - page: 页码，默认1
 *  - pageSize: 每页数量，默认20，最大100
 *  - keyword: 关键词搜索（小区名称、地址）
 *  - categoryId: 分类ID筛选
 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(toInt(req.query.page, 1), 1);
    const pageSize = Math.min(Math.max(toInt(req.query.pageSize, 20), 1), 100);
    const offset = (page - 1) * pageSize;
    const keyword = String((req.query.keyword as string) || '').trim();
    const categoryId = toInt(req.query.categoryId, 0);

    const conditions: string[] = ['status = 1']; // 只显示上架的房源
    const params: any[] = [];

    if (keyword) {
      conditions.push('(community_name LIKE ? OR detail_address LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (categoryId > 0) {
      conditions.push('category_id = ?');
      params.push(categoryId);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // 获取总数
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM properties ${whereClause}`,
      params
    );
    const total = (countRows?.[0] as any)?.total ?? 0;

    // 获取房源列表（作为商品展示）
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        id,
        community_name,
        house_type,
        building_area,
        floor_info,
        starting_price,
        evaluation_total_price,
        price_cent,
        cover_url,
        is_featured,
        sort_order,
        stock,
        detail_address,
        school_district,
        business_circle,
        auction_time,
        bidding_phase,
        profit_space,
        created_at
       FROM properties
       ${whereClause}
       ORDER BY is_featured DESC, sort_order DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    // 组装商品标题（小区名称 + 户型）
    const list = rows.map((row: any) => ({
      id: row.id,
      title: `${row.community_name || ''} ${row.house_type || ''}`.trim() || '房源',
      community_name: row.community_name,
      subtitle: row.detail_address || '',
      price_cent: Number(row.price_cent || 0),
      cover_url: row.cover_url,
      building_area: row.building_area,
      floor_info: row.floor_info,
      house_type: row.house_type,
      starting_price: row.starting_price,
      evaluation_total_price: row.evaluation_total_price,
      school_district: row.school_district,
      business_circle: row.business_circle,
      auction_time: row.auction_time,
      bidding_phase: row.bidding_phase,
      profit_space: row.profit_space,
      stock: Number(row.stock || 1),
      is_featured: Number(row.is_featured || 0),
      created_at: row.created_at,
    }));

    return res.json({ 
      total, 
      page, 
      pageSize, 
      list,
      data: list, // 兼容前端不同的字段名
      properties: list 
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/v1/properties/mall/categories - 获取所有房源分类
 */
router.get('/categories', async (req, res, next) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, icon FROM categories WHERE status = 1 ORDER BY sort_order DESC, id ASC'
    );
    res.json({ categories: rows });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/v1/properties/mall/:id - 获取房源商品详情
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    
    const [rows] = await pool.query<RowDataPacket[]>(
      `      SELECT 
        id,
        community_name,
        house_type,
        building_area,
        floor_info,
        building_year,
        decoration_status,
        property_status,
        property_type,
        starting_price,
        starting_unit_price,
        price_cent,
        cover_url,
        images,
        description,
        stock,
        detail_address,
        school_district,
        business_circle,
        auction_time,
        bidding_phase,
        auction_platform,
        auction_deposit,
        evaluation_total_price,
        evaluation_unit_price,
        market_total_price,
        market_unit_price,
        loan_70_percent,
        loan_80_percent,
        loan_90_percent,
        deed_tax_rate,
        deed_tax_amount,
        vat_rate,
        vat_amount,
        income_tax_rate,
        income_tax_amount,
        profit_space,
        module_config,
        created_at,
        updated_at
       FROM properties
       WHERE id = ? AND status = 1
       LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ code: 'NOT_FOUND', message: '房源不存在或已下架' });
    }

    const row: any = rows[0];

    // 处理 images 字段（可能是 JSON 字符串或 null）
    let images: string[] = [];
    if (row.images) {
      if (typeof row.images === 'string') {
        try {
          images = JSON.parse(row.images);
        } catch {
          // 如果不是有效的 JSON，尝试按逗号分割
          images = row.images.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      } else if (Array.isArray(row.images)) {
        images = row.images;
      }
    }

    // 组装商品数据
    const property = {
      id: row.id,
      title: `${row.community_name || ''} ${row.house_type || ''}`.trim() || '房源',
      price_cent: Number(row.price_cent || 0),
      cover_url: row.cover_url,
      images: images, // 图片数组
      description: row.description, // 富文本详情
      stock: Number(row.stock || 1),
      
      // 房源基本信息
      community_name: row.community_name,
      house_type: row.house_type,
      building_area: row.building_area,
      floor_info: row.floor_info,
      building_year: row.building_year,
      decoration_status: row.decoration_status,
      property_status: row.property_status,
      property_type: row.property_type,
      detail_address: row.detail_address,
      school_district: row.school_district,
      business_circle: row.business_circle,
      
      // 价格信息
      starting_price: row.starting_price,
      starting_unit_price: row.starting_unit_price,
      evaluation_total_price: row.evaluation_total_price,
      evaluation_unit_price: row.evaluation_unit_price,
      market_total_price: row.market_total_price,
      market_unit_price: row.market_unit_price,
      
      // 贷款信息
      loan_70_percent: row.loan_70_percent,
      loan_80_percent: row.loan_80_percent,
      loan_90_percent: row.loan_90_percent,
      profit_space: row.profit_space,
      
      // 拍卖信息
      auction_time: row.auction_time,
      bidding_phase: row.bidding_phase,
      auction_platform: row.auction_platform,
      auction_deposit: row.auction_deposit,
      
      // 税费信息
      deed_tax_rate: row.deed_tax_rate,
      deed_tax_amount: row.deed_tax_amount,
      vat_rate: row.vat_rate,
      vat_amount: row.vat_amount,
      income_tax_rate: row.income_tax_rate,
      income_tax_amount: row.income_tax_amount,
      
      // 模块配置
      module_config: (() => {
        // 如果数据库中有配置，解析并返回
        if (row.module_config) {
          try {
            return typeof row.module_config === 'string' 
              ? JSON.parse(row.module_config) 
              : row.module_config;
          } catch {
            // 解析失败，返回默认配置
          }
        }
        // 默认配置：所有模块显示，默认顺序
        return {
          tabs: [
            { key: 'property', name: '房源', visible: true, order: 1 },
            { key: 'auction', name: '拍卖', visible: true, order: 2 },
            { key: 'loan', name: '金融', visible: true, order: 3 },
            { key: 'tax', name: '税费', visible: true, order: 4 }
          ]
        };
      })(),
      
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return res.json({ 
      data: property, 
      property, 
      // 兼容原有商品详情接口格式
      skus: [] // 房源不需要SKU
    });
  } catch (e) {
    next(e);
  }
});

export default router;
