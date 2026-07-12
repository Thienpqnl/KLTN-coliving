async function getUserPropertyCounts(prisma, userIds) {
  const ids = [...new Set((userIds || []).map(String).filter(Boolean))];
  if (ids.length === 0) return {};
  const rows = await prisma.room.groupBy({
    by: ["ownerId"],
    where: { ownerId: { in: ids } },
    _count: { _all: true },
  });
  return Object.fromEntries(
    rows.filter((row) => row.ownerId).map((row) => [row.ownerId, row._count._all]),
  );
}

module.exports = { getUserPropertyCounts };
