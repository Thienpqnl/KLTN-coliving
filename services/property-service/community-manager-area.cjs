const identityClient = require("../shared/identity-client.cjs");

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

const mergedProvinceGroups = [
  ["tuyen quang", "ha giang"],
  ["lao cai", "yen bai"],
  ["thai nguyen", "bac kan"],
  ["phu tho", "vinh phuc", "hoa binh"],
  ["bac ninh", "bac giang"],
  ["hung yen", "thai binh"],
  ["hai phong", "hai duong"],
  ["ninh binh", "ha nam", "nam dinh"],
  ["quang tri", "quang binh"],
  ["da nang", "quang nam"],
  ["quang ngai", "kon tum"],
  ["gia lai", "binh dinh"],
  ["khanh hoa", "ninh thuan"],
  ["lam dong", "dak nong", "binh thuan"],
  ["dak lak", "phu yen"],
  ["ho chi minh", "hcm", "sai gon", "saigon", "binh duong", "ba ria vung tau"],
  ["dong nai", "binh phuoc"],
  ["tay ninh", "long an"],
  ["can tho", "soc trang", "hau giang"],
  ["vinh long", "ben tre", "tra vinh"],
  ["dong thap", "tien giang"],
  ["ca mau", "bac lieu"],
  ["an giang", "kien giang"],
];

const mergedProvinceAliases = new Map();
for (const [currentName, ...legacyNames] of mergedProvinceGroups) {
  for (const name of [currentName, ...legacyNames]) mergedProvinceAliases.set(name, currentName);
}

function normalizeLocation(value) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0111\u0110]/g, (character) => (character === "\u0110" ? "D" : "d"))
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

function provinceKeys(value) {
  const normalized = normalizeLocation(value);
  if (!normalized) return new Set();
  const keys = new Set();
  for (const [alias, currentName] of mergedProvinceAliases) {
    if (normalized === alias || normalized.includes(alias)) keys.add(currentName);
  }
  if (keys.size === 0) keys.add(canonicalLocationKey(value));
  return keys;
}

function provinceMatches(roomValue, areaValue) {
  const roomKeys = provinceKeys(roomValue);
  const areaKeys = provinceKeys(areaValue);
  return [...roomKeys].some((key) => areaKeys.has(key));
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
  for (const provinceKey of provinceKeys(city)) {
    if (northernCities.has(provinceKey)) return "NORTH";
    if (centralCities.has(provinceKey)) return "CENTRAL";
    if (southernCities.has(provinceKey)) return "SOUTH";
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
  let matchedCriterion = false;

  if (area.wardCode && room.wardCode) {
    matchedCriterion = true;
    if (!codesMatch(area.wardCode, room.wardCode)) return false;
  }
  if (area.ward) {
    matchedCriterion = true;
    if (!locationIncludes(room.ward, area.ward) && !locationIncludes(room.address, area.ward)) return false;
  }
  if (area.provinceCode && room.provinceCode) {
    matchedCriterion = true;
    if (!codesMatch(area.provinceCode, room.provinceCode)) return false;
  }
  if (area.city) {
    matchedCriterion = true;
    const cityMatches = provinceMatches(room.city, area.city) || provinceMatches(room.address, area.city);
    if (!cityMatches && !locationIncludes(room.city, area.city) && !locationIncludes(room.address, area.city)) return false;
  }
  if (area.districtId && room.districtId) {
    matchedCriterion = true;
    if (normalizeLocation(area.districtId) !== normalizeLocation(room.districtId)) return false;
  }
  if (area.district) {
    matchedCriterion = true;
    if (!locationIncludes(room.district, area.district) && !locationIncludes(room.address, area.district)) return false;
  }
  if (area.region) {
    matchedCriterion = true;
    if (area.region !== inferServiceRegion(room.city) && area.region !== inferServiceRegion(room.address)) return false;
  }
  return matchedCriterion;
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

async function findBestManagerForRoom(prisma, room, clients = identityClient) {
  const managers = await clients.searchUsers({
    role: "COMMUNITY_MANAGER",
    status: "ACTIVE",
  });
  const areas = await prisma.communityManagerArea.findMany({
    where: { managerId: { in: managers.map((manager) => manager.id) }, isActive: true },
  });
  const areasByManager = new Map();
  for (const area of areas) {
    const values = areasByManager.get(area.managerId) || [];
    values.push(area);
    areasByManager.set(area.managerId, values);
  }
  const managersWithAreas = managers.map((manager) => ({
    ...manager,
    communityManagerAreas: areasByManager.get(manager.id) || [],
  }));

  const candidates = managersWithAreas.filter((manager) =>
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

async function listManagersWithAreas(prisma, identity, clients = identityClient) {
  if (identity.role !== "ADMIN") {
    return {
      status: 403,
      payload: { message: "Chỉ admin được quản lý khu vực phụ trách" },
    };
  }

  const managers = await clients.searchUsers({ role: "COMMUNITY_MANAGER" });
  const managerIds = managers.map((manager) => manager.id);
  const [areas, loads] = await Promise.all([
    prisma.communityManagerArea.findMany({
      where: { managerId: { in: managerIds } },
      orderBy: [{ region: "asc" }, { city: "asc" }, { ward: "asc" }, { district: "asc" }],
    }),
    prisma.roomVerification.groupBy({
      by: ["assignedManagerId"],
      where: { assignedManagerId: { in: managerIds }, room: { status: "PENDING" } },
      _count: { _all: true },
    }),
  ]);
  const areasByManager = new Map();
  for (const area of areas) {
    const values = areasByManager.get(area.managerId) || [];
    values.push(area);
    areasByManager.set(area.managerId, values);
  }
  const loadByManager = new Map(loads.map((row) => [row.assignedManagerId, row._count._all]));
  return {
    status: 200,
    payload: managers.map((manager) => ({
      ...manager,
      communityManagerAreas: areasByManager.get(manager.id) || [],
      _count: { managedRoomVerifications: loadByManager.get(manager.id) || 0 },
    })),
  };
}

async function replaceManagerAreas(prisma, identity, managerId, areas, clients = identityClient) {
  if (identity.role !== "ADMIN") {
    return {
      status: 403,
      payload: { message: "Chỉ admin được quản lý khu vực phụ trách" },
    };
  }

  let manager;
  try {
    manager = await clients.getUser(managerId);
  } catch (error) {
    if (error.status === 404) manager = null;
    else throw error;
  }

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

  const managerAreas = await prisma.$transaction(async (tx) => {
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

    return tx.communityManagerArea.findMany({
      where: { managerId },
      orderBy: [{ region: "asc" }, { city: "asc" }, { ward: "asc" }, { district: "asc" }],
    });
  });

  return { status: 200, payload: { ...manager, communityManagerAreas: managerAreas } };
}

module.exports = {
  areaMatchesRoom,
  provinceMatches,
  findBestManagerForRoom,
  getManagerActiveAreas,
  listManagersWithAreas,
  managerCanAccessRoom,
  replaceManagerAreas,
};
