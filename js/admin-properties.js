/**
 * NAGA ROOM 物件管理（admin.html）
 * 要: js/firebase-client-config.js + Firebase Auth / Firestore
 */
(function () {
  'use strict';

  var db = null;
  var auth = null;
  var storage = null;
  var editingId = null;
  var uploadingImages = false;

  function $(id) {
    return document.getElementById(id);
  }

  function show(el) {
    if (el) el.classList.remove('nr-admin-hidden');
  }

  function hide(el) {
    if (el) el.classList.add('nr-admin-hidden');
  }

  function setMsg(el, text, isErr) {
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('nr-admin-msg--err', !!isErr);
    el.classList.toggle('nr-admin-msg--ok', !!text && !isErr);
  }

  function splitTags(str) {
    return String(str || '')
      .split(/[,\n、，]/)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
  }

  function splitImages(str) {
    var lines = String(str || '')
      .split(/\r?\n/)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    if (lines.length > 1) return lines;
    return splitTags(str);
  }

  function uniqList(items) {
    var seen = {};
    return (items || []).filter(function (item) {
      var v = String(item || '').trim();
      if (!v || seen[v]) return false;
      seen[v] = true;
      return true;
    });
  }

  function textValue(id) {
    var el = $(id);
    return el ? (el.value || '').trim() : '';
  }

  function numberValue(id) {
    var raw = textValue(id);
    if (!raw) return null;
    var n = Number(raw);
    return isNaN(n) ? null : n;
  }

  function boolValue(id) {
    var el = $(id);
    return !!(el && el.checked);
  }

  function setText(id, value) {
    var el = $(id);
    if (el) el.value = value != null ? value : '';
  }

  function setCheck(id, value) {
    var el = $(id);
    if (el) el.checked = value === true;
  }

  function readLineList(id) {
    var el = $(id);
    if (!el) return [];
    return String(el.value || '')
      .split(/\r?\n/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  function setTagField(id, value) {
    if (Array.isArray(value)) {
      setText(id, value.join(', '));
      return;
    }
    setText(id, value || '');
  }

  function trueFromAny(data, keys) {
    for (var i = 0; i < keys.length; i++) {
      if (data[keys[i]] === true) return true;
    }
    return false;
  }

  function appendImageUrls(urls) {
    var current = splitImages($('fImages').value);
    $('fImages').value = uniqList(current.concat(urls)).join('\n');
    renderImagePreview();
  }

  function renderImagePreview() {
    var host = $('adminImagePreview');
    if (!host) return;
    var images = splitImages($('fImages').value);
    host.innerHTML = '';
    images.forEach(function (src, idx) {
      var fig = document.createElement('figure');
      var img = document.createElement('img');
      var cap = document.createElement('figcaption');
      img.src = src;
      img.alt = '物件画像 ' + (idx + 1);
      cap.textContent = (idx === 0 ? 'メイン: ' : '') + src;
      fig.appendChild(img);
      fig.appendChild(cap);
      host.appendChild(fig);
    });
  }

  function randomId() {
    return 'nr_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function getLoader() {
    return window.NRFirebaseConfigLoader || null;
  }

  function initFirebase() {
    var loader = getLoader();
    var cfg = loader ? loader.resolve() : window.NR_FIREBASE_CONFIG;
    if (!cfg || !cfg.apiKey || !cfg.projectId) {
      return false;
    }
    window.NR_FIREBASE_CONFIG = cfg;
    if (!firebase.apps.length) {
      firebase.initializeApp(cfg);
    }
    auth = firebase.auth();
    db = firebase.firestore();
    storage = firebase.storage ? firebase.storage() : null;
    return true;
  }

  function needsSetup() {
    var loader = getLoader();
    if (loader && typeof loader.needsSetup === 'function') {
      return loader.needsSetup();
    }
    return !initFirebase();
  }

  function showSetup() {
    show($('adminSetupSection'));
    hide($('adminLoginSection'));
    hide($('adminAppSection'));
    hide($('adminConfigError'));
    loadFirestoreRules();
    if (getLoader() && !getLoader().needsSetup()) {
      show($('adminResetConfigBtn'));
    }
  }

  function showLoginOnly() {
    hide($('adminSetupSection'));
    show($('adminLoginSection'));
    hide($('adminAppSection'));
    hide($('adminConfigError'));
  }

  function loadFirestoreRules() {
    var ta = $('adminRulesText');
    if (!ta || ta.dataset.loaded === '1') return;
    fetch('firestore.rules')
      .then(function (res) {
        if (!res.ok) throw new Error('rules fetch failed');
        return res.text();
      })
      .then(function (text) {
        ta.value = text;
        ta.dataset.loaded = '1';
      })
      .catch(function () {
        ta.value =
          'rules_version = \'2\';\n' +
          'service cloud.firestore {\n' +
          '  match /databases/{database}/documents {\n' +
          '    match /properties/{propertyId} {\n' +
          '      allow read, write: if request.auth != null;\n' +
          '    }\n' +
          '  }\n' +
          '}';
        ta.dataset.loaded = '1';
      });
  }

  function readSetupForm() {
    return {
      apiKey: ($('setupApiKey').value || '').trim(),
      authDomain: ($('setupAuthDomain').value || '').trim(),
      projectId: ($('setupProjectId').value || '').trim(),
      storageBucket: ($('setupStorageBucket').value || '').trim(),
      messagingSenderId: ($('setupMessagingSenderId').value || '').trim(),
      appId: ($('setupAppId').value || '').trim()
    };
  }

  function fillSetupForm(cfg) {
    cfg = cfg || {};
    $('setupApiKey').value = cfg.apiKey || '';
    $('setupAuthDomain').value = cfg.authDomain || '';
    $('setupProjectId').value = cfg.projectId || '';
    $('setupStorageBucket').value = cfg.storageBucket || '';
    $('setupMessagingSenderId').value = cfg.messagingSenderId || '';
    $('setupAppId').value = cfg.appId || '';
  }

  function bindSetupUi() {
    $('adminCopyRulesBtn').addEventListener('click', function () {
      var text = ($('adminRulesText').value || '').trim();
      if (!text) {
        setMsg($('adminSetupMsg'), 'ルールを読み込み中です。少し待ってから再度お試しください。', true);
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(function () {
            setMsg($('adminSetupMsg'), 'ルールをコピーしました。Firebase Console の Firestore → ルール に貼り付けて公開してください。', false);
          })
          .catch(function () {
            $('adminRulesText').select();
            setMsg($('adminSetupMsg'), 'コピーできませんでした。テキストを選択して手動でコピーしてください。', true);
          });
      } else {
        $('adminRulesText').select();
        setMsg($('adminSetupMsg'), 'テキストを選択してコピー（Ctrl/Cmd+C）してください。', false);
      }
    });

    $('adminApplyJsonBtn').addEventListener('click', function () {
      var loader = getLoader();
      if (!loader) {
        setMsg($('adminSetupMsg'), '設定ローダーを読み込めません。', true);
        return;
      }
      var cfg = loader.parseConfigJson($('adminConfigJson').value);
      if (!cfg) {
        setMsg($('adminSetupMsg'), 'JSON の形式が正しくありません。firebaseConfig のオブジェクトを貼ってください。', true);
        return;
      }
      fillSetupForm(cfg);
      setMsg($('adminSetupMsg'), 'フォームに反映しました。内容を確認して「設定を保存して続行」を押してください。', false);
    });

    $('adminSaveConfigBtn').addEventListener('click', function () {
      var loader = getLoader();
      if (!loader) {
        setMsg($('adminSetupMsg'), '設定ローダーを読み込めません。', true);
        return;
      }
      var cfg = readSetupForm();
      if (!loader.save(cfg)) {
        setMsg($('adminSetupMsg'), 'apiKey と projectId は必須です。Firebase Console の Web アプリ設定を確認してください。', true);
        return;
      }
      if (!initFirebase()) {
        setMsg($('adminSetupMsg'), 'Firebase の初期化に失敗しました。', true);
        return;
      }
      setMsg($('adminSetupMsg'), '設定を保存しました。ログインしてください。', false);
      show($('adminResetConfigBtn'));
      showLoginOnly();
      bindUi();
      auth.onAuthStateChanged(function (user) {
        if (user) showApp(user);
        else showLoginOnly();
      });
    });

    $('adminResetConfigBtn').addEventListener('click', function () {
      if (!window.confirm('保存した Firebase 設定を削除して、セットアップ画面に戻りますか？')) return;
      var loader = getLoader();
      if (loader) loader.clearStorage();
      window.location.reload();
    });
  }

  function formToPayload() {
    var id = textValue('fId');
    var images = splitImages($('fImages').value);
    var mainImageIndex = numberValue('fMainImageIndex');
    if (mainImageIndex == null || mainImageIndex < 0 || mainImageIndex >= images.length) mainImageIndex = 0;
    var mainImage = images[mainImageIndex] || images[0] || '';
    return {
      id: id,
      name: textValue('fName'),
      status: $('fStatus').value || '下書き',
      propertyType: textValue('fPropertyType'),
      catchCopy: textValue('fCatchCopy'),
      applicationStatus: textValue('fApplicationStatus'),
      rent: textValue('fRent'),
      rentYen: numberValue('fRentYen'),
      managementFeeYen: numberValue('fManagementFeeYen'),
      deposit: textValue('fDeposit'),
      keyMoney: textValue('fKeyMoney'),
      brokerageFee: textValue('fBrokerageFee'),
      renewalFee: textValue('fRenewalFee'),
      insuranceFee: textValue('fInsuranceFee'),
      guarantorFee: textValue('fGuarantorFee'),
      initialCostNote: textValue('fInitialCostNote'),
      layout: textValue('fLayout'),
      floorPlanDetail: textValue('fFloorPlanDetail'),
      exclusiveAreaSqm: numberValue('fExclusiveAreaSqm'),
      floor: textValue('fFloor'),
      totalFloors: textValue('fTotalFloors'),
      city: textValue('fCity'),
      area: textValue('fArea'),
      address: textValue('fAddress'),
      station: textValue('fStation'),
      busStop: textValue('fBusStop'),
      walkMinutes: numberValue('fWalkMinutes'),
      buildingAge: textValue('fBuildingAge'),
      builtYear: textValue('fBuiltYear'),
      structure: textValue('fStructure'),
      orientation: textValue('fOrientation'),
      unitNumber: textValue('fUnitNumber'),
      parking: textValue('fParking'),
      bicycleParking: textValue('fBicycleParking'),
      motorbikeParking: textValue('fMotorbikeParking'),
      safetyLevel: textValue('fSafetyLevel'),
      availableFrom: textValue('fAvailableFrom'),
      contractTerm: textValue('fContractTerm'),
      transactionType: textValue('fTransactionType'),
      story: textValue('fStory'),
      shortReason: textValue('fShortReason'),
      tags: splitTags($('fTags').value),
      atmosphere_tags: splitTags($('fAtmosphere').value),
      nearby_tags: splitTags($('fNearby').value),
      lifestyle_tags: splitTags($('fLifestyle').value),
      target_persona: textValue('fTargetPersona'),
      appeal_points: splitTags($('fAppealPoints').value),
      avoid_points: splitTags($('fAvoidPoints').value),
      search_keywords: splitTags($('fSearchKeywords').value),
      internalMemo: textValue('fInternalMemo'),
      images: images,
      image: mainImage,
      imageCaptions: readLineList('fImageCaptions'),
      mainImageIndex: mainImageIndex,
      washstand: boolValue('fWashstand'),
      bath_toilet_separate: boolValue('fBathSeparate'),
      pet_ok: boolValue('fPet'),
      internetFree: boolValue('fInternetFree'),
      autoLock: boolValue('fAutoLock'),
      deliveryBox: boolValue('fDeliveryBox'),
      aircon: boolValue('fAircon'),
      indoorLaundry: boolValue('fIndoorLaundry'),
      balcony: boolValue('fBalcony'),
      reheatingBath: boolValue('fReheatingBath'),
      systemKitchen: boolValue('fSystemKitchen'),
      super_near: boolValue('fSuper'),
      school_near: boolValue('fSchool'),
      convenienceStoreNear: boolValue('fConvenienceStore'),
      hospitalNear: boolValue('fHospital'),
      parkNear: boolValue('fPark'),
      shoppingStreetNear: boolValue('fShoppingStreet'),
      nearbyNote: textValue('fNearbyNote')
    };
  }

  function fillForm(data, docId) {
    data = data || {};
    editingId = docId || data.id || null;
    $('fId').value = docId || data.id || '';
    $('fId').disabled = !!editingId;
    $('fStatus').value = data.status || '下書き';
    setText('fPropertyType', data.propertyType);
    setText('fApplicationStatus', data.applicationStatus);
    setText('fName', data.name);
    setText('fCatchCopy', data.catchCopy);
    setText('fRent', data.rent);
    setText('fRentYen', data.rentYen != null ? data.rentYen : '');
    setText('fManagementFeeYen', data.managementFeeYen != null ? data.managementFeeYen : '');
    setText('fDeposit', data.deposit);
    setText('fKeyMoney', data.keyMoney);
    setText('fBrokerageFee', data.brokerageFee);
    setText('fRenewalFee', data.renewalFee);
    setText('fInsuranceFee', data.insuranceFee);
    setText('fGuarantorFee', data.guarantorFee);
    setText('fInitialCostNote', data.initialCostNote);
    setText('fLayout', data.layout);
    setText('fFloorPlanDetail', data.floorPlanDetail);
    setText('fExclusiveAreaSqm', data.exclusiveAreaSqm != null ? data.exclusiveAreaSqm : '');
    setText('fFloor', data.floor);
    setText('fTotalFloors', data.totalFloors);
    setText('fCity', data.city);
    setText('fArea', data.area);
    setText('fAddress', data.address);
    setText('fStation', data.station);
    setText('fBusStop', data.busStop);
    setText('fWalkMinutes', data.walkMinutes != null ? data.walkMinutes : '');
    setText('fBuildingAge', data.buildingAge);
    setText('fBuiltYear', data.builtYear);
    setText('fStructure', data.structure);
    setText('fOrientation', data.orientation);
    setText('fUnitNumber', data.unitNumber);
    setText('fParking', data.parking);
    setText('fBicycleParking', data.bicycleParking);
    setText('fMotorbikeParking', data.motorbikeParking);
    setText('fSafetyLevel', data.safetyLevel);
    setText('fAvailableFrom', data.availableFrom);
    setText('fContractTerm', data.contractTerm);
    setText('fTransactionType', data.transactionType);
    setText('fStory', data.story || data.comment);
    setText('fShortReason', data.shortReason || data.short_reason);
    setTagField('fTags', data.tags || []);
    setTagField('fAtmosphere', data.atmosphere_tags || data.atmosphereTags || []);
    setTagField('fNearby', data.nearby_tags || data.nearbyTags || []);
    setTagField('fLifestyle', data.lifestyle_tags || data.lifestyleTags || []);
    setText('fTargetPersona', data.target_persona || data.targetPersona);
    setTagField('fAppealPoints', data.appeal_points || data.appealPoints || []);
    setTagField('fAvoidPoints', data.avoid_points || data.avoidPoints || []);
    setTagField('fSearchKeywords', data.search_keywords || data.searchKeywords || []);
    setText('fInternalMemo', data.internalMemo);
    setText('fImages', (data.images || (data.image ? [data.image] : [])).join('\n'));
    setText('fImageCaptions', Array.isArray(data.imageCaptions) ? data.imageCaptions.join('\n') : data.imageCaptions || '');
    setText('fMainImageIndex', data.mainImageIndex != null ? data.mainImageIndex : 0);
    setCheck('fWashstand', data.washstand);
    setCheck('fBathSeparate', data.bath_toilet_separate === true || data.bathToiletSeparate === true);
    setCheck('fPet', data.pet_ok === true || data.petAllowed === true);
    setCheck('fInternetFree', trueFromAny(data, ['internetFree', 'internet_free']));
    setCheck('fAutoLock', trueFromAny(data, ['autoLock', 'auto_lock']));
    setCheck('fDeliveryBox', trueFromAny(data, ['deliveryBox', 'delivery_box']));
    setCheck('fAircon', data.aircon === true);
    setCheck('fIndoorLaundry', trueFromAny(data, ['indoorLaundry', 'indoor_laundry']));
    setCheck('fBalcony', data.balcony === true);
    setCheck('fReheatingBath', trueFromAny(data, ['reheatingBath', 'reheating_bath']));
    setCheck('fSystemKitchen', trueFromAny(data, ['systemKitchen', 'system_kitchen']));
    setCheck('fSuper', data.super_near === true || data.supermarketNearby === true);
    setCheck('fSchool', data.school_near === true || data.schoolNearby === true);
    setCheck('fConvenienceStore', trueFromAny(data, ['convenienceStoreNear', 'convenience_store_near']));
    setCheck('fHospital', trueFromAny(data, ['hospitalNear', 'hospital_near']));
    setCheck('fPark', trueFromAny(data, ['parkNear', 'park_near']));
    setCheck('fShoppingStreet', trueFromAny(data, ['shoppingStreetNear', 'shopping_street_near']));
    setText('fNearbyNote', data.nearbyNote);
    renderImagePreview();
    $('adminFormTitle').textContent = editingId ? '物件を編集' : '新規物件';
    if (editingId) {
      show($('adminDeleteBtn'));
      $('adminPreviewLink').innerHTML =
        'プレビュー: <a href="property.html?id=' +
        encodeURIComponent(editingId) +
        '" target="_blank" rel="noopener">property.html</a>';
    } else {
      hide($('adminDeleteBtn'));
      $('adminPreviewLink').textContent = '';
    }
    show($('adminFormCard'));
    setMsg($('adminFormMsg'), '', false);
  }

  function resetForm() {
    editingId = null;
    $('adminPropertyForm').reset();
    $('fId').disabled = false;
    $('fStatus').value = '公開';
    setText('fMainImageIndex', 0);
    renderImagePreview();
    hide($('adminDeleteBtn'));
    $('adminFormTitle').textContent = '新規物件';
    $('adminPreviewLink').textContent = '';
    hide($('adminFormCard'));
    setMsg($('adminFormMsg'), '', false);
    setMsg($('adminImageUploadMsg'), '', false);
  }

  function ensureUploadDocId() {
    var id = editingId || textValue('fId');
    if (!id) {
      id = randomId();
      setText('fId', id);
    }
    return id;
  }

  function safeFileName(file) {
    var name = String((file && file.name) || 'image').replace(/[^\w.\-]+/g, '-');
    return Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '_' + name;
  }

  function uploadImageFiles(files) {
    files = Array.prototype.slice.call(files || []);
    if (!files.length) return;
    if (!storage) {
      setMsg($('adminImageUploadMsg'), 'Firebase Storage を初期化できません。storageBucket の設定を確認してください。', true);
      return;
    }
    var invalid = files.filter(function (file) {
      return !/^image\//.test(file.type || '');
    });
    if (invalid.length) {
      setMsg($('adminImageUploadMsg'), '画像ファイルのみアップロードできます。', true);
      return;
    }
    var docId = ensureUploadDocId();
    uploadingImages = true;
    setMsg($('adminImageUploadMsg'), files.length + ' 件の画像をアップロード中です…', false);
    Promise.all(
      files.map(function (file) {
        var path = 'properties/' + docId + '/' + safeFileName(file);
        var ref = storage.ref().child(path);
        return ref
          .put(file, {
            contentType: file.type || 'image/jpeg',
            customMetadata: { propertyId: docId }
          })
          .then(function (snap) {
            return snap.ref.getDownloadURL();
          });
      })
    )
      .then(function (urls) {
        appendImageUrls(urls);
        setMsg($('adminImageUploadMsg'), urls.length + ' 件の画像を追加しました。', false);
      })
      .catch(function (err) {
        setMsg($('adminImageUploadMsg'), err.message || String(err), true);
      })
      .then(function () {
        uploadingImages = false;
      });
  }

  function loadList() {
    var listEl = $('adminPropertyList');
    listEl.innerHTML = '';
    return db
      .collection('properties')
      .orderBy('updatedAt', 'desc')
      .get()
      .catch(function () {
        return db.collection('properties').get();
      })
      .then(function (snap) {
        if (snap.empty) {
          show($('adminListEmpty'));
          return;
        }
        hide($('adminListEmpty'));
        snap.forEach(function (doc) {
          var d = doc.data() || {};
          var li = document.createElement('li');
          var title = document.createElement('span');
          title.textContent =
            (d.name || doc.id) + ' — ' + (d.status || '—') + ' / ' + (d.city || '') + (d.area ? ' ' + d.area : '');
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'nr-admin-btn nr-admin-btn--ghost';
          btn.textContent = '編集';
          btn.addEventListener('click', function () {
            fillForm(d, doc.id);
          });
          li.appendChild(title);
          li.appendChild(btn);
          listEl.appendChild(li);
        });
      })
      .catch(function (err) {
        setMsg($('adminFormMsg'), err.message || String(err), true);
      });
  }

  function saveProperty() {
    if (uploadingImages) {
      setMsg($('adminFormMsg'), '画像アップロード完了後に保存してください。', true);
      return;
    }
    var payload = formToPayload();
    if (!payload.name) {
      setMsg($('adminFormMsg'), '物件名は必須です。', true);
      return;
    }
    if (payload.status === '公開' && !payload.images.length) {
      setMsg($('adminFormMsg'), '公開する物件には画像を1枚以上登録してください。', true);
      return;
    }
    var docId = editingId || payload.id || randomId();
    var data = Object.assign({}, payload, {
      id: docId,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    delete data.id;
    if (!editingId) {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      data.views = 0;
    }
    var ref = db.collection('properties').doc(docId);
    ref
      .set(data, { merge: true })
      .then(function () {
        setMsg($('adminFormMsg'), '保存しました（ID: ' + docId + '）', false);
        editingId = docId;
        $('fId').value = docId;
        $('fId').disabled = true;
        show($('adminDeleteBtn'));
        $('adminPreviewLink').innerHTML =
          'プレビュー: <a href="property.html?id=' +
          encodeURIComponent(docId) +
          '" target="_blank" rel="noopener">property.html</a>';
        return loadList();
      })
      .catch(function (err) {
        setMsg($('adminFormMsg'), err.message || String(err), true);
      });
  }

  function deleteProperty() {
    if (!editingId) return;
    if (!window.confirm('この物件を削除しますか？')) return;
    db.collection('properties')
      .doc(editingId)
      .delete()
      .then(function () {
        resetForm();
        return loadList();
      })
      .catch(function (err) {
        setMsg($('adminFormMsg'), err.message || String(err), true);
      });
  }

  function importJsonFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var items;
      try {
        items = JSON.parse(String(reader.result || '[]'));
      } catch (e) {
        setMsg($('adminFormMsg'), 'JSON の形式が正しくありません。', true);
        return;
      }
      if (!Array.isArray(items)) items = [items];
      var batch = db.batch();
      var count = 0;
      items.forEach(function (raw, idx) {
        if (!raw || typeof raw !== 'object') return;
        var docId = String(raw.id || '').trim() || 'import_' + idx + '_' + Date.now();
        var ref = db.collection('properties').doc(docId);
        var data = Object.assign({}, raw, {
          id: docId,
          status: raw.status || '公開',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          views: Number(raw.views) || 0
        });
        delete data.id;
        batch.set(ref, data, { merge: true });
        count++;
      });
      if (!count) {
        setMsg($('adminFormMsg'), 'インポート対象がありません。', true);
        return;
      }
      batch
        .commit()
        .then(function () {
          setMsg($('adminFormMsg'), count + ' 件をインポートしました。', false);
          return loadList();
        })
        .catch(function (err) {
          setMsg($('adminFormMsg'), err.message || String(err), true);
        });
    };
    reader.readAsText(file, 'utf-8');
  }

  function showApp(user) {
    hide($('adminLoginSection'));
    show($('adminAppSection'));
    $('adminUserLabel').textContent = user && user.email ? user.email : '';
    loadList();
  }

  function showLogin() {
    showLoginOnly();
    resetForm();
  }

  var uiBound = false;

  function bindUi() {
    if (uiBound) return;
    uiBound = true;
    $('adminLoginBtn').addEventListener('click', function () {
      var email = ($('adminEmail').value || '').trim();
      var pass = $('adminPassword').value || '';
      setMsg($('adminLoginMsg'), 'ログイン中…', false);
      auth
        .signInWithEmailAndPassword(email, pass)
        .then(function (cred) {
          setMsg($('adminLoginMsg'), '', false);
          showApp(cred.user);
        })
        .catch(function (err) {
          setMsg($('adminLoginMsg'), err.message || String(err), true);
        });
    });

    $('adminLogoutBtn').addEventListener('click', function () {
      auth.signOut().then(showLogin);
    });

    $('adminNewBtn').addEventListener('click', function () {
      resetForm();
      $('fStatus').value = '公開';
      show($('adminFormCard'));
    });

    $('adminCancelBtn').addEventListener('click', resetForm);
    $('adminSaveBtn').addEventListener('click', saveProperty);
    $('adminDeleteBtn').addEventListener('click', deleteProperty);
    $('adminRefreshBtn').addEventListener('click', loadList);
    $('fImages').addEventListener('input', renderImagePreview);
    $('fImageFiles').addEventListener('change', function (e) {
      uploadImageFiles(e.target.files);
      e.target.value = '';
    });

    $('adminImportBtn').addEventListener('click', function () {
      $('adminImportFile').click();
    });
    $('adminImportFile').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      importJsonFile(f);
      e.target.value = '';
    });
  }

  if (needsSetup()) {
    showSetup();
    bindSetupUi();
    return;
  }

  if (!initFirebase()) {
    showSetup();
    bindSetupUi();
    setMsg($('adminSetupMsg'), 'Firebase 設定が不完全です。下のフォームに入力してください。', true);
    return;
  }

  bindUi();
  auth.onAuthStateChanged(function (user) {
    if (user) showApp(user);
    else showLogin();
  });
})();
