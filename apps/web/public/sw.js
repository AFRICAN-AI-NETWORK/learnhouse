if (!self.define) {
  let e,
    a = {}
  const i = (i, s) => (
    (i = new URL(i + '.js', s).href),
    a[i] ||
      new Promise((a) => {
        if ('document' in self) {
          const e = document.createElement('script')
          ;(e.src = i), (e.onload = a), document.head.appendChild(e)
        } else (e = i), importScripts(i), a()
      }).then(() => {
        let e = a[i]
        if (!e) throw new Error(`Module ${i} didn’t register its module`)
        return e
      })
  )
  self.define = (s, c) => {
    const n =
      e ||
      ('document' in self ? document.currentScript.src : '') ||
      location.href
    if (a[n]) return
    let t = {}
    const r = (e) => i(e, n),
      d = { module: { uri: n }, exports: t, require: r }
    a[n] = Promise.all(s.map((e) => d[e] || r(e))).then((e) => (c(...e), t))
  }
}
define(['./workbox-3c9d0171'], function (e) {
  'use strict'
  importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: '/_next/static/chunks/0af3c2ec-7218cded86b9397d.js',
          revision: '7218cded86b9397d',
        },
        {
          url: '/_next/static/chunks/1-8d68ec812c074054.js',
          revision: '8d68ec812c074054',
        },
        {
          url: '/_next/static/chunks/110.412b4dcbcb222841.js',
          revision: '412b4dcbcb222841',
        },
        {
          url: '/_next/static/chunks/1163-909a79dca938a414.js',
          revision: '909a79dca938a414',
        },
        {
          url: '/_next/static/chunks/1199.e53f6c826c319478.js',
          revision: 'e53f6c826c319478',
        },
        {
          url: '/_next/static/chunks/1215-09c00f9c230003bd.js',
          revision: '09c00f9c230003bd',
        },
        {
          url: '/_next/static/chunks/1389-dc0befd5a833c053.js',
          revision: 'dc0befd5a833c053',
        },
        {
          url: '/_next/static/chunks/1448-caf0257d6789fa85.js',
          revision: 'caf0257d6789fa85',
        },
        {
          url: '/_next/static/chunks/1455.04a3047830cce31f.js',
          revision: '04a3047830cce31f',
        },
        {
          url: '/_next/static/chunks/1534-ccde88a8eb10a3f1.js',
          revision: 'ccde88a8eb10a3f1',
        },
        {
          url: '/_next/static/chunks/1607-4d2e3dbd5108999c.js',
          revision: '4d2e3dbd5108999c',
        },
        {
          url: '/_next/static/chunks/1690.9fe163111cea791d.js',
          revision: '9fe163111cea791d',
        },
        {
          url: '/_next/static/chunks/1715-17d85a28e66a7555.js',
          revision: '17d85a28e66a7555',
        },
        {
          url: '/_next/static/chunks/1801-64bb905ab780f14b.js',
          revision: '64bb905ab780f14b',
        },
        {
          url: '/_next/static/chunks/1917-953bd6c3ff67ad27.js',
          revision: '953bd6c3ff67ad27',
        },
        {
          url: '/_next/static/chunks/1948-e1d1f60fd9f1caa9.js',
          revision: 'e1d1f60fd9f1caa9',
        },
        {
          url: '/_next/static/chunks/198-25573c8b2a76b8c1.js',
          revision: '25573c8b2a76b8c1',
        },
        {
          url: '/_next/static/chunks/2048.2a5853dd224ed06a.js',
          revision: '2a5853dd224ed06a',
        },
        {
          url: '/_next/static/chunks/2118-7bb28f601ae01798.js',
          revision: '7bb28f601ae01798',
        },
        {
          url: '/_next/static/chunks/2216-360780e7d90af45f.js',
          revision: '360780e7d90af45f',
        },
        {
          url: '/_next/static/chunks/223-1382af9de1a58204.js',
          revision: '1382af9de1a58204',
        },
        {
          url: '/_next/static/chunks/239.2363a90e8a187138.js',
          revision: '2363a90e8a187138',
        },
        {
          url: '/_next/static/chunks/273acdc0-0f9374b1bc5cf400.js',
          revision: '0f9374b1bc5cf400',
        },
        {
          url: '/_next/static/chunks/2773-1dfb3e0d385b372b.js',
          revision: '1dfb3e0d385b372b',
        },
        {
          url: '/_next/static/chunks/2884-bc25d4b7739e3895.js',
          revision: 'bc25d4b7739e3895',
        },
        {
          url: '/_next/static/chunks/2885-ac56d71b49cbfa86.js',
          revision: 'ac56d71b49cbfa86',
        },
        {
          url: '/_next/static/chunks/2939.d8c4c85326c697ca.js',
          revision: 'd8c4c85326c697ca',
        },
        {
          url: '/_next/static/chunks/2999.e0fe100b718d5021.js',
          revision: 'e0fe100b718d5021',
        },
        {
          url: '/_next/static/chunks/3057.d2f906c41e140e77.js',
          revision: 'd2f906c41e140e77',
        },
        {
          url: '/_next/static/chunks/3277.d86090485404ced4.js',
          revision: 'd86090485404ced4',
        },
        {
          url: '/_next/static/chunks/3286-2df5bce660f3f86d.js',
          revision: '2df5bce660f3f86d',
        },
        {
          url: '/_next/static/chunks/3369-09bd942b761752be.js',
          revision: '09bd942b761752be',
        },
        {
          url: '/_next/static/chunks/341-963b9690910fd910.js',
          revision: '963b9690910fd910',
        },
        {
          url: '/_next/static/chunks/3410-8a645faf2fef5585.js',
          revision: '8a645faf2fef5585',
        },
        {
          url: '/_next/static/chunks/350-4d25b6392a319164.js',
          revision: '4d25b6392a319164',
        },
        {
          url: '/_next/static/chunks/3782-869c9e61a2190872.js',
          revision: '869c9e61a2190872',
        },
        {
          url: '/_next/static/chunks/3875-184aa837461daf76.js',
          revision: '184aa837461daf76',
        },
        {
          url: '/_next/static/chunks/3939.1dc670fc92034384.js',
          revision: '1dc670fc92034384',
        },
        {
          url: '/_next/static/chunks/397-573a282e39c0824e.js',
          revision: '573a282e39c0824e',
        },
        {
          url: '/_next/static/chunks/3b42e7c7-d86738c4201ec2e5.js',
          revision: 'd86738c4201ec2e5',
        },
        {
          url: '/_next/static/chunks/4013-176a248b4bd491b3.js',
          revision: '176a248b4bd491b3',
        },
        {
          url: '/_next/static/chunks/4266.4c7b9453580cb0cd.js',
          revision: '4c7b9453580cb0cd',
        },
        {
          url: '/_next/static/chunks/4443-6a8f5c01bb459a03.js',
          revision: '6a8f5c01bb459a03',
        },
        {
          url: '/_next/static/chunks/468-995674d99d0a5117.js',
          revision: '995674d99d0a5117',
        },
        {
          url: '/_next/static/chunks/472-dbae0d999ed4c465.js',
          revision: 'dbae0d999ed4c465',
        },
        {
          url: '/_next/static/chunks/4723-a97fbc83a145b4a8.js',
          revision: 'a97fbc83a145b4a8',
        },
        {
          url: '/_next/static/chunks/4744-24f349b41d506109.js',
          revision: '24f349b41d506109',
        },
        {
          url: '/_next/static/chunks/4750-1d87774e7075016b.js',
          revision: '1d87774e7075016b',
        },
        {
          url: '/_next/static/chunks/4791-1f2403ee57b5bbe1.js',
          revision: '1f2403ee57b5bbe1',
        },
        {
          url: '/_next/static/chunks/4821.1186ec73e632a220.js',
          revision: '1186ec73e632a220',
        },
        {
          url: '/_next/static/chunks/4861-f57299bb9b0a5392.js',
          revision: 'f57299bb9b0a5392',
        },
        {
          url: '/_next/static/chunks/4884.06eb1d7297c377e2.js',
          revision: '06eb1d7297c377e2',
        },
        {
          url: '/_next/static/chunks/4944.160c5edaf4725d54.js',
          revision: '160c5edaf4725d54',
        },
        {
          url: '/_next/static/chunks/5061-a2aee11dfce9138d.js',
          revision: 'a2aee11dfce9138d',
        },
        {
          url: '/_next/static/chunks/511-f422923d5e62a89a.js',
          revision: 'f422923d5e62a89a',
        },
        {
          url: '/_next/static/chunks/5162-376b0c3f9ca49c1c.js',
          revision: '376b0c3f9ca49c1c',
        },
        {
          url: '/_next/static/chunks/5204-9afa918c63ae603d.js',
          revision: '9afa918c63ae603d',
        },
        {
          url: '/_next/static/chunks/5265-15ba02f50e67922e.js',
          revision: '15ba02f50e67922e',
        },
        {
          url: '/_next/static/chunks/5434.9f92657e9b373f48.js',
          revision: '9f92657e9b373f48',
        },
        {
          url: '/_next/static/chunks/5625-928f5f87adf9af77.js',
          revision: '928f5f87adf9af77',
        },
        {
          url: '/_next/static/chunks/5700.abcfa090971dbe99.js',
          revision: 'abcfa090971dbe99',
        },
        {
          url: '/_next/static/chunks/5801-3b5d422fde603637.js',
          revision: '3b5d422fde603637',
        },
        {
          url: '/_next/static/chunks/5888.c536844588d4c23c.js',
          revision: 'c536844588d4c23c',
        },
        {
          url: '/_next/static/chunks/5909-d25e930e9d26a34c.js',
          revision: 'd25e930e9d26a34c',
        },
        {
          url: '/_next/static/chunks/5922.4847a3f246dfcea1.js',
          revision: '4847a3f246dfcea1',
        },
        {
          url: '/_next/static/chunks/6009-2943bd3e31bd2389.js',
          revision: '2943bd3e31bd2389',
        },
        {
          url: '/_next/static/chunks/6050c746-4b80ac7f136b26c8.js',
          revision: '4b80ac7f136b26c8',
        },
        {
          url: '/_next/static/chunks/6058-c5a488ff09297ef2.js',
          revision: 'c5a488ff09297ef2',
        },
        {
          url: '/_next/static/chunks/6096-800b1ebc8aa0e23d.js',
          revision: '800b1ebc8aa0e23d',
        },
        {
          url: '/_next/static/chunks/6098-0ff6eeeb76e160a1.js',
          revision: '0ff6eeeb76e160a1',
        },
        {
          url: '/_next/static/chunks/6209-0d1d8c2c8571dafe.js',
          revision: '0d1d8c2c8571dafe',
        },
        {
          url: '/_next/static/chunks/6243b3d4-1b302e47c7bd13fb.js',
          revision: '1b302e47c7bd13fb',
        },
        {
          url: '/_next/static/chunks/6250-34a9f2cec585cec0.js',
          revision: '34a9f2cec585cec0',
        },
        {
          url: '/_next/static/chunks/6256.9d76fe34a691f251.js',
          revision: '9d76fe34a691f251',
        },
        {
          url: '/_next/static/chunks/6271-f3c4936d7818d7b7.js',
          revision: 'f3c4936d7818d7b7',
        },
        {
          url: '/_next/static/chunks/6354-e631bfd74498cef2.js',
          revision: 'e631bfd74498cef2',
        },
        {
          url: '/_next/static/chunks/6512-d51be3de93d70a5c.js',
          revision: 'd51be3de93d70a5c',
        },
        {
          url: '/_next/static/chunks/6587-07bffea6161055b9.js',
          revision: '07bffea6161055b9',
        },
        {
          url: '/_next/static/chunks/6688-edcad2d8ae4b5a34.js',
          revision: 'edcad2d8ae4b5a34',
        },
        {
          url: '/_next/static/chunks/6887-0c60507358e0ec79.js',
          revision: '0c60507358e0ec79',
        },
        {
          url: '/_next/static/chunks/6892-948e1161497f615c.js',
          revision: '948e1161497f615c',
        },
        {
          url: '/_next/static/chunks/6967-84c35ea7d6dcec0a.js',
          revision: '84c35ea7d6dcec0a',
        },
        {
          url: '/_next/static/chunks/7000-0d69cda66394ac55.js',
          revision: '0d69cda66394ac55',
        },
        {
          url: '/_next/static/chunks/7031-1a1de92f47b952d7.js',
          revision: '1a1de92f47b952d7',
        },
        {
          url: '/_next/static/chunks/707-9726716ca9d2b5e9.js',
          revision: '9726716ca9d2b5e9',
        },
        {
          url: '/_next/static/chunks/7125-7106e930a9b78f4f.js',
          revision: '7106e930a9b78f4f',
        },
        {
          url: '/_next/static/chunks/7150-a653aeed0b10ada4.js',
          revision: 'a653aeed0b10ada4',
        },
        {
          url: '/_next/static/chunks/7168-6114c86a6f24763e.js',
          revision: '6114c86a6f24763e',
        },
        {
          url: '/_next/static/chunks/7199-ff0a6754466bc78f.js',
          revision: 'ff0a6754466bc78f',
        },
        {
          url: '/_next/static/chunks/7277-7aeb6ae85cc2e503.js',
          revision: '7aeb6ae85cc2e503',
        },
        {
          url: '/_next/static/chunks/7304-85889bf60c2ca625.js',
          revision: '85889bf60c2ca625',
        },
        {
          url: '/_next/static/chunks/7338-c8e1317676d5fba9.js',
          revision: 'c8e1317676d5fba9',
        },
        {
          url: '/_next/static/chunks/7586-4a7251ec883b29b0.js',
          revision: '4a7251ec883b29b0',
        },
        {
          url: '/_next/static/chunks/7606-7d30f8ecc0c7f766.js',
          revision: '7d30f8ecc0c7f766',
        },
        {
          url: '/_next/static/chunks/772.d36a446ce8abd2e7.js',
          revision: 'd36a446ce8abd2e7',
        },
        {
          url: '/_next/static/chunks/7939-3e0f244a6b47f15c.js',
          revision: '3e0f244a6b47f15c',
        },
        {
          url: '/_next/static/chunks/7b3dac53-56184d2a0f4ec170.js',
          revision: '56184d2a0f4ec170',
        },
        {
          url: '/_next/static/chunks/8030-a8a30a88b56d0318.js',
          revision: 'a8a30a88b56d0318',
        },
        {
          url: '/_next/static/chunks/8098-5926541fcba8dd52.js',
          revision: '5926541fcba8dd52',
        },
        {
          url: '/_next/static/chunks/8400-71ad07f24e0d6522.js',
          revision: '71ad07f24e0d6522',
        },
        {
          url: '/_next/static/chunks/8485-59be29313d198dee.js',
          revision: '59be29313d198dee',
        },
        {
          url: '/_next/static/chunks/8559-e8b07d5b2cca2c02.js',
          revision: 'e8b07d5b2cca2c02',
        },
        {
          url: '/_next/static/chunks/8812-2a6173af55bcd19f.js',
          revision: '2a6173af55bcd19f',
        },
        {
          url: '/_next/static/chunks/882.6ed6f8f72afdd79f.js',
          revision: '6ed6f8f72afdd79f',
        },
        {
          url: '/_next/static/chunks/8882-50c0b5fa147c47e0.js',
          revision: '50c0b5fa147c47e0',
        },
        {
          url: '/_next/static/chunks/9118-004428fbe3ccc1bc.js',
          revision: '004428fbe3ccc1bc',
        },
        {
          url: '/_next/static/chunks/9220.b930114b259e3da4.js',
          revision: 'b930114b259e3da4',
        },
        {
          url: '/_next/static/chunks/93-5f557da7babf7f52.js',
          revision: '5f557da7babf7f52',
        },
        {
          url: '/_next/static/chunks/9462-fa5dee6475433ae8.js',
          revision: 'fa5dee6475433ae8',
        },
        {
          url: '/_next/static/chunks/9524-43ab75af019dfe9d.js',
          revision: '43ab75af019dfe9d',
        },
        {
          url: '/_next/static/chunks/9652-efcec64f637e4a84.js',
          revision: 'efcec64f637e4a84',
        },
        {
          url: '/_next/static/chunks/9703-afe85668af20ea00.js',
          revision: 'afe85668af20ea00',
        },
        {
          url: '/_next/static/chunks/9883-83a3607c50615ea2.js',
          revision: '83a3607c50615ea2',
        },
        {
          url: '/_next/static/chunks/9885-3e1d5984b5615490.js',
          revision: '3e1d5984b5615490',
        },
        {
          url: '/_next/static/chunks/9927-f822ed2dbff22fc9.js',
          revision: 'f822ed2dbff22fc9',
        },
        {
          url: '/_next/static/chunks/9944-249b218cd5fe9c5d.js',
          revision: '249b218cd5fe9c5d',
        },
        {
          url: '/_next/static/chunks/9992-e874ee363f99793b.js',
          revision: 'e874ee363f99793b',
        },
        {
          url: '/_next/static/chunks/9e784b99-165523e9aa242c16.js',
          revision: '165523e9aa242c16',
        },
        {
          url: '/_next/static/chunks/app/_global-error/page-cdd9502a05af75db.js',
          revision: 'cdd9502a05af75db',
        },
        {
          url: '/_next/static/chunks/app/_not-found/page-94d1603ab6135597.js',
          revision: '94d1603ab6135597',
        },
        {
          url: '/_next/static/chunks/app/api/auth/%5B...nextauth%5D/route-314ca163b79bcbcb.js',
          revision: '314ca163b79bcbcb',
        },
        {
          url: '/_next/static/chunks/app/api/health/route-4045407dcc549fd6.js',
          revision: '4045407dcc549fd6',
        },
        {
          url: '/_next/static/chunks/app/api/revalidate/route-51b0c68a3d8d6909.js',
          revision: '51b0c68a3d8d6909',
        },
        {
          url: '/_next/static/chunks/app/api/sitemap/route-ff592debad766ec0.js',
          revision: 'ff592debad766ec0',
        },
        {
          url: '/_next/static/chunks/app/auth/forgot/page-1d3dfc0963873136.js',
          revision: '1d3dfc0963873136',
        },
        {
          url: '/_next/static/chunks/app/auth/layout-3c7863c680492af8.js',
          revision: '3c7863c680492af8',
        },
        {
          url: '/_next/static/chunks/app/auth/login/page-b09d2fd9f8d10e03.js',
          revision: 'b09d2fd9f8d10e03',
        },
        {
          url: '/_next/static/chunks/app/auth/reset/page-5fb0f9988910ce95.js',
          revision: '5fb0f9988910ce95',
        },
        {
          url: '/_next/static/chunks/app/auth/signup/page-98ea149fa9fd266d.js',
          revision: '98ea149fa9fd266d',
        },
        {
          url: '/_next/static/chunks/app/auth/waitlist/countdown/page-7a6f02d46615400d.js',
          revision: '7a6f02d46615400d',
        },
        {
          url: '/_next/static/chunks/app/auth/waitlist/join/page-b2735067c87e009a.js',
          revision: 'b2735067c87e009a',
        },
        {
          url: '/_next/static/chunks/app/editor/course/%5Bcourseid%5D/activity/%5Bactivityuuid%5D/edit/loading-e5756693523199e0.js',
          revision: 'e5756693523199e0',
        },
        {
          url: '/_next/static/chunks/app/editor/course/%5Bcourseid%5D/activity/%5Bactivityuuid%5D/edit/page-7fc3055ae352499a.js',
          revision: '7fc3055ae352499a',
        },
        {
          url: '/_next/static/chunks/app/global-error-cb0b67d40bc56a4b.js',
          revision: 'cb0b67d40bc56a4b',
        },
        {
          url: '/_next/static/chunks/app/home/page-ec47c2c08be6cf46.js',
          revision: 'ec47c2c08be6cf46',
        },
        {
          url: '/_next/static/chunks/app/join/%5Bsessionuuid%5D/page-35c1e216e718c665.js',
          revision: '35c1e216e718c665',
        },
        {
          url: '/_next/static/chunks/app/layout-eb38fc3977c02034.js',
          revision: 'eb38fc3977c02034',
        },
        {
          url: '/_next/static/chunks/app/not-found-a5db68ad1791e948.js',
          revision: 'a5db68ad1791e948',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/aan-open/page-ec5fc43ad909a2d1.js',
          revision: 'ec5fc43ad909a2d1',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/about/page-c4d024e9838101b2.js',
          revision: 'c4d024e9838101b2',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/ai-automation-content-creators/page-4721b9c60abc9177.js',
          revision: '4721b9c60abc9177',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/ai-automation/page-321ec238af4ee047.js',
          revision: '321ec238af4ee047',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/ai-engineering/page-98ed44f5b50c9df4.js',
          revision: '98ed44f5b50c9df4',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/ai-fundamentals/page-7c2d67ae07d3e347.js',
          revision: '7c2d67ae07d3e347',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/calendar/page-c2d5672ae644d676.js',
          revision: 'c2d5672ae644d676',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/certificates/%5Buuid%5D/verify/page-a271867a03e21df6.js',
          revision: 'a271867a03e21df6',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/chat/%5BconversationId%5D/page-ddcda4b6742c68e8.js',
          revision: 'ddcda4b6742c68e8',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/chat/page-66570da9a2575204.js',
          revision: '66570da9a2575204',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collection/%5Bcollectionid%5D/error-e246d14ebe760558.js',
          revision: 'e246d14ebe760558',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collection/%5Bcollectionid%5D/loading-f3070690e2db9900.js',
          revision: 'f3070690e2db9900',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collection/%5Bcollectionid%5D/page-5a6a05b62e080020.js',
          revision: '5a6a05b62e080020',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collections/loading-b9b79d8a0c104b05.js',
          revision: 'b9b79d8a0c104b05',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collections/new/page-4a3d3089bee0cb34.js',
          revision: '4a3d3089bee0cb34',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collections/page-1aa9c7f5da9fc5d4.js',
          revision: '1aa9c7f5da9fc5d4',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/contact/page-6d24b059784526e7.js',
          revision: '6d24b059784526e7',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/activity/%5Bactivityid%5D/error-cf56afd1908f6083.js',
          revision: 'cf56afd1908f6083',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/activity/%5Bactivityid%5D/loading-96ca06d5ff229007.js',
          revision: '96ca06d5ff229007',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/activity/%5Bactivityid%5D/page-0da7512992636e1e.js',
          revision: '0da7512992636e1e',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/error-c0a5855dc023e78f.js',
          revision: 'c0a5855dc023e78f',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/page-3632b3b50951a0c0.js',
          revision: '3632b3b50951a0c0',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/courses/error-0e1e372ad743605b.js',
          revision: '0e1e372ad743605b',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/courses/loading-f1dcb2e62274d598.js',
          revision: 'f1dcb2e62274d598',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/courses/page-8ef96f542cdb406c.js',
          revision: '8ef96f542cdb406c',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/error-399af37a98b6985f.js',
          revision: '399af37a98b6985f',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/frontend-dev/page-39dbe3c721fc2a8b.js',
          revision: '39dbe3c721fc2a8b',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/laravel-backend/page-76fcf2ac55c83af3.js',
          revision: '76fcf2ac55c83af3',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/layout-eeccb74e02280fdf.js',
          revision: 'eeccb74e02280fdf',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/loading-d3e3fce6759003c3.js',
          revision: 'd3e3fce6759003c3',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/nodejs-backend/page-751122c28a6b80e0.js',
          revision: '751122c28a6b80e0',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/page-bb93d51ea14137e6.js',
          revision: 'bb93d51ea14137e6',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/pricing/page-416b6647fffd7eea.js',
          revision: '416b6647fffd7eea',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/search/page-7c8153ad42192aa2.js',
          revision: '7c8153ad42192aa2',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/trail/page-c971ec77aa8f8b35.js',
          revision: 'c971ec77aa8f8b35',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/user/%5Busername%5D/error-48cfd8d377ed8e66.js',
          revision: '48cfd8d377ed8e66',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/user/%5Busername%5D/page-9d4bac3c37237e49.js',
          revision: '9d4bac3c37237e49',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/affiliation/signup/page-93ca2e4b3a8bc3b3.js',
          revision: '93ca2e4b3a8bc3b3',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/affiliation/page-ea6210cf76b002de.js',
          revision: 'ea6210cf76b002de',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/announcements/page-d6d2e9804b6110af.js',
          revision: 'd6d2e9804b6110af',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/assignments/%5Bassignmentuuid%5D/page-d4d9beadbc91842a.js',
          revision: 'd4d9beadbc91842a',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/assignments/page-3bbb59288a30e493.js',
          revision: '3bbb59288a30e493',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/communications/page-e2f4e9f3560e37fb.js',
          revision: 'e2f4e9f3560e37fb',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/communications/participants/%5Bactivityid%5D/page-37888fa976c0dc32.js',
          revision: '37888fa976c0dc32',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/courses/course/%5Bcourseuuid%5D/%5Bsubpage%5D/page-73617761ecf8f0dc.js',
          revision: '73617761ecf8f0dc',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/courses/page-1f458d7470530632.js',
          revision: '1f458d7470530632',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/documentation/layout-45980e32de7b2fef.js',
          revision: '45980e32de7b2fef',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/documentation/rights/page-4a825c364c1cf752.js',
          revision: '4a825c364c1cf752',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/handbook/page-48f3c8e5e3612c02.js',
          revision: '48f3c8e5e3612c02',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/layout-96402c5051715864.js',
          revision: '96402c5051715864',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/org/settings/%5Bsubpage%5D/page-80fc2cb5c1976388.js',
          revision: '80fc2cb5c1976388',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/page-2f4e787903b82368.js',
          revision: '2f4e787903b82368',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/payments/%5Bsubpage%5D/page-97057a8209d1e8b2.js',
          revision: '97057a8209d1e8b2',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/referrals/page-55c511d904741acc.js',
          revision: '55c511d904741acc',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/students/%5Buserid%5D/page-19fb51ebc492cad6.js',
          revision: '19fb51ebc492cad6',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/students/page-bc23d668af5c43c5.js',
          revision: 'bc23d668af5c43c5',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/user-account/owned/page-93cfb648156149ae.js',
          revision: '93cfb648156149ae',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/user-account/settings/%5Bsubpage%5D/page-15ab7b61da061b38.js',
          revision: '15ab7b61da061b38',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/users/settings/%5Bsubpage%5D/page-ffa59c95f2691552.js',
          revision: 'ffa59c95f2691552',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/layout-21c345a686857e79.js',
          revision: '21c345a686857e79',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/marketer/page-601a4358891c0031.js',
          revision: '601a4358891c0031',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/marketer/payouts/page-925b7a2123580179.js',
          revision: '925b7a2123580179',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/marketer/register/page-bd56496606b23cb4.js',
          revision: 'bd56496606b23cb4',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/marketer/revenue/page-4dd6c554d3acfe56.js',
          revision: '4dd6c554d3acfe56',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/marketer/students/page-c3843f42d902298a.js',
          revision: 'c3843f42d902298a',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/policy/page-0e97ed13f8ba981a.js',
          revision: '0e97ed13f8ba981a',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/privacy/page-b1e0f813d1874b7e.js',
          revision: 'b1e0f813d1874b7e',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/verify-email/page-0e6f50da67ebd51c.js',
          revision: '0e6f50da67ebd51c',
        },
        {
          url: '/_next/static/chunks/app/payments/stripe/connect/oauth/page-3cd14d0700bc5ed9.js',
          revision: '3cd14d0700bc5ed9',
        },
        {
          url: '/_next/static/chunks/app/ref/%5Bcode%5D/page-8f2324e5435b6fa6.js',
          revision: '8f2324e5435b6fa6',
        },
        {
          url: '/_next/static/chunks/b2d08614.eff985ad8b6dfaf5.js',
          revision: 'eff985ad8b6dfaf5',
        },
        {
          url: '/_next/static/chunks/badf541d.160ec6b13ca5a030.js',
          revision: '160ec6b13ca5a030',
        },
        {
          url: '/_next/static/chunks/bda40ab4-2c0552c08edf2d4a.js',
          revision: '2c0552c08edf2d4a',
        },
        {
          url: '/_next/static/chunks/c132bf7d.e8d3fd14a3e5c769.js',
          revision: 'e8d3fd14a3e5c769',
        },
        {
          url: '/_next/static/chunks/dc596880-6e227740a3765306.js',
          revision: '6e227740a3765306',
        },
        {
          url: '/_next/static/chunks/ef288fc7-6d67289832f24a0d.js',
          revision: '6d67289832f24a0d',
        },
        {
          url: '/_next/static/chunks/fc43f782-eb8cf3b6cc8fa2b8.js',
          revision: 'eb8cf3b6cc8fa2b8',
        },
        {
          url: '/_next/static/chunks/framework-8acfb4ddaeef09b1.js',
          revision: '8acfb4ddaeef09b1',
        },
        {
          url: '/_next/static/chunks/main-app-076b9228f127b8ab.js',
          revision: '076b9228f127b8ab',
        },
        {
          url: '/_next/static/chunks/main-e2000db735f8e921.js',
          revision: 'e2000db735f8e921',
        },
        {
          url: '/_next/static/chunks/next/dist/client/components/builtin/app-error-07322251f46a7cd8.js',
          revision: '07322251f46a7cd8',
        },
        {
          url: '/_next/static/chunks/next/dist/client/components/builtin/forbidden-67e5d79b87a9dc43.js',
          revision: '67e5d79b87a9dc43',
        },
        {
          url: '/_next/static/chunks/next/dist/client/components/builtin/unauthorized-a66ce088b90a711a.js',
          revision: 'a66ce088b90a711a',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        {
          url: '/_next/static/chunks/webpack-97a46fa1699aadee.js',
          revision: '97a46fa1699aadee',
        },
        {
          url: '/_next/static/css/08850d20f66a437f.css',
          revision: '08850d20f66a437f',
        },
        {
          url: '/_next/static/css/1dfb5e71b60cea90.css',
          revision: '1dfb5e71b60cea90',
        },
        {
          url: '/_next/static/css/e994854524ff845e.css',
          revision: 'e994854524ff845e',
        },
        {
          url: '/_next/static/css/fdac6bbf6bfe4fdb.css',
          revision: 'fdac6bbf6bfe4fdb',
        },
        {
          url: '/_next/static/media/KaTeX_AMS-Regular.1608a09b.woff',
          revision: '1608a09b',
        },
        {
          url: '/_next/static/media/KaTeX_AMS-Regular.4aafdb68.ttf',
          revision: '4aafdb68',
        },
        {
          url: '/_next/static/media/KaTeX_AMS-Regular.a79f1c31.woff2',
          revision: 'a79f1c31',
        },
        {
          url: '/_next/static/media/KaTeX_Caligraphic-Bold.b6770918.woff',
          revision: 'b6770918',
        },
        {
          url: '/_next/static/media/KaTeX_Caligraphic-Bold.cce5b8ec.ttf',
          revision: 'cce5b8ec',
        },
        {
          url: '/_next/static/media/KaTeX_Caligraphic-Bold.ec17d132.woff2',
          revision: 'ec17d132',
        },
        {
          url: '/_next/static/media/KaTeX_Caligraphic-Regular.07ef19e7.ttf',
          revision: '07ef19e7',
        },
        {
          url: '/_next/static/media/KaTeX_Caligraphic-Regular.55fac258.woff2',
          revision: '55fac258',
        },
        {
          url: '/_next/static/media/KaTeX_Caligraphic-Regular.dad44a7f.woff',
          revision: 'dad44a7f',
        },
        {
          url: '/_next/static/media/KaTeX_Fraktur-Bold.9f256b85.woff',
          revision: '9f256b85',
        },
        {
          url: '/_next/static/media/KaTeX_Fraktur-Bold.b18f59e1.ttf',
          revision: 'b18f59e1',
        },
        {
          url: '/_next/static/media/KaTeX_Fraktur-Bold.d42a5579.woff2',
          revision: 'd42a5579',
        },
        {
          url: '/_next/static/media/KaTeX_Fraktur-Regular.7c187121.woff',
          revision: '7c187121',
        },
        {
          url: '/_next/static/media/KaTeX_Fraktur-Regular.d3c882a6.woff2',
          revision: 'd3c882a6',
        },
        {
          url: '/_next/static/media/KaTeX_Fraktur-Regular.ed38e79f.ttf',
          revision: 'ed38e79f',
        },
        {
          url: '/_next/static/media/KaTeX_Main-Bold.b74a1a8b.ttf',
          revision: 'b74a1a8b',
        },
        {
          url: '/_next/static/media/KaTeX_Main-Bold.c3fb5ac2.woff2',
          revision: 'c3fb5ac2',
        },
        {
          url: '/_next/static/media/KaTeX_Main-Bold.d181c465.woff',
          revision: 'd181c465',
        },
        {
          url: '/_next/static/media/KaTeX_Main-BoldItalic.6f2bb1df.woff2',
          revision: '6f2bb1df',
        },
        {
          url: '/_next/static/media/KaTeX_Main-BoldItalic.70d8b0a5.ttf',
          revision: '70d8b0a5',
        },
        {
          url: '/_next/static/media/KaTeX_Main-BoldItalic.e3f82f9d.woff',
          revision: 'e3f82f9d',
        },
        {
          url: '/_next/static/media/KaTeX_Main-Italic.47373d1e.ttf',
          revision: '47373d1e',
        },
        {
          url: '/_next/static/media/KaTeX_Main-Italic.8916142b.woff2',
          revision: '8916142b',
        },
        {
          url: '/_next/static/media/KaTeX_Main-Italic.9024d815.woff',
          revision: '9024d815',
        },
        {
          url: '/_next/static/media/KaTeX_Main-Regular.0462f03b.woff2',
          revision: '0462f03b',
        },
        {
          url: '/_next/static/media/KaTeX_Main-Regular.7f51fe03.woff',
          revision: '7f51fe03',
        },
        {
          url: '/_next/static/media/KaTeX_Main-Regular.b7f8fe9b.ttf',
          revision: 'b7f8fe9b',
        },
        {
          url: '/_next/static/media/KaTeX_Math-BoldItalic.572d331f.woff2',
          revision: '572d331f',
        },
        {
          url: '/_next/static/media/KaTeX_Math-BoldItalic.a879cf83.ttf',
          revision: 'a879cf83',
        },
        {
          url: '/_next/static/media/KaTeX_Math-BoldItalic.f1035d8d.woff',
          revision: 'f1035d8d',
        },
        {
          url: '/_next/static/media/KaTeX_Math-Italic.5295ba48.woff',
          revision: '5295ba48',
        },
        {
          url: '/_next/static/media/KaTeX_Math-Italic.939bc644.ttf',
          revision: '939bc644',
        },
        {
          url: '/_next/static/media/KaTeX_Math-Italic.f28c23ac.woff2',
          revision: 'f28c23ac',
        },
        {
          url: '/_next/static/media/KaTeX_SansSerif-Bold.8c5b5494.woff2',
          revision: '8c5b5494',
        },
        {
          url: '/_next/static/media/KaTeX_SansSerif-Bold.94e1e8dc.ttf',
          revision: '94e1e8dc',
        },
        {
          url: '/_next/static/media/KaTeX_SansSerif-Bold.bf59d231.woff',
          revision: 'bf59d231',
        },
        {
          url: '/_next/static/media/KaTeX_SansSerif-Italic.3b1e59b3.woff2',
          revision: '3b1e59b3',
        },
        {
          url: '/_next/static/media/KaTeX_SansSerif-Italic.7c9bc82b.woff',
          revision: '7c9bc82b',
        },
        {
          url: '/_next/static/media/KaTeX_SansSerif-Italic.b4c20c84.ttf',
          revision: 'b4c20c84',
        },
        {
          url: '/_next/static/media/KaTeX_SansSerif-Regular.74048478.woff',
          revision: '74048478',
        },
        {
          url: '/_next/static/media/KaTeX_SansSerif-Regular.ba21ed5f.woff2',
          revision: 'ba21ed5f',
        },
        {
          url: '/_next/static/media/KaTeX_SansSerif-Regular.d4d7ba48.ttf',
          revision: 'd4d7ba48',
        },
        {
          url: '/_next/static/media/KaTeX_Script-Regular.03e9641d.woff2',
          revision: '03e9641d',
        },
        {
          url: '/_next/static/media/KaTeX_Script-Regular.07505710.woff',
          revision: '07505710',
        },
        {
          url: '/_next/static/media/KaTeX_Script-Regular.fe9cbbe1.ttf',
          revision: 'fe9cbbe1',
        },
        {
          url: '/_next/static/media/KaTeX_Size1-Regular.e1e279cb.woff',
          revision: 'e1e279cb',
        },
        {
          url: '/_next/static/media/KaTeX_Size1-Regular.eae34984.woff2',
          revision: 'eae34984',
        },
        {
          url: '/_next/static/media/KaTeX_Size1-Regular.fabc004a.ttf',
          revision: 'fabc004a',
        },
        {
          url: '/_next/static/media/KaTeX_Size2-Regular.57727022.woff',
          revision: '57727022',
        },
        {
          url: '/_next/static/media/KaTeX_Size2-Regular.5916a24f.woff2',
          revision: '5916a24f',
        },
        {
          url: '/_next/static/media/KaTeX_Size2-Regular.d6b476ec.ttf',
          revision: 'd6b476ec',
        },
        {
          url: '/_next/static/media/KaTeX_Size3-Regular.9acaf01c.woff',
          revision: '9acaf01c',
        },
        {
          url: '/_next/static/media/KaTeX_Size3-Regular.a144ef58.ttf',
          revision: 'a144ef58',
        },
        {
          url: '/_next/static/media/KaTeX_Size3-Regular.b4230e7e.woff2',
          revision: 'b4230e7e',
        },
        {
          url: '/_next/static/media/KaTeX_Size4-Regular.10d95fd3.woff2',
          revision: '10d95fd3',
        },
        {
          url: '/_next/static/media/KaTeX_Size4-Regular.7a996c9d.woff',
          revision: '7a996c9d',
        },
        {
          url: '/_next/static/media/KaTeX_Size4-Regular.fbccdabe.ttf',
          revision: 'fbccdabe',
        },
        {
          url: '/_next/static/media/KaTeX_Typewriter-Regular.6258592b.woff',
          revision: '6258592b',
        },
        {
          url: '/_next/static/media/KaTeX_Typewriter-Regular.a8709e36.woff2',
          revision: 'a8709e36',
        },
        {
          url: '/_next/static/media/KaTeX_Typewriter-Regular.d97aaf4a.ttf',
          revision: 'd97aaf4a',
        },
        {
          url: '/_next/static/media/african_ai_horizontal.0303e408.png',
          revision: '42c77db851f315f7c07a8ec8568251c7',
        },
        {
          url: '/_next/static/media/african_ai_square.5df7c7b5.png',
          revision: '5923580248dc1999c8369ca9c55ce413',
        },
        {
          url: '/_next/static/media/aina_logo.d6b3e01c.png',
          revision: 'bc63dc7efc7407a958a2ee0b8a30da5b',
        },
        {
          url: '/_next/static/media/assignment-page-activity.e89a18d4.png',
          revision: '58a8fb62b11d9a1af54835d921f7e6bc',
        },
        {
          url: '/_next/static/media/documentpdf-page-activity.1a98989f.png',
          revision: 'c5ed11ee4c186546fe76958b150482b9',
        },
        {
          url: '/_next/static/media/dynamic-page-activity.d8889013.png',
          revision: '9597715a3e736b0d557952a223d9b4a4',
        },
        {
          url: '/_next/static/media/empty_thumbnail.bc3322c0.png',
          revision: '1e3f9bdd4de85cc692954c5e8d1eb9f4',
        },
        {
          url: '/_next/static/media/live-session-activity.b288aeda.png',
          revision: 'ddaaefffdb1edbfa48f8094c4814fa53',
        },
        {
          url: '/_next/static/media/video-page-activity.74186bba.png',
          revision: 'a32a24a08130eedba9b4aad6dfa9ac8b',
        },
        {
          url: '/_next/static/o1BW7m8Z_aw5NGWf6K8BY/_buildManifest.js',
          revision: '928cc68456f00e8cc4147ec0956d024c',
        },
        {
          url: '/_next/static/o1BW7m8Z_aw5NGWf6K8BY/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        {
          url: '/activities_types/assignment-page-activity.png',
          revision: '58a8fb62b11d9a1af54835d921f7e6bc',
        },
        {
          url: '/activities_types/documentpdf-page-activity.png',
          revision: 'c5ed11ee4c186546fe76958b150482b9',
        },
        {
          url: '/activities_types/dynamic-page-activity.png',
          revision: '9597715a3e736b0d557952a223d9b4a4',
        },
        {
          url: '/activities_types/live-session-activity.png',
          revision: 'ddaaefffdb1edbfa48f8094c4814fa53',
        },
        {
          url: '/activities_types/video-page-activity.png',
          revision: 'a32a24a08130eedba9b4aad6dfa9ac8b',
        },
        {
          url: '/african_ai_horizontal.png',
          revision: '42c77db851f315f7c07a8ec8568251c7',
        },
        {
          url: '/african_ai_network_logo.png',
          revision: '1810fbdcb7e993ad6b3b936de551cf5f',
        },
        {
          url: '/african_ai_square.png',
          revision: '5923580248dc1999c8369ca9c55ce413',
        },
        { url: '/ai_avatar.png', revision: '3817d7bf59aa7f5dadd7103a232d308a' },
        { url: '/aina_logo.png', revision: 'bc63dc7efc7407a958a2ee0b8a30da5b' },
        {
          url: '/assets/illustrations/edu_background.png',
          revision: '065086f96ce3c3ca6863b62eb2cfd4c0',
        },
        {
          url: '/assets/illustrations/edu_doodle_bg.png',
          revision: '03f74342873a9c0e88b8e303a76947b5',
        },
        {
          url: '/black_logo.png',
          revision: '50aedfca13e9aa13ff807e8cbf4bf960',
        },
        {
          url: '/chat-wallpaper.png',
          revision: 'ad5209a62601421889b43bdb107b5bcf',
        },
        {
          url: '/data/aan-contractor-privacy-policy.pdf',
          revision: '6112dc5ef8740baf61cbe8a0dcde1eac',
        },
        {
          url: '/data/aan-learner-code-of-conduct-honor-code.pdf',
          revision: '9ec624e0020e8e277e449bfba64b1f17',
        },
        {
          url: '/data/aan-learner-privacy-policy.pdf',
          revision: '273fc3521a5294a19a31e25f0163ee58',
        },
        {
          url: '/data/aan-legacy-points-guide.pdf',
          revision: '1ad67a9b005ba2c04c750361c0b2d7da',
        },
        {
          url: '/data/aan-online-community-guidelines.pdf',
          revision: 'a2ac94a3ec1dbd38cb666769e68d9667',
        },
        {
          url: '/data/aan-policy-and-guidelines-hub.pdf',
          revision: 'a807d2fba2a53ecfeed105e9e40f46ca',
        },
        {
          url: '/data/aan-referral-reward-program-terms-of-use.pdf',
          revision: '06705c3e12d770ac04dc79e07813efe5',
        },
        {
          url: '/data/aan-registration-and-selection-policy.pdf',
          revision: 'dcbcb928d803afc465d6bf436326d0d3',
        },
        {
          url: '/data/appeals-and-conduct-committee-guidelines.pdf',
          revision: '7291473a46c831b5e3df9b6551295edc',
        },
        {
          url: '/data/assessment-policy-and-procedure.pdf',
          revision: '9b404548079fc27caf04955dc9e125b1',
        },
        {
          url: '/data/cancellation-and-refund-policy.pdf',
          revision: '00c758f4ea214143bf6633a1760c5ce4',
        },
        {
          url: '/data/certification-policy-and-procedure.pdf',
          revision: '837c900c79eb82a01047cfbd34f44399',
        },
        {
          url: '/data/course-delivery-policy-and-procedure.pdf',
          revision: 'e95d7e0552882f26d0193d77e0f12941',
        },
        {
          url: '/data/terms-and-conditions-ehub.pdf',
          revision: '5669fbbb32018df0225775ceadea10bd',
        },
        { url: '/edu_bg.png', revision: '03f74342873a9c0e88b8e303a76947b5' },
        {
          url: '/empty_avatar.png',
          revision: 'f09497b681074bcdab85c8456cdc93d6',
        },
        {
          url: '/empty_thumbnail.png',
          revision: '1e3f9bdd4de85cc692954c5e8d1eb9f4',
        },
        { url: '/favicon.ico', revision: '88895ef7060d6a0e16c251b638555303' },
        { url: '/favicon.png', revision: '88895ef7060d6a0e16c251b638555303' },
        {
          url: '/icons/icon-128x128.png',
          revision: '962d0575f036838d014762d375f87161',
        },
        {
          url: '/icons/icon-144x144.png',
          revision: 'cfb616745be7497621bf7987b74b7d69',
        },
        {
          url: '/icons/icon-152x152.png',
          revision: '72e17907a48d692038fc88e56e22a292',
        },
        {
          url: '/icons/icon-192x192.png',
          revision: 'f9a4277002ff48309d9e0d0c5dd7a7eb',
        },
        {
          url: '/icons/icon-256x256.png',
          revision: '192b1545e9ffffc8b102aefe290cff73',
        },
        {
          url: '/icons/icon-384x384.png',
          revision: '183f94ec313858fc05ad336383d8992a',
        },
        {
          url: '/icons/icon-48x48.png',
          revision: 'd535796a4244e91fb53bf962555984f5',
        },
        {
          url: '/icons/icon-512x512.png',
          revision: '08659fe6d5393235cd939c01588c2553',
        },
        {
          url: '/icons/icon-72x72.png',
          revision: '19025de786cfe316bdef83dea902ccf7',
        },
        {
          url: '/icons/icon-96x96.png',
          revision: '0bc418e076974deff37b7f537d9b794b',
        },
        {
          url: '/landing/aina_ai_automation.jpg',
          revision: '4339d03d0ae1b1420e2313369ec10aa4',
        },
        {
          url: '/landing/aina_ai_engineering.jpg',
          revision: '13e367e6dd369c7824fa69afe01a84d1',
        },
        {
          url: '/landing/aina_backend_laravel.jpg',
          revision: '42e9cb50a39ba24900e75ed53678478d',
        },
        {
          url: '/landing/aina_backend_node.jpg',
          revision: '3a8dc8d89f7fe16a15ed942416645d69',
        },
        {
          url: '/landing/aina_cloud_computing.jpg',
          revision: 'bbc296fc3eda7ddea20afb544a4e6223',
        },
        {
          url: '/landing/aina_content_creators.jpg',
          revision: 'a38dfc05e96f11c38afab43367aef677',
        },
        {
          url: '/landing/aina_data_science.jpg',
          revision: '86821d90a9131cf3ad9a7654c4f35861',
        },
        {
          url: '/landing/aina_frontend.jpg',
          revision: '74a57cdd456de3e888366472afb245a7',
        },
        {
          url: '/landing/aina_fullstack.jpg',
          revision: '7346c358b50559023037345b4cdee852',
        },
        {
          url: '/landing/aina_genai.jpg',
          revision: 'f806001c33c30c7fb64e1dedff00a4aa',
        },
        {
          url: '/landing/aina_mobile_app.jpg',
          revision: '29292aee6977ecd5c2b1470d96cae83b',
        },
        {
          url: '/landing/aina_mobile_mockup.png',
          revision: 'c316bbb4bebc0b4af0cd7d9074deace2',
        },
        {
          url: '/landing/aina_security.jpg',
          revision: 'ae1f7fa07c31ad7f992da7601bac2503',
        },
        {
          url: '/landing/aina_video_production.jpg',
          revision: 'd003305c2452ccdbca6539740cf473e6',
        },
        {
          url: '/landing/alx_ai_automation.jpg',
          revision: '8c9310a7ce1d44aff9cd7e848246618a',
        },
        {
          url: '/landing/alx_ai_engineering.jpg',
          revision: 'cde4995a7a0d3c5f32c2f713453494b7',
        },
        {
          url: '/landing/alx_backend_laravel.jpg',
          revision: '505712332eb46eb12a6691fef9d91570',
        },
        {
          url: '/landing/alx_backend_node.jpg',
          revision: 'd865542a6dfddca3920787db32c5fd5d',
        },
        {
          url: '/landing/alx_cloud_computing.jpg',
          revision: 'b953bdf803ed4e8b714910cd8c9eaaf6',
        },
        {
          url: '/landing/alx_content_creators.jpg',
          revision: '8d33eacf5d74fe86e9fafc2399de96b6',
        },
        {
          url: '/landing/alx_data_science.jpg',
          revision: '40db556674e65f1b531b2c2abb3ca2a6',
        },
        {
          url: '/landing/alx_frontend.jpg',
          revision: '006ec7cf1b2c64eb838b7cc20effde9e',
        },
        {
          url: '/landing/alx_fullstack.jpg',
          revision: '0c619002f088e02cb3398b7dc3fac54e',
        },
        {
          url: '/landing/alx_genai.jpg',
          revision: '410ef7c0a0444b517746730345a015e9',
        },
        {
          url: '/landing/alx_mobile_app.jpg',
          revision: 'c766ad50e119d0b8690560cf74696695',
        },
        {
          url: '/landing/alx_security.jpg',
          revision: 'd2f1297836c99366d0699e5e8447e7a8',
        },
        {
          url: '/landing/alx_video_production.jpg',
          revision: 'cbe576734c065ca080b340ccc03639bc',
        },
        {
          url: '/landing/calabar.png',
          revision: 'c4af85ef7ea0a6db920018d49b782ead',
        },
        {
          url: '/landing/contact_bg.png',
          revision: '9cf6875f2d9d6c5653ed0bbdcc10a413',
        },
        {
          url: '/landing/hero_bg.png',
          revision: '20cc59a4a20aa8d5e8edf020444d3ba7',
        },
        {
          url: '/landing/hero_person.png',
          revision: '94ff098a7753e1828c27da1002fafdf5',
        },
        {
          url: '/landing/hero_professional_new.jpg',
          revision: 'cf906c8cef5155a352fb401cd91e1c6f',
        },
        {
          url: '/landing/internship_office.png',
          revision: '755e4768ee5f67505d9e253c5be062bb',
        },
        {
          url: '/landing/laptop_giveaway.png',
          revision: 'd2cc63c652abca6ffb0570ef17523680',
        },
        {
          url: '/landing/lms_mobile_mockup.png',
          revision: 'bbb0ddbd74c6ab257fdaa6fdc2dda0b1',
        },
        {
          url: '/landing/program_ai_engineering.png',
          revision: '289931125a9097da49ff0927c127831e',
        },
        {
          url: '/landing/program_automation.png',
          revision: '096acc7061d43edfe4e86ce7ff0a06d3',
        },
        {
          url: '/landing/program_automation_v2.png',
          revision: '557940a0e4d5e3516ca9e359b0e054cd',
        },
        {
          url: '/landing/program_automation_v3.png',
          revision: '44bca9ed5b0fb571c85d30e2a6fd63bf',
        },
        {
          url: '/landing/program_backend_laravel.png',
          revision: '0d0f3fb112d78662efaad6c8bc04209b',
        },
        {
          url: '/landing/program_backend_node.png',
          revision: 'defb721c1f6a47c567dceb25339e55e6',
        },
        {
          url: '/landing/program_cloud.png',
          revision: '454d9c367c114403150815fdeb1cf9f3',
        },
        {
          url: '/landing/program_content_creators.png',
          revision: '2cfd36b0ab9508d2ed50e20f493b07a2',
        },
        {
          url: '/landing/program_frontend.png',
          revision: '47323824016bb87eaae170820acf26c3',
        },
        {
          url: '/landing/program_fullstack.png',
          revision: '161c560cda8ca498d535f9629c712606',
        },
        {
          url: '/landing/program_genai.png',
          revision: 'd04c032de13b1716fe2d39cd596bfad6',
        },
        {
          url: '/landing/program_genai_v2.png',
          revision: 'a2d82f0d0cbecba48f359dfd91af0d4a',
        },
        {
          url: '/landing/program_graphic.png',
          revision: '0a65da018ce047e00f2b3942686ac55d',
        },
        {
          url: '/landing/program_marketing.png',
          revision: '178892d5aae2bcc2430f3606d4175edf',
        },
        {
          url: '/landing/program_ml.png',
          revision: '418f7b8b6ddd60a2c8398dfa89853008',
        },
        {
          url: '/landing/program_ml_v2.png',
          revision: '7a46278be3493049a18d60c8c2c39409',
        },
        {
          url: '/landing/program_mobile.png',
          revision: '91b3deee3997611c8b2e8509a0b5e236',
        },
        {
          url: '/landing/program_product_mgmt.png',
          revision: '178892d5aae2bcc2430f3606d4175edf',
        },
        {
          url: '/landing/program_project_mgmt.png',
          revision: '178892d5aae2bcc2430f3606d4175edf',
        },
        {
          url: '/landing/program_security.png',
          revision: '472ee66ac82b29594a68499ce70edff4',
        },
        {
          url: '/landing/program_uiux.png',
          revision: 'b6b4841f9557c2e96bbf9e137d322540',
        },
        {
          url: '/landing/program_video_animation.png',
          revision: '456a48b0675e00ca27c39fa14e3014d5',
        },
        {
          url: '/landing/programs_bg.png',
          revision: '6b4233ea39da5687fbcb61db0687d902',
        },
        {
          url: '/landing/roadmap_bg.png',
          revision: '1d2db3e2c5afa1fbd9ae9d3e5e3f0a8f',
        },
        {
          url: '/landing/specializations_bg.png',
          revision: '0cb4b8eba1cfab0114fca50b9d6acb02',
        },
        {
          url: '/landing/student_studying_library.png',
          revision: '7a273abde1b6c7d3af47f8f88cf24874',
        },
        {
          url: '/landing/talent_partner.png',
          revision: '18ae855f38e747c7edda858bf13a92a2',
        },
        {
          url: '/landing/trellissoft.png',
          revision: '7bc723fb9e21dbc0d5c7939a8eef8fbc',
        },
        {
          url: '/learnhouse_ai_black_logo.png',
          revision: '92a7f9787ee2af90d46b1c8a6423dc88',
        },
        {
          url: '/learnhouse_ai_simple.png',
          revision: '42fe5f364914ddce29d44d34beb0ceb0',
        },
        {
          url: '/learnhouse_ai_simple_colored.png',
          revision: '6fc177c487cb815ed5e4bf4ce576b0a0',
        },
        {
          url: '/learnhouse_bigicon.png',
          revision: '08659fe6d5393235cd939c01588c2553',
        },
        {
          url: '/learnhouse_bigicon_1.png',
          revision: '2e7507a1651905e63fde92ac53277004',
        },
        {
          url: '/learnhouse_icon.png',
          revision: '08659fe6d5393235cd939c01588c2553',
        },
        {
          url: '/learnhouse_logo.png',
          revision: '1810fbdcb7e993ad6b3b936de551cf5f',
        },
        {
          url: '/learnhouse_text_white.png',
          revision: '1810fbdcb7e993ad6b3b936de551cf5f',
        },
        { url: '/llms.txt', revision: '991d2057995e0362cdd30b695d196d83' },
        { url: '/manifest.json', revision: '10fa00d6b494a5f643e8f4ecbbdc9f73' },
        {
          url: '/marketer-bg.png',
          revision: '4807f313d34ce14ae02f7b81005c1ffc',
        },
        {
          url: '/onboarding/OnBoardAI.png',
          revision: 'a8385b5ac5e3ee07c67e1e95ba8a64c0',
        },
        {
          url: '/onboarding/OnBoardAccess.png',
          revision: '9d53d18174aef5560cdb4363f8717803',
        },
        {
          url: '/onboarding/OnBoardActivities.png',
          revision: 'c650f3edc67813a2dccd99c5421c9b49',
        },
        {
          url: '/onboarding/OnBoardAssignments.png',
          revision: '116441754aff30124fa0aa57e985ef0a',
        },
        {
          url: '/onboarding/OnBoardCourses.png',
          revision: 'd7d4cc7d6c87dd3e6aed735848f59d55',
        },
        {
          url: '/onboarding/OnBoardEditor.png',
          revision: '5221d7a212412e2b04eed8da02d36ad5',
        },
        {
          url: '/onboarding/OnBoardMore.png',
          revision: 'b93d0463584c18b5878100e7c428a29e',
        },
        {
          url: '/onboarding/OnBoardPayments.png',
          revision: '5a5cd674293f157487d63b4503f218b2',
        },
        {
          url: '/onboarding/OnBoardUGs.png',
          revision: 'f17ef550a215803daf283f7c3ed73aba',
        },
        {
          url: '/onboarding/OnBoardWelcome.png',
          revision: '0fd5d274afcf3d09b7542ef9e353753f',
        },
        { url: '/robots.txt', revision: '6a2af4cffd26e4a1d2df89c241977573' },
        {
          url: '/svg/collections.svg',
          revision: 'f4a0219ca10d0f4b8136410ed991d09f',
        },
        {
          url: '/svg/courses.svg',
          revision: 'f4e1807b7edc9ee39b89c8b30d387292',
        },
        { url: '/svg/trail.svg', revision: '1e647fc65528aee2a326ae963a0108c7' },
      ],
      { ignoreURLParametersMatching: [/^utm_/, /^fbclid$/] }
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      '/',
      new e.NetworkFirst({
        cacheName: 'start-url',
        plugins: [
          {
            cacheWillUpdate: async ({ response: e }) =>
              e && 'opaqueredirect' === e.type
                ? new Response(e.body, {
                    status: 200,
                    statusText: 'OK',
                    headers: e.headers,
                  })
                : e,
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: 'google-fonts-webfonts',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: 'google-fonts-stylesheets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-font-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-image-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 2592e3 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/static.+\.js$/i,
      new e.CacheFirst({
        cacheName: 'next-static-js-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-image',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: 'static-audio-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:mp4|webm)$/i,
      new e.CacheFirst({
        cacheName: 'static-video-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-js-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 48, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-style-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-data',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: 'static-data-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ sameOrigin: e, url: { pathname: a } }) =>
        !(!e || a.startsWith('/api/auth/callback') || !a.startsWith('/api/')),
      new e.NetworkFirst({
        cacheName: 'apis',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ request: e, url: { pathname: a }, sameOrigin: i }) =>
        '1' === e.headers.get('RSC') &&
        '1' === e.headers.get('Next-Router-Prefetch') &&
        i &&
        !a.startsWith('/api/'),
      new e.NetworkFirst({
        cacheName: 'pages-rsc-prefetch',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ request: e, url: { pathname: a }, sameOrigin: i }) =>
        '1' === e.headers.get('RSC') && i && !a.startsWith('/api/'),
      new e.NetworkFirst({
        cacheName: 'pages-rsc',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ url: { pathname: e }, sameOrigin: a }) => a && !e.startsWith('/api/'),
      new e.NetworkFirst({
        cacheName: 'pages',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ sameOrigin: e }) => !e,
      new e.NetworkFirst({
        cacheName: 'cross-origin',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 }),
        ],
      }),
      'GET'
    )
})
//# sourceMappingURL=sw.js.map
