/**
 * 物件検索用 Dify 中継（streaming）
 * ルート: POST /api/dify-room-search
 * 実装は /api/chat と同一（chat-messages を streaming で転送）
 */
module.exports = require('./chat.js');
