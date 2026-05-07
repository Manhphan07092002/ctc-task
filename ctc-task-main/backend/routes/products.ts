import { Router } from 'express';

export const productRoutes = (db: any) => {
  const router = Router();

  // Lấy danh sách sản phẩm
  router.get('/', async (req, res) => {
    try {
      const products = await db.all('SELECT * FROM products ORDER BY name ASC');
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: 'Lỗi server' });
    }
  });

  // Thêm sản phẩm mới
  router.post('/', async (req, res) => {
    try {
      const { name, unit, origin, defaultPrice, category, importQuantity, remainingQuantity, importPrice, salePrice, importCode } = req.body;
      if (!name) return res.status(400).json({ error: 'Tên sản phẩm là bắt buộc' });

      const id = 'prod-' + Math.random().toString(36).substr(2, 9);
      const createdAt = new Date().toISOString();

      await db.run(
        'INSERT INTO products (id, name, unit, origin, defaultPrice, category, importQuantity, remainingQuantity, importPrice, salePrice, importCode, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, name, unit, origin, defaultPrice || 0, category || '', importQuantity || 0, remainingQuantity || 0, importPrice || 0, salePrice || defaultPrice || 0, importCode || '', createdAt]
      );

      const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);
      res.status(201).json(product);
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: 'Tên sản phẩm đã tồn tại' });
      }
      res.status(500).json({ error: 'Lỗi server' });
    }
  });

  // Sửa sản phẩm
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, unit, origin, defaultPrice, category, importQuantity, remainingQuantity, importPrice, salePrice, importCode } = req.body;
      
      if (!name) return res.status(400).json({ error: 'Tên sản phẩm là bắt buộc' });

      await db.run(
        'UPDATE products SET name = ?, unit = ?, origin = ?, defaultPrice = ?, category = ?, importQuantity = ?, remainingQuantity = ?, importPrice = ?, salePrice = ?, importCode = ? WHERE id = ?',
        [name, unit, origin, defaultPrice || 0, category || '', importQuantity || 0, remainingQuantity || 0, importPrice || 0, salePrice || defaultPrice || 0, importCode || '', id]
      );

      const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);
      if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
      
      res.json(product);
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: 'Tên sản phẩm đã tồn tại' });
      }
      res.status(500).json({ error: 'Lỗi server' });
    }
  });

  // Xóa sản phẩm
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db.run('DELETE FROM products WHERE id = ?', [id]);
      if (result.changes === 0) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Lỗi server' });
    }
  });

  return router;
};
