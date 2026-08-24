const fs = require("node:fs");
const path = require("node:path");

const CITY_CONFIG = {
  HO_CHI_MINH: {
    displayName: "Hồ Chí Minh",
    provinceCode: "79",
    marker: '{selectedCity === "HO_CHI_MINH"',
    aliases: [
      "ho chi minh", "tp ho chi minh", "tphcm", "sai gon",
      "binh duong", "ba ria vung tau", "ba ria", "vung tau",
    ],
  },
  HA_NOI: {
    displayName: "Hà Nội",
    provinceCode: "01",
    marker: '{selectedCity === "HA_NOI"',
    aliases: ["ha noi", "tp ha noi", "hanoi"],
  },
  DA_NANG: {
    displayName: "Đà Nẵng",
    provinceCode: "48",
    marker: '{selectedCity === "DA_NANG"',
    aliases: ["da nang", "tp da nang", "danang"],
  },
};

const CITY_ORDER = ["HO_CHI_MINH", "HA_NOI", "DA_NANG"];

function normalizeVietnamese(value) {
  return String(value || "")
    .replace(/[Đđ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function stripAdministrativePrefix(label) {
  return String(label || "")
    .replace(/^P\.\s*/iu, "")
    .replace(/^Phường\s+/iu, "")
    .replace(/^Xã\s+/iu, "")
    .replace(/^Đặc khu\s+/iu, "")
    .trim();
}

function administrativeKind(label) {
  if (/^Xã\s+/iu.test(label)) return "xa";
  if (/^Đặc khu\s+/iu.test(label)) return "dac_khu";
  return "phuong";
}

function loadPreferenceLocationCatalog(projectRoot = path.resolve(__dirname, "..", "..")) {
  const sourcePath = path.join(projectRoot, "app", "components", "PreferenceQuestionnaire.tsx");
  const source = fs.readFileSync(sourcePath, "utf8");
  const starts = CITY_ORDER.map((city) => {
    const index = source.indexOf(CITY_CONFIG[city].marker, 4_000);
    if (index < 0) throw new Error(`Không tìm thấy danh sách khu vực ${city} trong form sở thích`);
    return index;
  });
  const selectEnd = source.indexOf("</select>", starts.at(-1));
  if (selectEnd < 0) throw new Error("Không tìm thấy điểm kết thúc danh sách khu vực");
  starts.push(selectEnd);

  const byCity = {};
  const byCode = new Map();
  CITY_ORDER.forEach((city, index) => {
    const section = source.slice(starts[index], starts[index + 1]);
    const entries = [...section.matchAll(/<option value="([A-Z0-9_]+)">([^<]+)<\/option>/g)]
      .map((match) => {
        const label = match[2].trim();
        const name = stripAdministrativePrefix(label);
        return {
          code: match[1],
          label,
          name,
          kind: administrativeKind(label),
          normalizedName: normalizeVietnamese(name),
          city,
          cityName: CITY_CONFIG[city].displayName,
          provinceCode: CITY_CONFIG[city].provinceCode,
        };
      })
      .sort((left, right) => right.normalizedName.length - left.normalizedName.length);
    byCity[city] = entries;
    for (const entry of entries) {
      const existing = byCode.get(entry.code) || [];
      existing.push(entry);
      byCode.set(entry.code, existing);
    }
  });

  return { byCity, byCode };
}

function textContainsPhrase(text, phrase) {
  return (` ${text} `).includes(` ${phrase} `);
}

function inferCityFromText(value) {
  const normalized = normalizeVietnamese(value);
  if (!normalized) return null;
  for (const city of CITY_ORDER) {
    if (CITY_CONFIG[city].aliases.some((alias) => textContainsPhrase(normalized, alias))) {
      return city;
    }
  }
  return null;
}

function inferCityFromCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat >= 20.75 && lat <= 21.35 && lng >= 105.45 && lng <= 106.15) return "HA_NOI";
  if (lat >= 15.85 && lat <= 16.30 && lng >= 107.90 && lng <= 108.45) return "DA_NANG";
  const inOldHcm = lat >= 10.30 && lat <= 11.25 && lng >= 106.25 && lng <= 107.10;
  const inBinhDuong = lat >= 10.85 && lat <= 11.60 && lng >= 106.30 && lng <= 107.10;
  const inBaRiaVungTau = lat >= 9.90 && lat <= 10.85 && lng >= 106.90 && lng <= 107.70;
  return inOldHcm || inBinhDuong || inBaRiaVungTau ? "HO_CHI_MINH" : null;
}

function findAddressEntry(address, entries) {
  const normalizedAddress = normalizeVietnamese(address);
  if (!normalizedAddress) return null;

  let best = null;
  for (const entry of entries) {
    const name = entry.normalizedName;
    const explicitPrefixes = entry.kind === "phuong"
      ? [`phuong ${name}`, `p ${name}`]
      : entry.kind === "xa"
        ? [`xa ${name}`]
        : [`dac khu ${name}`];
    const explicit = explicitPrefixes.some((phrase) => textContainsPhrase(normalizedAddress, phrase));
    const bare = textContainsPhrase(normalizedAddress, name);
    if (!explicit && !bare) continue;
    const score = (explicit ? 1_000 : 100) + name.length;
    if (!best || score > best.score) best = { entry, explicit, score };
  }
  return best;
}

function isSuspiciousDistrict(value) {
  const normalized = normalizeVietnamese(value);
  if (!normalized) return false;
  return /^(cho thue|phong tro|can ho|nha tro|tim nguoi|sang nhuong)/.test(normalized);
}

function cleanImportedDistrict(value) {
  const text = String(value || "").trim();
  return text && !isSuspiciousDistrict(text) ? text : null;
}

function normalizeRoomLocation(room, catalog) {
  const addressCity = inferCityFromText(room.address);
  const coordinateCity = inferCityFromCoordinates(room.latitude, room.longitude);
  const storedCity = inferCityFromText(room.city);
  const candidateCities = [...new Set(
    [addressCity, coordinateCity, storedCity, ...CITY_ORDER].filter(Boolean),
  )];

  let match = null;
  for (const city of candidateCities) {
    const candidate = findAddressEntry(room.address, catalog.byCity[city] || []);
    if (!candidate) continue;
    const cityPriority = city === addressCity ? 300 : city === coordinateCity ? 200 : city === storedCity ? 100 : 0;
    const score = candidate.score + cityPriority;
    if (!match || score > match.score) match = { ...candidate, city, score };
  }

  if (!match) {
    return {
      matched: false,
      confidence: "UNRESOLVED",
      reason: "Không tìm thấy phường/xã trong địa chỉ theo danh mục hiện tại",
    };
  }

  const entry = match.entry;
  const cityConfirmed = addressCity === entry.city || coordinateCity === entry.city;
  const confidence = match.explicit && cityConfirmed ? "HIGH" : match.explicit ? "MEDIUM" : "LOW";
  return {
    matched: true,
    confidence,
    reason: match.explicit
      ? "Khớp tên phường/xã có tiền tố hành chính trong địa chỉ"
      : "Khớp tên khu vực trong địa chỉ nhưng thiếu tiền tố hành chính",
    location: {
      city: entry.cityName,
      provinceCode: entry.provinceCode,
      ward: entry.name,
      wardCode: entry.code,
      district: entry.label,
      districtId: entry.code,
    },
  };
}

function buildLocationChanges(room, normalized) {
  if (!normalized.matched) return {};
  return Object.fromEntries(
    Object.entries(normalized.location).filter(([field, value]) => String(room[field] || "") !== String(value || "")),
  );
}

module.exports = {
  CITY_CONFIG,
  CITY_ORDER,
  buildLocationChanges,
  cleanImportedDistrict,
  inferCityFromCoordinates,
  inferCityFromText,
  isSuspiciousDistrict,
  loadPreferenceLocationCatalog,
  normalizeRoomLocation,
  normalizeVietnamese,
  stripAdministrativePrefix,
};
