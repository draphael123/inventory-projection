import { Router, Request, Response } from 'express';
import { query } from '../db/connection.js';
import { authenticate, authorize, checkPasswordChange } from '../middleware/auth.middleware.js';
import { createAuditLog } from '../services/audit.service.js';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(checkPasswordChange);

/**
 * GET /api/data/summary
 * Get summary of user's uploaded data
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get file count and record count
    const fileResult = await query<{ fileCount: string; totalRecords: string }>(
      `SELECT COUNT(*) as "fileCount", COALESCE(SUM(record_count), 0) as "totalRecords"
       FROM uploaded_files WHERE user_id = $1 AND status = 'success'`,
      [userId]
    );

    // Get product count
    const productResult = await query<{ productCount: string }>(
      `SELECT COUNT(DISTINCT product_id) as "productCount"
       FROM order_records WHERE user_id = $1`,
      [userId]
    );

    // Get date range
    const dateResult = await query<{ minDate: Date; maxDate: Date }>(
      `SELECT MIN(order_date) as "minDate", MAX(order_date) as "maxDate"
       FROM order_records WHERE user_id = $1`,
      [userId]
    );

    // Get category and supplier counts
    const categoryResult = await query<{ categories: string[]; suppliers: string[] }>(
      `SELECT 
        ARRAY_AGG(DISTINCT category) FILTER (WHERE category IS NOT NULL) as categories,
        ARRAY_AGG(DISTINCT supplier) FILTER (WHERE supplier IS NOT NULL) as suppliers
       FROM order_records WHERE user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        fileCount: parseInt(fileResult.rows[0].fileCount, 10),
        totalRecords: parseInt(fileResult.rows[0].totalRecords, 10),
        productCount: parseInt(productResult.rows[0].productCount, 10),
        dateRange: dateResult.rows[0].minDate ? {
          start: dateResult.rows[0].minDate,
          end: dateResult.rows[0].maxDate,
        } : null,
        categories: categoryResult.rows[0].categories || [],
        suppliers: categoryResult.rows[0].suppliers || [],
      },
    });
  } catch (error) {
    console.error('Get data summary error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch data summary',
      },
    });
  }
});

/**
 * GET /api/data/files
 * Get list of uploaded files
 */
router.get('/files', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await query(
      `SELECT id, original_name as "originalName", mime_type as "mimeType", 
              size, record_count as "recordCount", date_range_start as "dateRangeStart",
              date_range_end as "dateRangeEnd", status, error_message as "errorMessage",
              created_at as "createdAt"
       FROM uploaded_files 
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch files',
      },
    });
  }
});

/**
 * GET /api/data/orders
 * Get order records with pagination
 */
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 100, 1000);
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM order_records WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get orders
    const result = await query(
      `SELECT id, order_date as "date", product_id as "productId", 
              product_name as "productName", quantity, category, 
              unit_price as "unitPrice", supplier
       FROM order_records 
       WHERE user_id = $1
       ORDER BY order_date DESC, product_id
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Log data access
    await createAuditLog({
      userId,
      userEmail: req.user!.email,
      action: 'DATA_VIEWED',
      details: { recordCount: result.rows.length },
    });

    res.set('X-Total-Count', total.toString());
    res.json({
      success: true,
      data: result.rows,
      meta: {
        page,
        limit,
        total,
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch orders',
      },
    });
  }
});

/**
 * GET /api/data/products
 * Get unique products with aggregated stats
 */
router.get('/products', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await query(
      `SELECT 
        product_id as "productId",
        MAX(product_name) as "productName",
        MAX(category) as "category",
        COUNT(*) as "orderCount",
        SUM(quantity) as "totalQuantity",
        AVG(quantity) as "avgQuantity",
        MIN(order_date) as "firstOrderDate",
        MAX(order_date) as "lastOrderDate"
       FROM order_records 
       WHERE user_id = $1
       GROUP BY product_id
       ORDER BY SUM(quantity) DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows.map((row: any) => ({
        ...row,
        orderCount: parseInt(row.orderCount as string, 10),
        totalQuantity: parseInt(row.totalQuantity as string, 10),
        avgQuantity: parseFloat(row.avgQuantity as string),
      })),
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch products',
      },
    });
  }
});

/**
 * DELETE /api/data/files/:id
 * Delete an uploaded file and its records
 */
router.delete(
  '/files/:id',
  authorize('admin', 'analyst'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const fileId = req.params.id;

      // Verify file belongs to user (or admin)
      const fileResult = await query(
        'SELECT id, user_id FROM uploaded_files WHERE id = $1',
        [fileId]
      );

      if (fileResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'File not found',
          },
        });
        return;
      }

      const file = fileResult.rows[0] as any;
      if (file.user_id !== userId && req.user!.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot delete files owned by other users',
          },
        });
        return;
      }

      // Delete file (cascade will delete order records)
      await query('DELETE FROM uploaded_files WHERE id = $1', [fileId]);

      await createAuditLog({
        userId,
        userEmail: req.user!.email,
        action: 'DATA_DELETED',
        resourceType: 'file',
        resourceId: fileId,
      });

      res.json({
        success: true,
        data: { message: 'File deleted successfully' },
      });
    } catch (error) {
      console.error('Delete file error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete file',
        },
      });
    }
  }
);

/**
 * DELETE /api/data/all
 * Delete all user's data
 */
router.delete(
  '/all',
  authorize('admin', 'analyst'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      // Delete all files (cascade will delete order records)
      const result = await query(
        'DELETE FROM uploaded_files WHERE user_id = $1',
        [userId]
      );

      await createAuditLog({
        userId,
        userEmail: req.user!.email,
        action: 'DATA_DELETED',
        details: { deletedFiles: result.rowCount },
      });

      res.json({
        success: true,
        data: { 
          message: 'All data deleted successfully',
          deletedFiles: result.rowCount,
        },
      });
    } catch (error) {
      console.error('Delete all data error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete data',
        },
      });
    }
  }
);

export default router;

