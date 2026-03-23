/**
 * NAGA ROOM 共通データ（差し替え用）
 * rental.html / listings.html から参照されます。
 */
(function (global) {
  'use strict';

  global.NAGA_ROOM = {
    LINE_URL: 'https://line.me/R/oaMessage/@081nnswr/?%E7%9B%B8%E8%AB%87',

    /**
     * 物件一覧
     * filterRegion: nagasaki | isahaya | omura
     * rentMan: 家賃（万円・数値比較用）
     * layoutGroup: compact(1R/1K) | mid(1DK) | wide(1LDK〜)
     * features: station | pet | new
     */
    PROPERTIES: [
      {
        id: 'demo-1',
        image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=640&q=80',
        name: 'ルミエール浦上',
        area: '長崎市 浦上',
        rent: '5.6万円',
        rentMan: 5.6,
        layout: '1K',
        layoutGroup: 'compact',
        filterRegion: 'nagasaki',
        features: ['station'],
        comment: 'はじめての一人暮らしでも、落ち着いて暮らしやすい雰囲気のお部屋です。',
        detailUrl: '#property-demo-1'
      },
      {
        id: 'demo-2',
        image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=640&q=80',
        name: 'コリーヌ長崎駅前',
        area: '長崎市 銅座町',
        rent: '6.2万円',
        rentMan: 6.2,
        layout: '1DK',
        layoutGroup: 'mid',
        filterRegion: 'nagasaki',
        features: ['station'],
        comment: '駅や生活導線のバランスを重視したい方に、ちょうど良さそうな立地です。',
        detailUrl: '#property-demo-2'
      },
      {
        id: 'demo-3',
        image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=640&q=80',
        name: 'セゾン大村',
        area: '大村市 玖島',
        rent: '4.9万円',
        rentMan: 4.9,
        layout: '1R',
        layoutGroup: 'compact',
        filterRegion: 'omura',
        features: [],
        comment: '家賃を抑えつつ、無理なく暮らしたい方に合いやすいコンパクトな間取りです。',
        detailUrl: '#property-demo-3'
      },
      {
        id: 'demo-4',
        image: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=640&q=80',
        name: 'ソレイユ諫早',
        area: '諫早市 永昌町',
        rent: '5.3万円',
        rentMan: 5.3,
        layout: '1K',
        layoutGroup: 'compact',
        filterRegion: 'isahaya',
        features: ['new'],
        comment: '内装が気持ちよく、毎日の帰宅が少し楽しみになるような空気感です。',
        detailUrl: '#property-demo-4'
      },
      {
        id: 'demo-5',
        image: 'https://images.unsplash.com/photo-1560448075-bb485b067938?w=640&q=80',
        name: 'グラン浦上テラス',
        area: '長崎市 茂里町',
        rent: '7.8万円',
        rentMan: 7.8,
        layout: '1LDK',
        layoutGroup: 'wide',
        filterRegion: 'nagasaki',
        features: ['pet'],
        comment: '少し広めの1LDK。ふたり暮らしや、在宅の時間が多い方にも向きやすいです。',
        detailUrl: '#property-demo-5'
      },
      {
        id: 'demo-6',
        image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=640&q=80',
        name: 'ブリーゼ大村ベイ',
        area: '大村市 植松',
        rent: '5.9万円',
        rentMan: 5.9,
        layout: '1DK',
        layoutGroup: 'mid',
        filterRegion: 'omura',
        features: ['station', 'new'],
        comment: '周辺の静けさと、駅へのアクセスのバランスが取りやすいエリアです。',
        detailUrl: '#property-demo-6'
      }
    ]
  };
})(typeof window !== 'undefined' ? window : this);
