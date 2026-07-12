import { Role, RoomStatus, ServiceRegion, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";

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
  ["tuyen quang", "ha giang"], ["lao cai", "yen bai"], ["thai nguyen", "bac kan"],
  ["phu tho", "vinh phuc", "hoa binh"], ["bac ninh", "bac giang"],
  ["hung yen", "thai binh"], ["hai phong", "hai duong"],
  ["ninh binh", "ha nam", "nam dinh"], ["quang tri", "quang binh"],
  ["da nang", "quang nam"], ["quang ngai", "kon tum"],
  ["gia lai", "binh dinh"], ["khanh hoa", "ninh thuan"],
  ["lam dong", "dak nong", "binh thuan"], ["dak lak", "phu yen"],
  ["ho chi minh", "hcm", "sai gon", "saigon", "binh duong", "ba ria vung tau"],
  ["dong nai", "binh phuoc"], ["tay ninh", "long an"],
  ["can tho", "soc trang", "hau giang"], ["vinh long", "ben tre", "tra vinh"],
  ["dong thap", "tien giang"], ["ca mau", "bac lieu"],
  ["an giang", "kien giang"],
] as const;

const mergedProvinceAliases = new Map<string, string>();
for (const [currentName, ...legacyNames] of mergedProvinceGroups) {
  for (const name of [currentName, ...legacyNames]) mergedProvinceAliases.set(name, currentName);
}

type AreaScope = {
  region?: ServiceRegion | null;
  city?: string | null;
  provinceCode?: string | null;
  ward?: string | null;
  wardCode?: string | null;
  district?: string | null;
  districtId?: string | null;
};

type RoomLocation = {
  city?: string | null;
  provinceCode?: string | null;
  ward?: string | null;
  wardCode?: string | null;
  district?: string | null;
  districtId?: string | null;
  address?: string | null;
};

function normalizeLocation(value?: string | null) {
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

function canonicalLocationKey(value?: string | null) {
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

function locationIncludes(roomValue?: string | null, areaValue?: string | null) {
  const roomKey = canonicalLocationKey(roomValue);
  const areaKey = canonicalLocationKey(areaValue);
  if (!roomKey || !areaKey) return false;
  return roomKey === areaKey || roomKey.includes(areaKey) || areaKey.includes(roomKey);
}

function provinceKeys(value?: string | null) {
  const normalized = normalizeLocation(value);
  if (!normalized) return new Set<string>();
  const keys = new Set<string>();
  for (const [alias, currentName] of mergedProvinceAliases) {
    if (normalized === alias || normalized.includes(alias)) keys.add(currentName);
  }
  if (keys.size === 0) keys.add(canonicalLocationKey(value));
  return keys;
}

function provinceMatches(roomValue?: string | null, areaValue?: string | null) {
  const roomKeys = provinceKeys(roomValue);
  const areaKeys = provinceKeys(areaValue);
  return [...roomKeys].some((key) => areaKeys.has(key));
}

function codesMatch(left?: string | null, right?: string | null) {
  const leftCode = normalizeLocation(left);
  const rightCode = normalizeLocation(right);
  return Boolean(leftCode && rightCode && leftCode === rightCode);
}

export function inferServiceRegion(city?: string | null): ServiceRegion | null {
  const normalizedCity = normalizeLocation(city);
  const cityKey = canonicalLocationKey(city);
  if (!normalizedCity) return null;
  if (cityKey === "ho-chi-minh") return ServiceRegion.SOUTH;
  if (cityKey === "ha-noi" || cityKey === "hai-phong") return ServiceRegion.NORTH;
  if (cityKey === "da-nang" || cityKey === "hue") return ServiceRegion.CENTRAL;
  if (normalizedCity.includes("ho chi minh") || normalizedCity.includes("sai gon") || normalizedCity.includes("saigon")) {
    return ServiceRegion.SOUTH;
  }
  if (normalizedCity.includes("ha noi") || normalizedCity.includes("hanoi")) return ServiceRegion.NORTH;
  if (normalizedCity.includes("da nang") || normalizedCity.includes("danang") || normalizedCity.includes("hue")) {
    return ServiceRegion.CENTRAL;
  }
  for (const provinceKey of provinceKeys(city)) {
    if (northernCities.has(provinceKey)) return ServiceRegion.NORTH;
    if (centralCities.has(provinceKey)) return ServiceRegion.CENTRAL;
    if (southernCities.has(provinceKey)) return ServiceRegion.SOUTH;
  }
  if (northernCities.has(normalizedCity)) return ServiceRegion.NORTH;
  if (centralCities.has(normalizedCity)) return ServiceRegion.CENTRAL;
  if (southernCities.has(normalizedCity)) return ServiceRegion.SOUTH;
  return null;
}

function isGlobalScope(area: AreaScope) {
  return !area.region
    && !area.city
    && !area.provinceCode
    && !area.ward
    && !area.wardCode
    && !area.district
    && !area.districtId;
}

export function areaMatchesRoom(area: AreaScope, room: RoomLocation) {
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

export const communityManagerAreaService = {
  listManagersWithAreas: async () => {
    return prisma.user.findMany({
      where: { role: Role.COMMUNITY_MANAGER },
      select: {
        id: true,
        name: true,
        fullName: true,
        email: true,
        phone: true,
        status: true,
        communityManagerAreas: {
          orderBy: [{ region: "asc" }, { city: "asc" }, { ward: "asc" }, { district: "asc" }],
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
  },

  replaceManagerAreas: async (
    managerId: string,
    areas: Array<{
      region?: ServiceRegion | null;
      city?: string | null;
      provinceCode?: string | null;
      ward?: string | null;
      wardCode?: string | null;
      district?: string | null;
      districtId?: string | null;
      isActive?: boolean;
    }>
  ) => {
    const manager = await prisma.user.findUnique({
      where: { id: managerId },
      select: { id: true, role: true },
    });

    if (!manager) throw new ApiError(404, "Không tìm thấy nhân viên quản lý cộng đồng");
    if (manager.role !== Role.COMMUNITY_MANAGER) {
      throw new ApiError(400, "Chỉ có thể gán khu vực cho tài khoản Community Manager");
    }

    return prisma.$transaction(async (tx) => {
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
            orderBy: [{ region: "asc" }, { city: "asc" }, { ward: "asc" }, { district: "asc" }],
          },
        },
      });
    });
  },

  findBestManagerForRoom: async (room: RoomLocation) => {
    const managers = await prisma.user.findMany({
      where: {
        role: Role.COMMUNITY_MANAGER,
        status: UserStatus.ACTIVE,
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
      manager.communityManagerAreas.some((area) => areaMatchesRoom(area, room))
    );

    if (candidates.length === 0) return null;

    const load = await prisma.roomVerification.groupBy({
      by: ["assignedManagerId"],
      where: {
        assignedManagerId: { in: candidates.map((manager) => manager.id) },
        room: { status: RoomStatus.PENDING },
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
  },

  getManagerActiveAreas: async (managerId: string) => {
    return prisma.communityManagerArea.findMany({
      where: { managerId, isActive: true },
      select: { region: true, city: true, provinceCode: true, ward: true, wardCode: true, district: true, districtId: true },
    });
  },

  managerCanAccessRoom: async (managerId: string, room: RoomLocation) => {
    const areas = await prisma.communityManagerArea.findMany({
      where: { managerId, isActive: true },
      select: { region: true, city: true, provinceCode: true, ward: true, wardCode: true, district: true, districtId: true },
    });

    return areas.some((area) => areaMatchesRoom(area, room));
  },
};
