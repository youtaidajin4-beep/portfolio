/**
 * Firestore ドキュメント → フロント共通形式
 */

function parseRentYen(v) {
  if (typeof v === 'number' && !isNaN(v)) return Math.round(v);
  var s = String(v == null ? '' : v).replace(/[,\s，円]/g, '');
  if (!s) return null;
  var m = s.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  var n = parseFloat(m[1]);
  if (isNaN(n)) return null;
  if (n < 1000) return Math.round(n * 10000);
  return Math.round(n);
}

function formatRentDisplay(rentYen, rentFallback) {
  if (rentYen != null && !isNaN(rentYen)) {
    if (rentYen >= 10000) return Math.round(rentYen / 10000 * 10) / 10 + '万円';
    return String(rentYen) + '円';
  }
  return rentFallback != null ? String(rentFallback) : '—';
}

function tagList(v) {
  if (Array.isArray(v)) {
    return v.map(function (x) { return String(x || '').trim(); }).filter(Boolean);
  }
  return String(v || '')
    .split(/[,\n、，]/)
    .map(function (x) { return String(x || '').trim(); })
    .filter(Boolean);
}

function textValue(v) {
  return String(v == null ? '' : v).trim();
}

function numberOrNull(v) {
  if (v == null || v === '') return null;
  var n = Number(v);
  return isNaN(n) ? null : n;
}

function boolFrom(data, keys) {
  for (var i = 0; i < keys.length; i++) {
    if (data[keys[i]] === true) return true;
  }
  return false;
}

function isPublishedStatus(status) {
  if (!status) return true;
  return /公開|public|公開中/i.test(String(status));
}

