/**
 * NAGA ROOM 共通データ（差し替え用）
 * rental.html / listings.html から参照されます。
 */
(function (global) {
  'use strict';

  global.NAGA_ROOM = {
    LINE_URL: 'https://line.me/R/oaMessage/@081nnswr/?%E7%9B%B8%E8%AB%87',
    PROPERTIES_DATA_URL: 'data/properties.json',

    /**
     * rental.html の自由入力で Dify を使うかどうか。
     * まずは物件検索フローを優先するため、デフォルトは false。
     * （Dify 接続を再開したい時だけ true に変更）
     */
    USE_DIFY_CHAT: true,

    /**
     * 物件一覧
     * filterRegion: nagasaki | isahaya | omura
     * rentMan: 家賃（万円・数値比較用）
     * layoutGroup: compact(1R/1K) | mid(1DK) | wide(1LDK〜)
     * features: station | pet | new
     */
    PROPERTIES: []
  };
})(typeof window !== 'undefined' ? window : this);
