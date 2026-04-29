import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Checking activity_logs table...');
  try {
    const count = await prisma.activity_logs.count();
    console.log('✓ activity_logs OK, count:', count);
    
    // Test create
    const { randomUUID } = await import('crypto');
    const result = await prisma.activity_logs.create({
      data: {
        id: randomUUID(),
        userId: 'test-user',
        action: 'test.action',
        entityId: 'test-entity',
        entityType: 'test',
        createdAt: new Date().toISOString()
      }
    });
    console.log('✓ Create OK:', result.id);
    
    // Clean up
    await prisma.activity_logs.delete({ where: { id: result.id } });
    console.log('✓ Delete OK');
  } catch (e: any) {
    console.error('✗ Error:', e.message);
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
