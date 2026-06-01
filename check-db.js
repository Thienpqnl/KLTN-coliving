const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const users = await prisma.user.count();
  const rooms = await prisma.room.count();
  const bookings = await prisma.booking.count();
  console.log('Users:', users);
  console.log('Rooms:', rooms);
  console.log('Bookings:', bookings);
  await prisma.$disconnect();
})();
