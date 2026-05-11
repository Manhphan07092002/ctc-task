import { Router } from 'express';
import { randomUUID } from 'crypto';

export function contractRoutes(db: any) {
  const router = Router();

  async function logActivity(userId: string, action: string, entityId: string, metadata: any) {
    const id = randomUUID();
    await db.run(
      'INSERT INTO activity_logs (id, userId, action, entityId, entityType, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, userId, action, entityId, 'contract', JSON.stringify(metadata), new Date().toISOString()]
    );
  }

  // GET all contracts (not deleted)
  router.get('/', async (req, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const perms = user.permissions || [];
      const canViewAll = perms.includes('view_all_reports') || perms.includes('director_feedback') || perms.includes('admin_panel') || perms.includes('view_all_tasks');

      let query = 'SELECT * FROM contracts WHERE (isDeleted IS NULL OR isDeleted = 0)';
      const params: any[] = [];

      // Time-boxing
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      query += ' AND createdAt >= ?';
      params.push(sixMonthsAgo.toISOString());

      if (!canViewAll) {
        // Tạm thời mở quyền cho mọi người xem HĐ phòng ban do tính chất công việc hiện tại
        // Nếu muốn siết chặt "Nhân viên chỉ xem của mình", có thể đổi điều kiện ở đây.
        // Tuy nhiên theo request: "chỉ được xem và sửa hợp đồng của chính mình" (đề xuất 6)
        query += ' AND createdBy = ?';
        params.push(user.id);
      }
      
      query += ' ORDER BY createdAt DESC';

      const rows = await db.all(query, params);
      const mapped = rows.map((r: any) => ({
        ...r,
        products: r.products ? JSON.parse(r.products) : [],
        attachments: r.attachments ? JSON.parse(r.attachments) : []
      }));
      res.json(mapped);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch contracts' }); }
  });

  // GET archive
  router.get('/archive', async (req, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const perms = user.permissions || [];
      const canViewAll = perms.includes('view_all_reports') || perms.includes('director_feedback') || perms.includes('admin_panel') || perms.includes('view_all_tasks');

      let query = 'SELECT * FROM contracts WHERE (isDeleted IS NULL OR isDeleted = 0)';
      const params: any[] = [];

      if (!canViewAll) {
        query += ' AND createdBy = ?';
        params.push(user.id);
      }
      
      query += ' ORDER BY createdAt DESC';

      const rows = await db.all(query, params);
      const mapped = rows.map((r: any) => ({
        ...r,
        products: r.products ? JSON.parse(r.products) : [],
        attachments: r.attachments ? JSON.parse(r.attachments) : []
      }));
      res.json(mapped);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch contracts archive' }); }
  });

  // CREATE
  router.post('/', async (req, res) => {
    const { id, contractNumber, clientName, contractName, products, preTaxValue, vatRate, postTaxValue, invoiceDate, invoiceNumber, department, createdBy, status, attachments, paidAmount, projectId } = req.body;
    try {
      const now = new Date().toISOString();
      const contractId = id || randomUUID();
      await db.run(
        `INSERT INTO contracts (id, contractNumber, clientName, contractName, products, preTaxValue, vatRate, postTaxValue, invoiceDate, invoiceNumber, department, createdBy, createdAt, status, attachments, paidAmount, projectId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [contractId, contractNumber, clientName, contractName, products ? JSON.stringify(products) : null, preTaxValue ?? 0, vatRate ?? 0, postTaxValue ?? 0, invoiceDate ?? null, invoiceNumber ?? null, department, createdBy, now, status || 'draft', attachments ? JSON.stringify(attachments) : null, paidAmount ?? 0, projectId || null]
      );

      // Auto-create a Task for this new contract
      const taskId = randomUUID();
      await db.run(
        'INSERT INTO tasks (id, title, description, startDate, priority, status, createdBy, department, contractId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [taskId, `Thực hiện HĐ: ${contractNumber}`, `Hợp đồng: ${contractName}\nKhách hàng: ${clientName}`, now.split('T')[0], 'Medium', 'Todo', createdBy, department, contractId]
      );
      if (createdBy) {
        await db.run('INSERT INTO task_assignees (taskId, userId) VALUES (?, ?)', [taskId, createdBy]);
      }

      await logActivity(req.user?.id || 'system', 'Tạo Hợp đồng', contractId, { contractNumber, contractName });

      res.status(201).json({ id: contractId });
    } catch (e: any) { res.status(500).json({ error: 'Failed to create contract', detail: e.message }); }
  });

  // UPDATE
  router.put('/:id', async (req, res) => {
    const { contractNumber, clientName, contractName, products, preTaxValue, vatRate, postTaxValue, invoiceDate, invoiceNumber, status, attachments, paidAmount, projectId } = req.body;
    try {
      await db.run(
        `UPDATE contracts SET contractNumber=?, clientName=?, contractName=?, products=?, preTaxValue=?, vatRate=?, postTaxValue=?, invoiceDate=?, invoiceNumber=?, status=?, attachments=?, paidAmount=?, projectId=?, updatedAt=? WHERE id=?`,
        [contractNumber, clientName, contractName, products ? JSON.stringify(products) : null, preTaxValue ?? 0, vatRate ?? 0, postTaxValue ?? 0, invoiceDate ?? null, invoiceNumber ?? null, status || 'draft', attachments ? JSON.stringify(attachments) : null, paidAmount ?? 0, projectId || null, new Date().toISOString(), req.params.id]
      );

      await logActivity(req.user?.id || 'system', 'Cập nhật Hợp đồng', req.params.id, { contractNumber, status, preTaxValue, paidAmount });

      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to update contract' }); }
  });

  // SOFT DELETE
  router.delete('/:id', async (req, res) => {
    try {
      await db.run('UPDATE contracts SET isDeleted = 1 WHERE id = ?', [req.params.id]);
      
      await logActivity(req.user?.id || 'system', 'Xóa Hợp đồng', req.params.id, {});

      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete contract' }); }
  });

  return router;
}
