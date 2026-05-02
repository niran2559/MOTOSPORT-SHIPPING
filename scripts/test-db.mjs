import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('\n=== בדיקת חיבור למסד נתונים ===\n')

  // 1. ספירת רשומות בכל הטבלאות
  const [branches, users, shipments, orders, orderItems, shipmentBranches, shipmentOrders] =
    await Promise.all([
      db.branch.count(),
      db.user.count(),
      db.shipment.count(),
      db.order.count(),
      db.orderItem.count(),
      db.shipmentBranch.count(),
      db.shipmentOrder.count(),
    ])

  const tables = { branches, users, shipments, orders, orderItems, shipmentBranches, shipmentOrders }
  for (const [name, count] of Object.entries(tables)) {
    console.log(`  ✓ ${name}: ${count} רשומות`)
  }

  // 2. בדיקת כתיבה + קריאה + מחיקה
  console.log('\n--- בדיקת כתיבה/קריאה/מחיקה ---')
  const created = await db.branch.create({ data: { name: '__test_delete_me__' } })
  const read = await db.branch.findUnique({ where: { id: created.id } })
  await db.branch.delete({ where: { id: created.id } })

  if (read?.name !== '__test_delete_me__') throw new Error('קריאה חזרה לא תאמה!')
  console.log('  ✓ כתיבה/קריאה/מחיקה: תקין\n')

  // 3. בדיקת enum UserRole
  console.log('--- בדיקת enums ---')
  const adminUser = await db.user.findFirst({ where: { role: 'admin' } })
  console.log(`  ✓ UserRole enum: תקין (admin קיים: ${adminUser ? 'כן' : 'לא'})`)

  // 4. סיכום
  console.log('\n=== כל הבדיקות עברו בהצלחה ✓ ===\n')
}

main()
  .catch((e) => {
    console.error('\n✗ שגיאה:', e.message)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
