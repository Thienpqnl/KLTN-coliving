const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildLocationChanges,
  cleanImportedDistrict,
  loadPreferenceLocationCatalog,
  normalizeRoomLocation,
} = require("./lib/room-location-normalizer.cjs");

const catalog = loadPreferenceLocationCatalog();

test("normalizes a Ho Chi Minh ward from the address", () => {
  const room = {
    address: "14/17 Đường Đào Duy Anh, Phường Phú Nhuận, Hồ Chí Minh",
    district: "Cho thuê phòng trọ P. Cầu Kiệu",
    districtId: "CAU_KIEU",
    city: "Hồ Chí Minh",
    latitude: 10.8,
    longitude: 106.68,
  };
  const result = normalizeRoomLocation(room, catalog);
  assert.equal(result.confidence, "HIGH");
  assert.equal(result.location.districtId, "PHU_NHUAN");
  assert.equal(result.location.district, "P. Phú Nhuận");
  assert.equal(result.location.ward, "Phú Nhuận");
  assert.equal(buildLocationChanges(room, result).districtId, "PHU_NHUAN");
});

test("normalizes wards from Ha Noi and Da Nang", () => {
  const haNoi = normalizeRoomLocation({
    address: "Số 10, Phường Cổ Nhuế, Hà Nội",
    latitude: 21.05,
    longitude: 105.78,
  }, catalog);
  const daNang = normalizeRoomLocation({
    address: "12 Trần Phú, Phường Hải Châu, Đà Nẵng",
    latitude: 16.06,
    longitude: 108.22,
  }, catalog);
  assert.equal(haNoi.location.districtId, "CO_NHUE");
  assert.equal(daNang.location.districtId, "HAI_CHAU");
});

test("prefers the longest explicit administrative name", () => {
  const result = normalizeRoomLocation({
    address: "Phường An Phú Đông, Hồ Chí Minh",
    city: "Hồ Chí Minh",
  }, catalog);
  assert.equal(result.location.districtId, "AN_PHU_DONG");
});

test("does not invent a ward when the address cannot be matched", () => {
  const result = normalizeRoomLocation({ address: "Một địa chỉ chưa xác định" }, catalog);
  assert.equal(result.matched, false);
  assert.equal(result.confidence, "UNRESOLVED");
});

test("rejects advertising copy as an imported district", () => {
  assert.equal(cleanImportedDistrict("Cho thuê phòng trọ P. Bàn Cờ"), null);
  assert.equal(cleanImportedDistrict("P. Bàn Cờ"), "P. Bàn Cờ");
});
