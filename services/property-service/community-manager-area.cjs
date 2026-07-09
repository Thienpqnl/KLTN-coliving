const northernCities = new Set([
  "ha noi",
  "hai phong",
  "quang ninh",
  "bac ninh",
  "hai duong",
  "hung yen",
  "thai binh",
  "nam dinh",
  "ninh binh",
  "ha nam",
  "vinh phuc",
  "phu tho",
  "thai nguyen",
  "bac giang",
  "lang son",
  "cao bang",
  "bac kan",
  "tuyen quang",
  "ha giang",
  "lao cai",
  "yen bai",
  "son la",
  "dien bien",
  "lai chau",
  "hoa binh",
]);

const centralCities = new Set([
  "thanh hoa",
  "nghe an",
  "ha tinh",
  "quang binh",
  "quang tri",
  "thua thien hue",
  "hue",
  "da nang",
  "quang nam",
  "quang ngai",
  "binh dinh",
  "phu yen",
  "khanh hoa",
  "ninh thuan",
  "binh thuan",
  "kon tum",
  "gia lai",
  "dak lak",
  "dak nong",
  "lam dong",
]);

const southernCities = new Set([
  "ho chi minh",
  "tp ho chi minh",
  "hcm",
  "ba ria vung tau",
  "dong nai",
  "binh duong",
  "binh phuoc",
  "tay ninh",
  "long an",
  "tien giang",
  "ben tre",
  "tra vinh",
  "vinh long",
  "dong thap",
  "an giang",
  "kien giang",
  "can tho",
  "hau giang",
  "soc trang",
  "bac lieu",
  "ca mau",
]);

function normalizeLocation(value) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^(tp|tp\.|thanh pho|tinh|quan|huyen|thi xa)\s+/i, "")
    .replace(/\b(city|province|district|ward|vietnam|viet nam)\b/gi, "")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function canonicalLocationKey(value) {
  const normalized = normalizeLocation(value);
  if (!normalized) return "";

  if (
    [
      "ho chi minh",
      "hcm",
      "tp hcm",
      "tphcm",
      "sai gon",
      "saigon",
      "ho chi minh city",
    ].includes(normalized)
  ) {
    return "ho-chi-minh";
  }

  if (["ha noi", "hanoi"].includes(normalized)) return "ha-noi";
  if (["da nang", "danang"].includes(normalized)) return "da-nang";
  if (["can tho", "cantho"].includes(normalized)) return "can-tho";
  if (["hai phong", "haiphong"].includes(normalized)) return "hai-phong";
  if (["thua thien hue", "hue"].includes(normalized)) return "hue";

  return normalized.replace(/\s+/g, "-");
}

function locationIncludes(roomValue, areaValue) {
  const roomKey = canonicalLocationKey(roomValue);
  const areaKey = canonicalLocationKey(areaValue);
  if (!roomKey || !areaKey) return false;
  return roomKey === areaKey || roomKey.includes(areaKey) || areaKey.includes(roomKey);
}

function codesMatch(left, right) {
  const leftCode = normalizeLocation(left);
  const rightCode = normalizeLocation(right);
  return Boolean(leftCode && rightCode && leftCode === rightCode);
}

function inferServiceRegion(city) {
  const normalizedCity = normalizeLocation(city);
  const cityKey = canonicalLocationKey(city);
  if (!normalizedCity) return null;
  if (cityKey === "ho-chi-minh") return "SOUTH";
  if (cityKey === "ha-noi" || cityKey === "hai-phong") return "NORTH";
  if (cityKey === "da-nang" || cityKey === "hue") return "CENTRAL";
  if (
    normalizedCity.includes("ho chi minh") ||
    normalizedCity.includes("sai gon") ||
    normalizedCity.includes("saigon")
  ) {
    return "SOUTH";
  }
  if (normalizedCity.includes("ha noi") || normalizedCity.includes("hanoi")) return "NORTH";
  if (
    normalizedCity.includes("da nang") ||
    normalizedCity.includes("danang") ||
    normalizedCity.includes("hue")
  ) {
    return "CENTRAL";
  }
  if (northernCities.has(normalizedCity)) return "NORTH";
  if (centralCities.has(normalizedCity)) return "CENTRAL";
  if (southernCities.has(normalizedCity)) return "SOUTH";
  return null;
}

function isGlobalScope(area) {
  return !area.region &&
    !area.city &&
    !area.provinceCode &&
    !area.ward &&
    !area.wardCode &&
    !area.district &&
    !area.districtId;
}

function areaMatchesRoom(area, room) {
  if (isGlobalScope(area)) return true;
  if (area.wardCode) return codesMatch(area.wardCode, room.wardCode);
  if (area.ward) return locationIncludes(room.ward, area.ward) || locationIncludes(room.address, area.ward);
  if (area.provinceCode) return codesMatch(area.provinceCode, room.provinceCode);
  if (area.city) return locationIncludes(room.city, area.city) || locationIncludes(room.address, area.city);
  if (area.districtId) return normalizeLocation(area.districtId) === normalizeLocation(room.districtId);
  if (area.district) return locationIncludes(room.district, area.district) || locationIncludes(room.address, area.district);
  if (area.region) return area.region === inferServiceRegion(room.city) || area.region === inferServiceRegion(room.address);
  return false;
}