function deriveShortReason(story, maxLen) {
  maxLen = maxLen != null ? maxLen : 26;
  var s = String(story || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  var arr = Array.from(s);
  if (arr.length <= maxLen) return s;
  return arr.slice(0, maxLen - 1).join('') + '…';
}

function layoutGroupFromLayout(layout) {
  var t = String(layout || '').toUpperCase().replace(/\s/g, '');
  if (/1R|1K/.test(t)) return 'compact';
  if (/LDK|2K|3K|4K/.test(t)) return 'wide';
  if (/1DK|2DK/.test(t)) return 'mid';
  return 'mid';
}

function filterRegionFromCity(city) {
  var c = String(city || '');
  if (/諫早/.test(c)) return 'isahaya';
  if (/大村/.test(c)) return 'omura';
  return 'nagasaki';
}

function deriveListingFeatures(data) {
  var f = [];
  var station = String(data.station || '');
  if (/駅/.test(station)) f.push('station');
  if (data.pet_ok === true || data.petAllowed === true) f.push('pet');
  if (/新築|築浅/.test(String(data.buildingAge || '') + (data.story || '') + (data.builtYear || ''))) f.push('new');
  if (boolFrom(data, ['internetFree', 'internet_free'])) f.push('internet');
  if (boolFrom(data, ['autoLock', 'auto_lock'])) f.push('security');
  if (boolFrom(data, ['deliveryBox', 'delivery_box'])) f.push('delivery_box');
  if (boolFrom(data, ['super_near', 'supermarketNearby'])) f.push('supermarket_near');
  return f;
}

function normalizeFirestoreProperty(id, data) {
  data = data || {};
  var rentYen = data.rentYen != null ? Number(data.rentYen) : parseRentYen(data.rent);
  if (rentYen != null && isNaN(rentYen)) rentYen = null;
  var rentMan = rentYen != null ? Math.round((rentYen / 10000) * 10) / 10 : null;
  var images = tagList(data.images);
  if (!images.length && data.image) images = [String(data.image).trim()];
  var story = String(data.story || data.comment || '').trim();
  var name = String(data.name || data.title || '物件').trim();
  var city = String(data.city || '').trim();
  var area = String(data.area || city || '—').trim();
  var layout = String(data.layout || '—').trim();
  var shortReason = String(data.shortReason || data.short_reason || '').trim();
  if (!shortReason && story) shortReason = deriveShortReason(story, 26);
  var mainImageIndex = numberOrNull(data.mainImageIndex) || 0;
  if (mainImageIndex < 0 || mainImageIndex >= images.length) mainImageIndex = 0;
  var mainImage = images[mainImageIndex] || images[0] || '';

  var out = {
    id: String(id || data.id || '').trim(),
    name: name,
    title: name,
    propertyType: textValue(data.propertyType),
    catchCopy: textValue(data.catchCopy),
    applicationStatus: textValue(data.applicationStatus),
    rent: formatRentDisplay(rentYen, data.rent),
    rentYen: rentYen,
    rentMan: rentMan,
    managementFeeYen: numberOrNull(data.managementFeeYen),
    deposit: textValue(data.deposit),
    keyMoney: textValue(data.keyMoney),
    brokerageFee: textValue(data.brokerageFee),
    renewalFee: textValue(data.renewalFee),
    insuranceFee: textValue(data.insuranceFee),
    guarantorFee: textValue(data.guarantorFee),
    initialCostNote: textValue(data.initialCostNote),
    layout: layout,
    floorPlanDetail: textValue(data.floorPlanDetail),
    exclusiveAreaSqm: numberOrNull(data.exclusiveAreaSqm),
    floor: textValue(data.floor),
    totalFloors: textValue(data.totalFloors),
    city: city,
    area: area,
    address: textValue(data.address),
    station: String(data.station || '').trim(),
    station_info: String(data.station || data.station_info || '').trim(),
    busStop: textValue(data.busStop),
    walkMinutes: numberOrNull(data.walkMinutes),
    buildingAge: String(data.buildingAge || '').trim(),
    builtYear: textValue(data.builtYear),
    structure: textValue(data.structure),
    orientation: textValue(data.orientation),
    unitNumber: textValue(data.unitNumber),
    parking: String(data.parking || '').trim(),
    bicycleParking: textValue(data.bicycleParking),
    motorbikeParking: textValue(data.motorbikeParking),
    safetyLevel: String(data.safetyLevel || '').trim(),
    availableFrom: textValue(data.availableFrom),
    contractTerm: textValue(data.contractTerm),
    transactionType: textValue(data.transactionType),
    tags: tagList(data.tags),
    atmosphere_tags: tagList(data.atmosphere_tags || data.atmosphereTags),
    atmosphereTags: tagList(data.atmosphere_tags || data.atmosphereTags),
    nearby_tags: tagList(data.nearby_tags || data.nearbyTags),
    nearbyTags: tagList(data.nearby_tags || data.nearbyTags),
    lifestyle_tags: tagList(data.lifestyle_tags || data.lifestyleTags),
    lifestyleTags: tagList(data.lifestyle_tags || data.lifestyleTags),
    target_persona: textValue(data.target_persona || data.targetPersona),
    targetPersona: textValue(data.target_persona || data.targetPersona),
    appeal_points: tagList(data.appeal_points || data.appealPoints),
    appealPoints: tagList(data.appeal_points || data.appealPoints),
    avoid_points: tagList(data.avoid_points || data.avoidPoints),
    avoidPoints: tagList(data.avoid_points || data.avoidPoints),
    search_keywords: tagList(data.search_keywords || data.searchKeywords),
    searchKeywords: tagList(data.search_keywords || data.searchKeywords),
    internalMemo: textValue(data.internalMemo),
    story: story,
    comment: story,
    story_comment: story,
    shortReason: shortReason,
    short_reason: shortReason,
    images: images,
    image: mainImage,
    image1: images[0] || '',
    image2: images[1] || '',
    image3: images[2] || '',
    imageCaptions: tagList(data.imageCaptions),
    mainImageIndex: mainImageIndex,
    status: String(data.status || '公開').trim(),
    views: Number(data.views) || 0,
    washstand: data.washstand === true,
    bath_toilet_separate: data.bath_toilet_separate === true || data.bathToiletSeparate === true,
    bathToiletSeparate: data.bath_toilet_separate === true || data.bathToiletSeparate === true,
    pet_ok: data.pet_ok === true || data.petAllowed === true,
    petAllowed: data.pet_ok === true || data.petAllowed === true,
    internetFree: boolFrom(data, ['internetFree', 'internet_free']),
    autoLock: boolFrom(data, ['autoLock', 'auto_lock']),
    deliveryBox: boolFrom(data, ['deliveryBox', 'delivery_box']),
    aircon: data.aircon === true,
    indoorLaundry: boolFrom(data, ['indoorLaundry', 'indoor_laundry']),
    balcony: data.balcony === true,
    reheatingBath: boolFrom(data, ['reheatingBath', 'reheating_bath']),
    systemKitchen: boolFrom(data, ['systemKitchen', 'system_kitchen']),
    super_near: data.super_near === true || data.supermarketNearby === true,
    supermarketNearby: data.super_near === true || data.supermarketNearby === true,
    school_near: data.school_near === true || data.schoolNearby === true,
    schoolNearby: data.school_near === true || data.schoolNearby === true,
    convenienceStoreNear: boolFrom(data, ['convenienceStoreNear', 'convenience_store_near']),
    hospitalNear: boolFrom(data, ['hospitalNear', 'hospital_near']),
    parkNear: boolFrom(data, ['parkNear', 'park_near']),
    shoppingStreetNear: boolFrom(data, ['shoppingStreetNear', 'shopping_street_near']),
    nearbyNote: textValue(data.nearbyNote),
    detailUrl: 'property.html?id=' + encodeURIComponent(String(id || data.id || '')),
    filterRegion: filterRegionFromCity(city),
    layoutGroup: layoutGroupFromLayout(layout),
    features: deriveListingFeatures(data)
  };
  return out;
}

function docToProperty(doc) {
  if (!doc || !doc.exists) return null;
  return normalizeFirestoreProperty(doc.id, doc.data());
}

module.exports = {
  isPublishedStatus: isPublishedStatus,
  normalizeFirestoreProperty: normalizeFirestoreProperty,
  docToProperty: docToProperty,
  parseRentYen: parseRentYen,
  formatRentDisplay: formatRentDisplay,
  tagList: tagList
};
