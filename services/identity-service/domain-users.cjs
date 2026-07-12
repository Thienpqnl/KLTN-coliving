const domainUserSelect = {
  id: true,
  email: true,
  name: true,
  fullName: true,
  phone: true,
  phoneVerified: true,
  avatarUrl: true,
  gender: true,
  birthDate: true,
  address: true,
  role: true,
  status: true,
  createdAt: true,
};

async function getDomainUsers(prisma, ids) {
  const userIds = [...new Set((ids || []).map(String).filter(Boolean))];
  if (userIds.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: domainUserSelect,
  });
  const order = new Map(userIds.map((id, index) => [id, index]));
  return users.sort((a, b) => order.get(a.id) - order.get(b.id));
}

async function getDomainUser(prisma, id) {
  return prisma.user.findUnique({ where: { id }, select: domainUserSelect });
}

async function searchDomainUsers(prisma, input = {}) {
  const search = String(input.search || "").trim();
  const role = input.role ? String(input.role) : undefined;
  const status = input.status ? String(input.status) : undefined;
  return prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { fullName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    },
    select: domainUserSelect,
    orderBy: { createdAt: "desc" },
    take: Math.min(1000, Math.max(1, Number(input.limit || 500))),
  });
}

module.exports = { domainUserSelect, getDomainUser, getDomainUsers, searchDomainUsers };
