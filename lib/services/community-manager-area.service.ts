import { Prisma, Role, RoomStatus, ServiceRegion, UserStatus } from "@prisma/client";
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

type AreaScope = {
  region?: ServiceRegion | null;
  city?: string | null;
  district?: string | null;
  districtId?: string | null;
};

type RoomLocation = {
  city?: string | null;
  district?: string | null;
  districtId?: string | null;
};

function normalizeLocation(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^(tp|thanh pho|tinh|quan|huyen|thi xa)\s+/i, "")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function inferServiceRegion(city?: string | null): ServiceRegion | null {
  const normalizedCity = normalizeLocation(city);
  if (!normalizedCity) return null;
  if (northernCities.has(normalizedCity)) return ServiceRegion.NORTH;
  if (centralCities.has(normalizedCity)) return ServiceRegion.CENTRAL;
  if (southernCities.has(normalizedCity)) return ServiceRegion.SOUTH;
  return null;
}

function isGlobalScope(area: AreaScope) {
  return !area.region && !area.city && !area.district && !area.districtId;
}

export function areaMatchesRoom(area: AreaScope, room: RoomLocation) {
  if (isGlobalScope(area)) return true;

  if (area.districtId) {
    return normalizeLocation(area.districtId) === normalizeLocation(room.districtId);
  }

  if (area.district) {
    return normalizeLocation(area.district) === normalizeLocation(room.district);
  }

  if (area.city) {
    return normalizeLocation(area.city) === normalizeLocation(room.city);
  }

  if (area.region) {
    return area.region === inferServiceRegion(room.city);
  }

  return false;
}

function buildAreaRoomWhere(areas: AreaScope[]): Prisma.RoomWhereInput | null {
  const or: Prisma.RoomWhereInput[] = [];

  for (const area of areas) {
    if (isGlobalScope(area)) return {};
    if (area.districtId) {
      or.push({ districtId: { equals: area.districtId, mode: Prisma.QueryMode.insensitive } });
      continue;
    }
    if (area.district) {
      or.push({ district: { equals: area.district, mode: Prisma.QueryMode.insensitive } });
      continue;
    }
    if (area.city) {
      or.push({ city: { equals: area.city, mode: Prisma.QueryMode.insensitive } });
      continue;
    }
    if (area.region) {
      const cities =
        area.region === ServiceRegion.NORTH
          ? northernCities
          : area.region === ServiceRegion.CENTRAL
            ? centralCities
            : southernCities;

      or.push({
        OR: Array.from(cities).map((city) => ({
          city: { contains: city, mode: Prisma.QueryMode.insensitive },
        })),
      });
    }
  }

  return or.length ? { OR: or } : null;
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
          orderBy: [{ region: "asc" }, { city: "asc" }, { district: "asc" }],
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
            orderBy: [{ region: "asc" }, { city: "asc" }, { district: "asc" }],
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

  buildManagerRoomScopeWhere: async (managerId: string): Promise<Prisma.RoomWhereInput | null> => {
    const areas = await prisma.communityManagerArea.findMany({
      where: { managerId, isActive: true },
      select: { region: true, city: true, district: true, districtId: true },
    });

    return buildAreaRoomWhere(areas);
  },

  managerCanAccessRoom: async (managerId: string, room: RoomLocation) => {
    const areas = await prisma.communityManagerArea.findMany({
      where: { managerId, isActive: true },
      select: { region: true, city: true, district: true, districtId: true },
    });

    return areas.some((area) => areaMatchesRoom(area, room));
  },
};
