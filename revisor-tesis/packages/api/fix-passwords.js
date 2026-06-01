const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('admin123', 12);
  await prisma.user.updateMany({ where: { email: 'admin@universidad.edu.pe' }, data: { passwordHash: adminHash }});
  
  const coordHash = await bcrypt.hash('coord123', 12);
  await prisma.user.updateMany({ where: { email: 'coordinador@universidad.edu.pe' }, data: { passwordHash: coordHash }});

  const asesorHash = await bcrypt.hash('asesor123', 12);
  await prisma.user.updateMany({ where: { email: 'asesor@universidad.edu.pe' }, data: { passwordHash: asesorHash }});

  const estHash = await bcrypt.hash('estudiante123', 12);
  await prisma.user.updateMany({ where: { email: 'estudiante@universidad.edu.pe' }, data: { passwordHash: estHash }});
  
  console.log('Passwords fixed!');
}

main().then(() => process.exit(0)).catch(console.error);
