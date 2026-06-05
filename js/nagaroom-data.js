/**
 * NAGA ROOM 共通データ（差し替え用）
 * rental.html / listings.html から参照されます。
 */
(function (global) {
  'use strict';

  /**
   * LINE Official Account の「ベーシックID」（@の後ろ。LINE公式の管理画面で確認）
   * 変更時はここだけ直せば rental / listings の LINE 導線が揃います。
   */
  var LINE_BASIC_ID = '081nnswr';

  /**
   * LINE Developers 推奨: パス上の ID はパーセントエンコード、本文は /? の後に encodeURIComponent
   * @see https://developers.line.biz/ja/docs/messaging-api/using-line-url-scheme/
   */
  function lineMessageUrl(prefillText) {
    var idWithAt = '@' + String(LINE_BASIC_ID).replace(/^@/, '');
    var msg =
      prefillText != null && String(prefillText).length ? String(prefillText) : '相談';
    return (
      'https://line.me/R/oaMessage/' +
      encodeURIComponent(idWithAt) +
      '/?' +
      encodeURIComponent(msg)
    );
  }

  global.NAGA_ROOM = {
    LINE_BASIC_ID: LINE_BASIC_ID,
    /** 入力欄に「相談」が入った状態でトーク画面を開く URL */
    LINE_URL: lineMessageUrl('相談'),

    /** index サイドバー等の Instagram リンク（空なら非表示） */
    INSTAGRAM_URL: '',
    /**
     * rental.html が Lead 付き文を付けるときのパス部分（末尾スラッシュなし）
     */
    LINE_OA_URL_BASE:
      'https://line.me/R/oaMessage/' + encodeURIComponent('@' + LINE_BASIC_ID.replace(/^@/, '')),
    /** 任意の事前入力文で URL を組み立てる（通常は「相談」のみ） */
    lineMessageUrl: lineMessageUrl,
    PROPERTIES_DATA_URL: 'data/properties.json',

    /**
     * Firestore を物件データの正本にする（Vercel の /api/properties 経由で取得）。
     * false のときはローカル JSON のみを読み込みます。
     * 本番で Firebase を使う場合は true にし、Vercel に Firebase 環境変数を設定してください（docs/FIREBASE_SETUP.md）。
     */
    USE_FIREBASE_PROPERTIES: true,

    /** 公開物件一覧 API（USE_FIREBASE_PROPERTIES が true のとき） */
    PROPERTIES_API_URL: '/api/properties',

    /**
     * rental.html 表示直後の「お名前（必須）」ゲートモーダルを出すか。
     * false にすると同意モーダルを出さず、そのまま会話が始まります。
     */
    SHOW_LEAD_PROFILE_PROMPT: true,

    /**
     * モーダル同意文に載せるプライバシーポリシーの URL（空ならリンクなしの文言のみ）。
     */
    PRIVACY_POLICY_URL: '',

    /**
     * 互換用: rental は Notion /api/lead を呼びません（スプレッドシートのみで管理）。
     */
    LEAD_SYNC_ENABLED: false,

    /** 未使用（旧 Notion API 用）。 */
    LEAD_API_BEARER: '',

    /**
     * Google Apps Script Web アプリの URL（.../exec）。ここに直接貼るとブラウザから GAS に POST します。
     * 空のままにした場合: 本番では POST /api/sheet に送り、Vercel の環境変数 GAS_SHEET_WEBHOOK_URL で GAS を指定（URL を Git に載せない）。
     * file:// で開いているときはプロキシに届かないため送信しません。
     */
    GAS_SHEET_WEBHOOK_URL: '',

    /**
     * Vercel のオリジン（プロトコル＋ホスト、末尾スラッシュなし）。
     * 空のときは相対パス /api/...（本番と同じオリジン）。
     * Live Server 等でローカル表示する場合はデプロイ先を指定すると /api/chat が動く。
     * 例: 'https://portfolio-pearl-one.vercel.app'
     */
    API_ORIGIN: '',

    /**
     * rental.html の自由入力で Dify を使うかどうか。
     * まずは物件検索フローを優先するため、デフォルトは false。
     * （Dify 接続を再開したい時だけ true に変更）
     */
    USE_DIFY_CHAT: true,

    /**
     * Dify 返信を 1 文字ずつ出すときの待ち（ミリ秒）。小さいほど速い。
     */
    DIFY_CHAR_MS: 22,
    /**
     * property モード時、/api/chat の抽出JSONモードを併用するか。
     * true にするとローカル抽出の上から Dify 抽出で条件を補強します。
     */
    EXTRACT_CONDITIONS_WITH_DIFY: true,
    /**
     * ソフト条件の加点重み（大きいほど優先される）。
     */
    SOFT_CONDITION_WEIGHTS: {
      quiet: 2.8,
      cafe_near: 2.4,
      sunlight: 2.1,
      station_access: 2.0,
      security: 2.0,
      corner: 1.2,
      newish: 1.2,
      reno: 1.1
    },
    /**
     * ソフト条件の同義語辞書（必要に応じて運用で拡張）。
     */
    SOFT_SYNONYM_MAP: {
      quiet: ['静か', '閑静', '落ち着く'],
      cafe_near: ['カフェ', '喫茶店', 'コーヒー'],
      sunlight: ['日当たり', '南向き', '明るい'],
      station_access: ['駅近', '駅チカ', '徒歩圏']
    },

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
