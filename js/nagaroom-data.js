/**
 * NAGA ROOM 共通データ（差し替え用）
 * rental.html / listings.html から参照されます。
 */
(function (global) {
  'use strict';

  global.NAGA_ROOM = {
    LINE_URL: 'https://line.me/R/oaMessage/@081nnswr/?%E7%9B%B8%E8%AB%87',
    /**
     * LINE 公式アカウントへのメッセージ URL のベース（クエリなし）。
     * rental.html が Lead ID 付きの事前入力文を付与する際に使用します。
     */
    LINE_OA_URL_BASE: 'https://line.me/R/oaMessage/@081nnswr',
    PROPERTIES_DATA_URL: 'data/properties.json',

    /**
     * rental.html 表示直後の「任意プロフィール（名前・メール）」モーダルを出すか。
     * false にすると従来どおりすぐ会話が始まります。
     */
    SHOW_LEAD_PROFILE_PROMPT: true,

    /**
     * プロフィール送信時の同意文面に載せるプライバシーポリシーの URL（空ならリンクなしの文言のみ）。
     * 公開時は自サイトのポリシーページに差し替えてください。
     */
    PRIVACY_POLICY_URL: '',

    /**
     * false のとき rental は POST /api/lead を送りません（Notion 未設定のローカル検証用）。
     */
    LEAD_SYNC_ENABLED: true,

    /**
     * Vercel で LEAD_API_SECRET を設定した場合のみ、ここに同じ値を入れて Authorization を付与。
     * フロントに載るため秘匿性は高くありません。未設定なら空のまま。
     */
    LEAD_API_BEARER: '',

    /**
     * Vercel のオリジン（プロトコル＋ホスト、末尾スラッシュなし）。
     * 空のときは相対パス /api/...（本番と同じオリジン）。
     * Live Server 等でローカル表示する場合はデプロイ先を指定すると /api/chat・/api/lead が動く。
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
     * 物件一覧
     * filterRegion: nagasaki | isahaya | omura
     * rentMan: 家賃（万円・数値比較用）
     * layoutGroup: compact(1R/1K) | mid(1DK) | wide(1LDK〜)
     * features: station | pet | new
     */
    PROPERTIES: []
  };
})(typeof window !== 'undefined' ? window : this);
