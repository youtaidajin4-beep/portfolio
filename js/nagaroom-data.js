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
    /**
     * rental.html が Lead 付き文を付けるときのパス部分（末尾スラッシュなし）
     */
    LINE_OA_URL_BASE:
      'https://line.me/R/oaMessage/' + encodeURIComponent('@' + LINE_BASIC_ID.replace(/^@/, '')),
    /** 任意の事前入力文で URL を組み立てる（例: lineMessageUrl('相談 ' + leadId)） */
    lineMessageUrl: lineMessageUrl,
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
     * Dify 返信を 1 文字ずつ出すときの待ち（ミリ秒）。小さいほど速い。
     */
    DIFY_CHAR_MS: 22,

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
