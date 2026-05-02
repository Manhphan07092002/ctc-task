import { Router } from 'express';
import { randomUUID } from 'crypto';

export function contractRoutes(_prisma: any, db: any) {
  const router = Router();

  // GET all contracts (not deleted)
  router.get('/', async (_req, res) => {
    try {
      const rows = await db.all('SELECT * FROM contracts WHERE isDeleted IS NULL OR isDeleted = 0 ORDER BY createdAt DESC');
      const mapped = rows.map((r: any) => ({
        ...r,
        products: r.products ? JSON.parse(r.products) : [],
        attachments: r.attachments ? JSON.parse(r.attachments) : []
      }));
      res.json(mapped);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch contracts' }); }
  });

  // CREATE
  router.post('/', async (req, res) => {
    const { id, contractNumber, clientName, contractName, products, preTaxValue, vatRate, postTaxValue, invoiceDate, invoiceNumber, department, createdBy, status, attachments, paidAmount } = req.body;
    try {
      const now = new Date().toISOString();
      const contractId = id || randomUUID();
      await db.run(
        `INSERT INTO contracts (id, contractNumber, clientName, contractName, products, preTaxValue, vatRate, postTaxValue, invoiceDate, invoiceNumber, department, createdBy, createdAt, status, attachments, paidAmount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [contractId, contractNumber, clientName, contractName, products ? JSON.stringify(products) : null, preTaxValue ?? 0, vatRate ?? 0, postTaxValue ?? 0, invoiceDate ?? null, invoiceNumber ?? null, department, createdBy, now, status || 'draft', attachments ? JSON.stringify(attachments) : null, paidAmount ?? 0]
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

      res.status(201).json({ id: contractId });
    } catch (e: any) { res.status(500).json({ error: 'Failed to create contract', detail: e.message }); }
  });

  // UPDATE
  router.put('/:id', async (req, res) => {
    const { contractNumber, clientName, contractName, products, preTaxValue, vatRate, postTaxValue, invoiceDate, invoiceNumber, status, attachments, paidAmount } = req.body;
    try {
      await db.run(
        `UPDATE contracts SET contractNumber=?, clientName=?, contractName=?, products=?, preTaxValue=?, vatRate=?, postTaxValue=?, invoiceDate=?, invoiceNumber=?, status=?, attachments=?, paidAmount=?, updatedAt=? WHERE id=?`,
        [contractNumber, clientName, contractName, products ? JSON.stringify(products) : null, preTaxValue ?? 0, vatRate ?? 0, postTaxValue ?? 0, invoiceDate ?? null, invoiceNumber ?? null, status || 'draft', attachments ? JSON.stringify(attachments) : null, paidAmount ?? 0, new Date().toISOString(), req.params.id]
      );
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to update contract' }); }
  });

  // SOFT DELETE
  router.delete('/:id', async (req, res) => {
    try {
      await db.run('UPDATE contracts SET isDeleted = 1 WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete contract' }); }
  });

  return router;
}