async function getManagerActiveAreas(prisma, managerId) {
  return prisma.communityManagerArea.findMany({
    where: { managerId, isActive: true },
    select: { region: true, city: true, provinceCode: true, ward: true, wardCode: true, district: true, districtId: true },
  });
}

async function managerCanAccessRoom(prisma, managerId, room) {
  const areas = await getManagerActiveAreas(prisma, managerId);
  return areas.some((area) => areaMatchesRoom(area, room));
}

async function findBestManagerForRoom(prisma, room) {
  const managers = await prisma.user.findMany({
    where: {
      role: "COMMUNITY_MANAGER",
      status: "ACTIVE",
      communityManagerAreas: { some: { isActive: true } },
    },
    select: {
      id: true,
      communityManagerAreas: {
        where: { isActive: true },
        select: {
          region: true,
          city: true,
          provinceCode: true,
          ward: true,
          wardCode: true,
          district: true,
          districtId: true,
        },
      },
    },
  });

  const candidates = managers.filter((manager) =>
    manager.communityManagerAreas.some((area) => areaMatchesRoom(area, room)),
  );
  if (candidates.length === 0) return null;

  const load = await prisma.roomVerification.groupBy({
    by: ["assignedManagerId"],
    where: {
      assignedManagerId: { in: candidates.map((manager) => manager.id) },
      room: { status: "PENDING" },
    },
    _count: { _all: true },
  });
  const loadByManager = new Map(load.map((item) => [item.assignedManagerId, item._count._all]));

  return candidates
    .sort((left, right) => {
      const leftLoad = loadByManager.get(left.id) || 0;
      const rightLoad = loadByManager.get(right.id) || 0;
      return leftLoad - rightLoad || left.id.localeCompare(right.id);
    })[0];
}

async function listManagersWithAreas(prisma, identity) {
  if (identity.role !== "ADMIN") {
    return {
      status: 403,
      payload: { message: "Chỉ admin được quản lý khu vực phụ trách" },
    };
  }

  const managers = await prisma.user.findMany({
    where: { role: "COMMUNITY_MANAGER" },
    select: {
      id: true,
      name: true,
      fullName: true,
      email: true,
      phone: true,
      status: true,
      communityManagerAreas: {
        orderBy: [
          { region: "asc" },
          { city: "asc" },
          { ward: "asc" },
          { district: "asc" },
        ],
      },
      _count: {
        select: {
          managedRoomVerifications: {
            where: { room: { status: "PENDING" } },
          },
        },
      },
    },
    orderBy: [{ status: "asc" }, { fullName: "asc" }, { email: "asc" }],
  });

  return { status: 200, payload: managers };
}

async function replaceManagerAreas(prisma, identity, managerId, areas) {
  if (identity.role !== "ADMIN") {
    return {
      status: 403,
      payload: { message: "Chỉ admin được quản lý khu vực phụ trách" },
    };
  }

  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    select: { id: true, role: true },
  });

  if (!manager) {
    return {
      status: 404,
      payload: { message: "Không tìm thấy nhân viên quản lý cộng đồng" },
    };
  }

  if (manager.role !== "COMMUNITY_MANAGER") {
    return {
      status: 400,
      payload: { message: "Chỉ có thể gán khu vực cho tài khoản Community Manager" },
    };
  }

  const managerWithAreas = await prisma.$transaction(async (tx) => {
    await tx.communityManagerArea.deleteMany({ where: { managerId } });

    if (areas.length > 0) {
      await tx.communityManagerArea.createMany({
        data: areas.map((area) => ({
          managerId,
          region: area.region || null,
          city: area.city?.trim() || null,
          provinceCode: area.provinceCode?.trim() || null,
          ward: area.ward?.trim() || null,
          wardCode: area.wardCode?.trim() || null,
          district: area.district?.trim() || null,
          districtId: area.districtId?.trim() || null,
          isActive: area.isActive ?? true,
        })),
        skipDuplicates: true,
      });
    }

    return tx.user.findUnique({
      where: { id: managerId },
      select: {
        id: true,
        name: true,
        fullName: true,
        email: true,
        phone: true,
        status: true,
        communityManagerAreas: {
          orderBy: [
            { region: "asc" },
            { city: "asc" },
            { ward: "asc" },
            { district: "asc" },
          ],
        },
      },
    });
  });

  return { status: 200, payload: managerWithAreas };
}

module.exports = {
  areaMatchesRoom,
  findBestManagerForRoom,
  getManagerActiveAreas,
  listManagersWithAreas,
  managerCanAccessRoom,
  replaceManagerAreas,
};
