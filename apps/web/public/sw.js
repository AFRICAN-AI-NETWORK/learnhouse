if (!self.define) {
  let e,
    a = {}
  const c = (c, s) => (
    (c = new URL(c + '.js', s).href),
    a[c] ||
      new Promise((a) => {
        if ('document' in self) {
          const e = document.createElement('script')
          ;(e.src = c), (e.onload = a), document.head.appendChild(e)
        } else (e = c), importScripts(c), a()
      }).then(() => {
        let e = a[c]
        if (!e) throw new Error(`Module ${c} didn’t register its module`)
        return e
      })
  )
  self.define = (s, i) => {
    const n =
      e ||
      ('document' in self ? document.currentScript.src : '') ||
      location.href
    if (a[n]) return
    let t = {}
    const r = (e) => c(e, n),
      d = { module: { uri: n }, exports: t, require: r }
    a[n] = Promise.all(s.map((e) => d[e] || r(e))).then((e) => (i(...e), t))
  }
}
define(['./workbox-e9849328'], function (e) {
  'use strict'
  importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: '/_next/static/chunks/0af3c2ec-e9cb432fe9c24414.js',
          revision: 'e9cb432fe9c24414',
        },
        {
          url: '/_next/static/chunks/0af3c2ec-e9cb432fe9c24414.js.map',
          revision: '86b8855cf2a976da83512e7e6f95959f',
        },
        {
          url: '/_next/static/chunks/1167.7cdd3ea98d903f16.js',
          revision: '7cdd3ea98d903f16',
        },
        {
          url: '/_next/static/chunks/1167.7cdd3ea98d903f16.js.map',
          revision: '75c862811a00a3c39a5eecbcb427a078',
        },
        {
          url: '/_next/static/chunks/1229.0d04e37fdc740146.js',
          revision: '0d04e37fdc740146',
        },
        {
          url: '/_next/static/chunks/1229.0d04e37fdc740146.js.map',
          revision: 'a7dab0305bbc71db1a7fea3ba84ac050',
        },
        {
          url: '/_next/static/chunks/1264-d2e40d3c256eb00c.js',
          revision: 'd2e40d3c256eb00c',
        },
        {
          url: '/_next/static/chunks/1264-d2e40d3c256eb00c.js.map',
          revision: 'a35a8f2c71f9ea77f818c26a8965d9dc',
        },
        {
          url: '/_next/static/chunks/1460-6fdff614086f0a6f.js',
          revision: '6fdff614086f0a6f',
        },
        {
          url: '/_next/static/chunks/1460-6fdff614086f0a6f.js.map',
          revision: '2cf3e61bb6ba120f0983f91e67a6b86f',
        },
        {
          url: '/_next/static/chunks/1624.32cf864804a7cde8.js',
          revision: '32cf864804a7cde8',
        },
        {
          url: '/_next/static/chunks/1624.32cf864804a7cde8.js.map',
          revision: '8ae243dc2f027b693b5772a4c77a161c',
        },
        {
          url: '/_next/static/chunks/169-c02acb9b27ece1f8.js',
          revision: 'c02acb9b27ece1f8',
        },
        {
          url: '/_next/static/chunks/169-c02acb9b27ece1f8.js.map',
          revision: 'e152b3087aeedfaca6823ea0d6702d7f',
        },
        {
          url: '/_next/static/chunks/1774-a131929fb41cd085.js',
          revision: 'a131929fb41cd085',
        },
        {
          url: '/_next/static/chunks/1774-a131929fb41cd085.js.map',
          revision: '166f875f3bb674d96201ec8642b8df70',
        },
        {
          url: '/_next/static/chunks/1928-10474b29d571a623.js',
          revision: '10474b29d571a623',
        },
        {
          url: '/_next/static/chunks/1928-10474b29d571a623.js.map',
          revision: '9ac2f945afaf88bce0ff2ac08f5c6b9a',
        },
        {
          url: '/_next/static/chunks/1995-cb15b34762d171e8.js',
          revision: 'cb15b34762d171e8',
        },
        {
          url: '/_next/static/chunks/1995-cb15b34762d171e8.js.map',
          revision: 'ff4ee4b170eb4689013a22d7c399ccf0',
        },
        {
          url: '/_next/static/chunks/1f7c39b4-7dc1c0e484494575.js',
          revision: '7dc1c0e484494575',
        },
        {
          url: '/_next/static/chunks/1f7c39b4-7dc1c0e484494575.js.map',
          revision: '57a48b2fd5608c835df31c89b91fda6b',
        },
        {
          url: '/_next/static/chunks/2247-cb07bf50e01fa5c3.js',
          revision: 'cb07bf50e01fa5c3',
        },
        {
          url: '/_next/static/chunks/2247-cb07bf50e01fa5c3.js.map',
          revision: '789521811ab6258e2d1857f0347b8e88',
        },
        {
          url: '/_next/static/chunks/2376-619ab3956cf8e393.js',
          revision: '619ab3956cf8e393',
        },
        {
          url: '/_next/static/chunks/2376-619ab3956cf8e393.js.map',
          revision: '248f6ee3c311d4f4094bd8d03b80ef2d',
        },
        {
          url: '/_next/static/chunks/2395-bcb39077100f0348.js',
          revision: 'bcb39077100f0348',
        },
        {
          url: '/_next/static/chunks/2395-bcb39077100f0348.js.map',
          revision: 'c386a8837dde30faff9bf02967950128',
        },
        {
          url: '/_next/static/chunks/2412.bb5b73944db65314.js',
          revision: 'bb5b73944db65314',
        },
        {
          url: '/_next/static/chunks/2412.bb5b73944db65314.js.map',
          revision: 'cf0dd140f5440ccea99db8c39c5653a2',
        },
        {
          url: '/_next/static/chunks/2427-a225db2859ef3d58.js',
          revision: 'a225db2859ef3d58',
        },
        {
          url: '/_next/static/chunks/2427-a225db2859ef3d58.js.map',
          revision: '15e25cb1f44b74fe92b042c139059fb7',
        },
        {
          url: '/_next/static/chunks/2465-69ee75c6feb279cd.js',
          revision: '69ee75c6feb279cd',
        },
        {
          url: '/_next/static/chunks/2465-69ee75c6feb279cd.js.map',
          revision: 'c26303d2d83001a4976c9497597583d6',
        },
        {
          url: '/_next/static/chunks/2542.2692b8891f96b0ae.js',
          revision: '2692b8891f96b0ae',
        },
        {
          url: '/_next/static/chunks/2542.2692b8891f96b0ae.js.map',
          revision: 'd69f4f972cb719e1ed449a654c385788',
        },
        {
          url: '/_next/static/chunks/2673-1939ee6664f56e39.js',
          revision: '1939ee6664f56e39',
        },
        {
          url: '/_next/static/chunks/2673-1939ee6664f56e39.js.map',
          revision: 'bff22766953aed88cc5e890a58a8828e',
        },
        {
          url: '/_next/static/chunks/2700-b489cab14c3c0e9f.js',
          revision: 'b489cab14c3c0e9f',
        },
        {
          url: '/_next/static/chunks/2700-b489cab14c3c0e9f.js.map',
          revision: 'e0649235149f531484d6fb4359c8e9b3',
        },
        {
          url: '/_next/static/chunks/273acdc0-5c6e658e9de65ae8.js',
          revision: '5c6e658e9de65ae8',
        },
        {
          url: '/_next/static/chunks/273acdc0-5c6e658e9de65ae8.js.map',
          revision: '56f4bcd9a4df466d8d827aabde1cfc23',
        },
        {
          url: '/_next/static/chunks/2783.41b30ce5d31bfd4b.js',
          revision: '41b30ce5d31bfd4b',
        },
        {
          url: '/_next/static/chunks/2783.41b30ce5d31bfd4b.js.map',
          revision: '5abe3e5a6d42be2f7e8c6a4ab38d9e40',
        },
        {
          url: '/_next/static/chunks/2796-428eb19de1ec4894.js',
          revision: '428eb19de1ec4894',
        },
        {
          url: '/_next/static/chunks/2796-428eb19de1ec4894.js.map',
          revision: '91f0e6b5b71f2dd61dcb3e8d63aa670a',
        },
        {
          url: '/_next/static/chunks/2805-061e1a9d308e0ac2.js',
          revision: '061e1a9d308e0ac2',
        },
        {
          url: '/_next/static/chunks/2805-061e1a9d308e0ac2.js.map',
          revision: '6265930c8435f97207359f0beaa5032e',
        },
        {
          url: '/_next/static/chunks/2813.050730ece091f53f.js',
          revision: '050730ece091f53f',
        },
        {
          url: '/_next/static/chunks/2813.050730ece091f53f.js.map',
          revision: 'c65a38fc2f0c3c06d829bf8862c9364e',
        },
        {
          url: '/_next/static/chunks/2820.20f604a0fbf105ae.js',
          revision: '20f604a0fbf105ae',
        },
        {
          url: '/_next/static/chunks/2820.20f604a0fbf105ae.js.map',
          revision: '43adab5445f709d23895ed9cbde08d51',
        },
        {
          url: '/_next/static/chunks/2958-76b0ddfa79e340f6.js',
          revision: '76b0ddfa79e340f6',
        },
        {
          url: '/_next/static/chunks/2958-76b0ddfa79e340f6.js.map',
          revision: 'ae6bce14f32998ac40ff20a64160cc50',
        },
        {
          url: '/_next/static/chunks/3052-dc4af8e027640d3c.js',
          revision: 'dc4af8e027640d3c',
        },
        {
          url: '/_next/static/chunks/3052-dc4af8e027640d3c.js.map',
          revision: 'd115ae85d631e05642fca5db7efb5653',
        },
        {
          url: '/_next/static/chunks/3094.5072b507dd9ae7d8.js',
          revision: '5072b507dd9ae7d8',
        },
        {
          url: '/_next/static/chunks/3094.5072b507dd9ae7d8.js.map',
          revision: 'a09603b183bb65cec2758a9f8aee8bbd',
        },
        {
          url: '/_next/static/chunks/3172-e286075416ba97a9.js',
          revision: 'e286075416ba97a9',
        },
        {
          url: '/_next/static/chunks/3172-e286075416ba97a9.js.map',
          revision: '2765e018aba6cf6a4327755e36d11dbf',
        },
        {
          url: '/_next/static/chunks/3265.45c5edc34a673c44.js',
          revision: '45c5edc34a673c44',
        },
        {
          url: '/_next/static/chunks/3265.45c5edc34a673c44.js.map',
          revision: '18e67ec423b1de62ab8ec0dd2bed39c9',
        },
        {
          url: '/_next/static/chunks/335-b1241a79ba81a136.js',
          revision: 'b1241a79ba81a136',
        },
        {
          url: '/_next/static/chunks/335-b1241a79ba81a136.js.map',
          revision: '0c825fa145fe650da0470cc80d7b7c57',
        },
        {
          url: '/_next/static/chunks/3423-6f7917657b2c6346.js',
          revision: '6f7917657b2c6346',
        },
        {
          url: '/_next/static/chunks/3423-6f7917657b2c6346.js.map',
          revision: '599047f69e25559607c3932dbde22b80',
        },
        {
          url: '/_next/static/chunks/3517.d4e46d3522a9c7d2.js',
          revision: 'd4e46d3522a9c7d2',
        },
        {
          url: '/_next/static/chunks/3517.d4e46d3522a9c7d2.js.map',
          revision: '584fbe1ae646be09ca0f375180d0405e',
        },
        {
          url: '/_next/static/chunks/3551-644217ce964a7c62.js',
          revision: '644217ce964a7c62',
        },
        {
          url: '/_next/static/chunks/3551-644217ce964a7c62.js.map',
          revision: '483d93fc7b78acb1264a510dcbab0ff4',
        },
        {
          url: '/_next/static/chunks/3894-26cbd371c080852a.js',
          revision: '26cbd371c080852a',
        },
        {
          url: '/_next/static/chunks/3894-26cbd371c080852a.js.map',
          revision: '33c9ebab701d8e68f3120213a62fe2c1',
        },
        {
          url: '/_next/static/chunks/3b42e7c7-63327651e5d48c15.js',
          revision: '63327651e5d48c15',
        },
        {
          url: '/_next/static/chunks/3b42e7c7-63327651e5d48c15.js.map',
          revision: 'df03d9136887f7123b1f3b39bdcf5fe3',
        },
        {
          url: '/_next/static/chunks/4151-5ae58848a5d62c2e.js',
          revision: '5ae58848a5d62c2e',
        },
        {
          url: '/_next/static/chunks/4151-5ae58848a5d62c2e.js.map',
          revision: 'a7f78768f17a308d39598d2545327ed6',
        },
        {
          url: '/_next/static/chunks/4174-21f5f4b74ff4f0a1.js',
          revision: '21f5f4b74ff4f0a1',
        },
        {
          url: '/_next/static/chunks/4174-21f5f4b74ff4f0a1.js.map',
          revision: '0c9e66093804677eb139d76886ff8b8d',
        },
        {
          url: '/_next/static/chunks/4187-7aa4348707d6d60e.js',
          revision: '7aa4348707d6d60e',
        },
        {
          url: '/_next/static/chunks/4187-7aa4348707d6d60e.js.map',
          revision: '1c97c2e04b63f69d970a0a1bff555aef',
        },
        {
          url: '/_next/static/chunks/419-596896a9ba75fede.js',
          revision: '596896a9ba75fede',
        },
        {
          url: '/_next/static/chunks/419-596896a9ba75fede.js.map',
          revision: 'ab973acf41dcd56fc8d8ee2ab4901cc8',
        },
        {
          url: '/_next/static/chunks/4204.e428c62733342045.js',
          revision: 'e428c62733342045',
        },
        {
          url: '/_next/static/chunks/4204.e428c62733342045.js.map',
          revision: '645c09fd2af2dd3263de97ff95597a97',
        },
        {
          url: '/_next/static/chunks/445-c0611ec39ae215a6.js',
          revision: 'c0611ec39ae215a6',
        },
        {
          url: '/_next/static/chunks/445-c0611ec39ae215a6.js.map',
          revision: 'b067d9e0433651d9b0072ef56a3d5624',
        },
        {
          url: '/_next/static/chunks/4527.0eb0682f5a434339.js',
          revision: '0eb0682f5a434339',
        },
        {
          url: '/_next/static/chunks/4527.0eb0682f5a434339.js.map',
          revision: '8bf4527c1d4b9901e751fdbbf2acbaa2',
        },
        {
          url: '/_next/static/chunks/4652-b77128ef90e0f999.js',
          revision: 'b77128ef90e0f999',
        },
        {
          url: '/_next/static/chunks/4652-b77128ef90e0f999.js.map',
          revision: '08b0d28b675d1abce8713ef422bbf2b2',
        },
        {
          url: '/_next/static/chunks/5009-3d06428266b650a2.js',
          revision: '3d06428266b650a2',
        },
        {
          url: '/_next/static/chunks/5009-3d06428266b650a2.js.map',
          revision: 'd8800c897f607a46f893373eb82de159',
        },
        {
          url: '/_next/static/chunks/5072-f270b94d9ba57b07.js',
          revision: 'f270b94d9ba57b07',
        },
        {
          url: '/_next/static/chunks/5072-f270b94d9ba57b07.js.map',
          revision: '4ce496de3262002dab5a13671bc32cb4',
        },
        {
          url: '/_next/static/chunks/5147-8821f575a812f47d.js',
          revision: '8821f575a812f47d',
        },
        {
          url: '/_next/static/chunks/5147-8821f575a812f47d.js.map',
          revision: '94004d8b068a3e5da9a17ef76fc63644',
        },
        {
          url: '/_next/static/chunks/5220-9b2e99095c5db872.js',
          revision: '9b2e99095c5db872',
        },
        {
          url: '/_next/static/chunks/5220-9b2e99095c5db872.js.map',
          revision: '677dbe4272a5e5baa31914113f1e4654',
        },
        {
          url: '/_next/static/chunks/5323.2eddb8335ec51a48.js',
          revision: '2eddb8335ec51a48',
        },
        {
          url: '/_next/static/chunks/5323.2eddb8335ec51a48.js.map',
          revision: '2418e8c0494339c53f1a6211d936aa33',
        },
        {
          url: '/_next/static/chunks/5486-d14839eb20f4d4e7.js',
          revision: 'd14839eb20f4d4e7',
        },
        {
          url: '/_next/static/chunks/549-0502d07f17cf5951.js',
          revision: '0502d07f17cf5951',
        },
        {
          url: '/_next/static/chunks/549-0502d07f17cf5951.js.map',
          revision: 'f7de8b0cbc2b51ce426ff29577ededb2',
        },
        {
          url: '/_next/static/chunks/5532-94c33a437275c7fc.js',
          revision: '94c33a437275c7fc',
        },
        {
          url: '/_next/static/chunks/5532-94c33a437275c7fc.js.map',
          revision: 'c7224c114d9cab22d62f897cd59f21b7',
        },
        {
          url: '/_next/static/chunks/5644.5f3a3f3244afdb1a.js',
          revision: '5f3a3f3244afdb1a',
        },
        {
          url: '/_next/static/chunks/5644.5f3a3f3244afdb1a.js.map',
          revision: 'be7ad27b3a541287a0bd8d949bb1d83c',
        },
        {
          url: '/_next/static/chunks/5804-f3148aa0f468ab3f.js',
          revision: 'f3148aa0f468ab3f',
        },
        {
          url: '/_next/static/chunks/5804-f3148aa0f468ab3f.js.map',
          revision: 'ebe47b771b7a57f3d01aa03e07691214',
        },
        {
          url: '/_next/static/chunks/5843-11b831278dbd1a85.js',
          revision: '11b831278dbd1a85',
        },
        {
          url: '/_next/static/chunks/5843-11b831278dbd1a85.js.map',
          revision: '4af892d5f3b5d56fd197b4dcfcdad8d1',
        },
        {
          url: '/_next/static/chunks/5948.e8af75a0729978cb.js',
          revision: 'e8af75a0729978cb',
        },
        {
          url: '/_next/static/chunks/5948.e8af75a0729978cb.js.map',
          revision: 'daa9d6f132cd2db4c9c5cf52cd31af73',
        },
        {
          url: '/_next/static/chunks/5995-a68d3e0374688d62.js',
          revision: 'a68d3e0374688d62',
        },
        {
          url: '/_next/static/chunks/5995-a68d3e0374688d62.js.map',
          revision: 'a9e4bb23b7be20c3d58d93e3681f98a5',
        },
        {
          url: '/_next/static/chunks/6029-5fe8a446dcba8fd8.js',
          revision: '5fe8a446dcba8fd8',
        },
        {
          url: '/_next/static/chunks/6029-5fe8a446dcba8fd8.js.map',
          revision: '0661f72563002872488c29daffa17dc0',
        },
        {
          url: '/_next/static/chunks/6030-103ca3bfc31a7f29.js',
          revision: '103ca3bfc31a7f29',
        },
        {
          url: '/_next/static/chunks/6030-103ca3bfc31a7f29.js.map',
          revision: '2a45492d63ca359d7f88d06591408369',
        },
        {
          url: '/_next/static/chunks/6034.767f86c83bdc7049.js',
          revision: '767f86c83bdc7049',
        },
        {
          url: '/_next/static/chunks/6034.767f86c83bdc7049.js.map',
          revision: '8ce86deacebf5012e08153718de97e43',
        },
        {
          url: '/_next/static/chunks/6073-a7d3d9fe36d4451d.js',
          revision: 'a7d3d9fe36d4451d',
        },
        {
          url: '/_next/static/chunks/6073-a7d3d9fe36d4451d.js.map',
          revision: '57158cf47d289bb4e2e2d60a6df57d0b',
        },
        {
          url: '/_next/static/chunks/6141-cf4db5bcc12ffb2a.js',
          revision: 'cf4db5bcc12ffb2a',
        },
        {
          url: '/_next/static/chunks/6141-cf4db5bcc12ffb2a.js.map',
          revision: '1ef39ce4ec8bf4b9683e831a5b8138a0',
        },
        {
          url: '/_next/static/chunks/6243b3d4-a97a5f5fa1deb152.js',
          revision: 'a97a5f5fa1deb152',
        },
        {
          url: '/_next/static/chunks/6243b3d4-a97a5f5fa1deb152.js.map',
          revision: '3a40468a92eb7188578d95203d07264e',
        },
        {
          url: '/_next/static/chunks/6246-58a9a60bf0de6cb5.js',
          revision: '58a9a60bf0de6cb5',
        },
        {
          url: '/_next/static/chunks/6246-58a9a60bf0de6cb5.js.map',
          revision: '9fbc97bea6ac73d3e10f17cddb82ae29',
        },
        {
          url: '/_next/static/chunks/6255-aaa3ec70a21a2c6a.js',
          revision: 'aaa3ec70a21a2c6a',
        },
        {
          url: '/_next/static/chunks/6255-aaa3ec70a21a2c6a.js.map',
          revision: '0bfcdb4ca803f315a3024de7a9240f0e',
        },
        {
          url: '/_next/static/chunks/6257.5307d7f0ef38999c.js',
          revision: '5307d7f0ef38999c',
        },
        {
          url: '/_next/static/chunks/6257.5307d7f0ef38999c.js.map',
          revision: '4b45545b57624a2f61745b18353cdf77',
        },
        {
          url: '/_next/static/chunks/6633-c10eb278dc88ba67.js',
          revision: 'c10eb278dc88ba67',
        },
        {
          url: '/_next/static/chunks/6633-c10eb278dc88ba67.js.map',
          revision: '891c232bdfba5bc7db1f2d2c1ae682c2',
        },
        {
          url: '/_next/static/chunks/6643-505ed02b76edc63c.js',
          revision: '505ed02b76edc63c',
        },
        {
          url: '/_next/static/chunks/6643-505ed02b76edc63c.js.map',
          revision: 'f36c9f44dceb56103dc32e70065c86bc',
        },
        {
          url: '/_next/static/chunks/6750-b850fdb468b4adb5.js',
          revision: 'b850fdb468b4adb5',
        },
        {
          url: '/_next/static/chunks/6750-b850fdb468b4adb5.js.map',
          revision: 'b2c6f2f741e035392e7b64fa4a1f891a',
        },
        {
          url: '/_next/static/chunks/6761-4100dd88972cb332.js',
          revision: '4100dd88972cb332',
        },
        {
          url: '/_next/static/chunks/6761-4100dd88972cb332.js.map',
          revision: '99fea28cf662f1cc042dd3025c37e15a',
        },
        {
          url: '/_next/static/chunks/6773-d3c8e19108ef7225.js',
          revision: 'd3c8e19108ef7225',
        },
        {
          url: '/_next/static/chunks/6773-d3c8e19108ef7225.js.map',
          revision: '7fc592bfe7cd2058162f94064eb71f18',
        },
        {
          url: '/_next/static/chunks/6782-0b11b88af1f0ef72.js',
          revision: '0b11b88af1f0ef72',
        },
        {
          url: '/_next/static/chunks/6782-0b11b88af1f0ef72.js.map',
          revision: '1cb2d08ba47951623c71960a11c9d781',
        },
        {
          url: '/_next/static/chunks/6826-6eb9172e5292fa9d.js',
          revision: '6eb9172e5292fa9d',
        },
        {
          url: '/_next/static/chunks/6826-6eb9172e5292fa9d.js.map',
          revision: '2de36abb74c52b90123f41bcd73f798c',
        },
        {
          url: '/_next/static/chunks/6997-4bb33f3b85b86508.js',
          revision: '4bb33f3b85b86508',
        },
        {
          url: '/_next/static/chunks/6997-4bb33f3b85b86508.js.map',
          revision: '3f4de4b4a2c865f76c8840ae8d1a6f05',
        },
        {
          url: '/_next/static/chunks/7061-61e5e9d107fbf1c1.js',
          revision: '61e5e9d107fbf1c1',
        },
        {
          url: '/_next/static/chunks/7061-61e5e9d107fbf1c1.js.map',
          revision: '8e4eb9ec406b2c1f3eef7f79df1194e6',
        },
        {
          url: '/_next/static/chunks/7233.665f0a6f49a8d17d.js',
          revision: '665f0a6f49a8d17d',
        },
        {
          url: '/_next/static/chunks/7233.665f0a6f49a8d17d.js.map',
          revision: 'e0b8e982f91a23cad45e67e14fea0dd2',
        },
        {
          url: '/_next/static/chunks/7243-143b6f95feed1f8d.js',
          revision: '143b6f95feed1f8d',
        },
        {
          url: '/_next/static/chunks/7243-143b6f95feed1f8d.js.map',
          revision: '9aa77452df13c48f8d200955a1f3d91f',
        },
        {
          url: '/_next/static/chunks/7317-af5234313d6cafea.js',
          revision: 'af5234313d6cafea',
        },
        {
          url: '/_next/static/chunks/7317-af5234313d6cafea.js.map',
          revision: 'e0773b215504a00df3135a573dfc700a',
        },
        {
          url: '/_next/static/chunks/7570-1e18c1b41ec30c0e.js',
          revision: '1e18c1b41ec30c0e',
        },
        {
          url: '/_next/static/chunks/7570-1e18c1b41ec30c0e.js.map',
          revision: '8c0961e740f54f69c0e618f33228a047',
        },
        {
          url: '/_next/static/chunks/78-c163e22d4cc99900.js',
          revision: 'c163e22d4cc99900',
        },
        {
          url: '/_next/static/chunks/78-c163e22d4cc99900.js.map',
          revision: 'bf4a7ef4ee11ff38d9e10b6fcea97ee9',
        },
        {
          url: '/_next/static/chunks/789-98901340aadc11e9.js',
          revision: '98901340aadc11e9',
        },
        {
          url: '/_next/static/chunks/789-98901340aadc11e9.js.map',
          revision: '1603f7c00d48ef207d8b29f0a50e02e4',
        },
        {
          url: '/_next/static/chunks/7b3dac53-5524f54f8132a45e.js',
          revision: '5524f54f8132a45e',
        },
        {
          url: '/_next/static/chunks/7b3dac53-5524f54f8132a45e.js.map',
          revision: '0eb618ed84e7b6d7c1dff4a26f549989',
        },
        {
          url: '/_next/static/chunks/8110-5dbc17e9228e1e5d.js',
          revision: '5dbc17e9228e1e5d',
        },
        {
          url: '/_next/static/chunks/8110-5dbc17e9228e1e5d.js.map',
          revision: '0feba6a9c952e21f57a22a27d09883ac',
        },
        {
          url: '/_next/static/chunks/8222-207637f5d29a100f.js',
          revision: '207637f5d29a100f',
        },
        {
          url: '/_next/static/chunks/8222-207637f5d29a100f.js.map',
          revision: 'ea1b7edc2b763e1aea208a0f486aa631',
        },
        {
          url: '/_next/static/chunks/8257.c7cd7bbee4dbef5e.js',
          revision: 'c7cd7bbee4dbef5e',
        },
        {
          url: '/_next/static/chunks/8257.c7cd7bbee4dbef5e.js.map',
          revision: '58f012849542570ac9b5f703e8cc8694',
        },
        {
          url: '/_next/static/chunks/8426-8f48c647f8e29499.js',
          revision: '8f48c647f8e29499',
        },
        {
          url: '/_next/static/chunks/8426-8f48c647f8e29499.js.map',
          revision: '769f123b940402639fc90ae7261f4523',
        },
        {
          url: '/_next/static/chunks/844-5105345adc8458ef.js',
          revision: '5105345adc8458ef',
        },
        {
          url: '/_next/static/chunks/844-5105345adc8458ef.js.map',
          revision: '1a558037b48d7288c7561572ea5dd0b1',
        },
        {
          url: '/_next/static/chunks/854-22a301120d23686d.js',
          revision: '22a301120d23686d',
        },
        {
          url: '/_next/static/chunks/854-22a301120d23686d.js.map',
          revision: '7b3ac1284c642b1af12298195891f13e',
        },
        {
          url: '/_next/static/chunks/8615-0f80e17179f0d7e8.js',
          revision: '0f80e17179f0d7e8',
        },
        {
          url: '/_next/static/chunks/8615-0f80e17179f0d7e8.js.map',
          revision: '8afc4013acf6187a4c1ef360e924e32d',
        },
        {
          url: '/_next/static/chunks/8633.bfa2b80517853510.js',
          revision: 'bfa2b80517853510',
        },
        {
          url: '/_next/static/chunks/8633.bfa2b80517853510.js.map',
          revision: '5a73b45f1f82f42ca59d07311a9055e1',
        },
        {
          url: '/_next/static/chunks/8699-975a169620f8d683.js',
          revision: '975a169620f8d683',
        },
        {
          url: '/_next/static/chunks/8699-975a169620f8d683.js.map',
          revision: '24a0ab17c5158cba31d8584c5748be70',
        },
        {
          url: '/_next/static/chunks/8711-a8c67d9da55f7dbe.js',
          revision: 'a8c67d9da55f7dbe',
        },
        {
          url: '/_next/static/chunks/8711-a8c67d9da55f7dbe.js.map',
          revision: '212be70ffcd450f199bb727546ac583c',
        },
        {
          url: '/_next/static/chunks/8720-b2b5a1451c4a69d0.js',
          revision: 'b2b5a1451c4a69d0',
        },
        {
          url: '/_next/static/chunks/8720-b2b5a1451c4a69d0.js.map',
          revision: 'd48d3f7cff22d0c46fd08235a3de5a54',
        },
        {
          url: '/_next/static/chunks/8771-29c0265450337af4.js',
          revision: '29c0265450337af4',
        },
        {
          url: '/_next/static/chunks/8771-29c0265450337af4.js.map',
          revision: 'bade278c9ec6f8458adb7a01f171cc3c',
        },
        {
          url: '/_next/static/chunks/8778-e85c2897048a79fa.js',
          revision: 'e85c2897048a79fa',
        },
        {
          url: '/_next/static/chunks/8778-e85c2897048a79fa.js.map',
          revision: 'a6c12062733f3a6f81b8788de1298c96',
        },
        {
          url: '/_next/static/chunks/8845-6cdb9797d7d8712e.js',
          revision: '6cdb9797d7d8712e',
        },
        {
          url: '/_next/static/chunks/8845-6cdb9797d7d8712e.js.map',
          revision: '6f2aa33edb3af3239d33820d35687735',
        },
        {
          url: '/_next/static/chunks/9154-fc7bc5a35eb2641f.js',
          revision: 'fc7bc5a35eb2641f',
        },
        {
          url: '/_next/static/chunks/9154-fc7bc5a35eb2641f.js.map',
          revision: 'a82e6bec98902907da753fb5faee7fa7',
        },
        {
          url: '/_next/static/chunks/9257.df23e3104c012ae1.js',
          revision: 'df23e3104c012ae1',
        },
        {
          url: '/_next/static/chunks/9257.df23e3104c012ae1.js.map',
          revision: 'ccc6c43559323ca27a35934072fdb605',
        },
        {
          url: '/_next/static/chunks/9264-2cec1d2867c94439.js',
          revision: '2cec1d2867c94439',
        },
        {
          url: '/_next/static/chunks/9264-2cec1d2867c94439.js.map',
          revision: 'db3a55a9a2f6492ee8aecc47b19e1c04',
        },
        {
          url: '/_next/static/chunks/9355-f1ffd211ab87be71.js',
          revision: 'f1ffd211ab87be71',
        },
        {
          url: '/_next/static/chunks/9355-f1ffd211ab87be71.js.map',
          revision: '0779a4fffa7db1728a1c48e5652951da',
        },
        {
          url: '/_next/static/chunks/9457-109f048b0e0c8d2e.js',
          revision: '109f048b0e0c8d2e',
        },
        {
          url: '/_next/static/chunks/9457-109f048b0e0c8d2e.js.map',
          revision: '598178b57b36f5a6094741fc2056933e',
        },
        {
          url: '/_next/static/chunks/9689-721eba033803d312.js',
          revision: '721eba033803d312',
        },
        {
          url: '/_next/static/chunks/9689-721eba033803d312.js.map',
          revision: 'bc3a85d4eee1b77b8d29b0a47a91d2ec',
        },
        {
          url: '/_next/static/chunks/9870-41cb99ee7aacb6e0.js',
          revision: '41cb99ee7aacb6e0',
        },
        {
          url: '/_next/static/chunks/9870-41cb99ee7aacb6e0.js.map',
          revision: 'bc57a24411c7240387ad857fa896dd9d',
        },
        {
          url: '/_next/static/chunks/9874.8b6de394dc68687e.js',
          revision: '8b6de394dc68687e',
        },
        {
          url: '/_next/static/chunks/9874.8b6de394dc68687e.js.map',
          revision: '367a12b5bf8ae20c8b2beeb726ea6fd3',
        },
        {
          url: '/_next/static/chunks/9955-4b60255ae2d9755a.js',
          revision: '4b60255ae2d9755a',
        },
        {
          url: '/_next/static/chunks/9955-4b60255ae2d9755a.js.map',
          revision: '2afdaa07bd08fb7cb93de85a6e2dbfdd',
        },
        {
          url: '/_next/static/chunks/9e784b99-352252d4a1536060.js',
          revision: '352252d4a1536060',
        },
        {
          url: '/_next/static/chunks/9e784b99-352252d4a1536060.js.map',
          revision: 'e4a79e9f7207e98d0c425b5889e5323b',
        },
        {
          url: '/_next/static/chunks/app/_global-error/page-bec9f450f0c5aeea.js',
          revision: 'bec9f450f0c5aeea',
        },
        {
          url: '/_next/static/chunks/app/_not-found/page-448c317b6541d878.js',
          revision: '448c317b6541d878',
        },
        {
          url: '/_next/static/chunks/app/api/auth/%5B...nextauth%5D/route-18aecca9fbc6fce8.js',
          revision: '18aecca9fbc6fce8',
        },
        {
          url: '/_next/static/chunks/app/api/health/route-cdca17715a80be29.js',
          revision: 'cdca17715a80be29',
        },
        {
          url: '/_next/static/chunks/app/api/revalidate/route-5c69110e36f686b9.js',
          revision: '5c69110e36f686b9',
        },
        {
          url: '/_next/static/chunks/app/api/sitemap/route-bc721a77bfb762a6.js',
          revision: 'bc721a77bfb762a6',
        },
        {
          url: '/_next/static/chunks/app/auth/forgot/page-a7b90fe28cf50db3.js',
          revision: 'a7b90fe28cf50db3',
        },
        {
          url: '/_next/static/chunks/app/auth/forgot/page-a7b90fe28cf50db3.js.map',
          revision: 'f95978735182fa8af5ab534e171f0cc4',
        },
        {
          url: '/_next/static/chunks/app/auth/layout-ee28b4cf931855bd.js',
          revision: 'ee28b4cf931855bd',
        },
        {
          url: '/_next/static/chunks/app/auth/layout-ee28b4cf931855bd.js.map',
          revision: 'b5ff9cb0415c442328a0df2957c7d8f5',
        },
        {
          url: '/_next/static/chunks/app/auth/login/page-83e41a237dfb5e94.js',
          revision: '83e41a237dfb5e94',
        },
        {
          url: '/_next/static/chunks/app/auth/login/page-83e41a237dfb5e94.js.map',
          revision: '3c6c2941edd81fefc7a72aff93f9f360',
        },
        {
          url: '/_next/static/chunks/app/auth/reset/page-b9180ff0759dcd5a.js',
          revision: 'b9180ff0759dcd5a',
        },
        {
          url: '/_next/static/chunks/app/auth/reset/page-b9180ff0759dcd5a.js.map',
          revision: 'bd0ae5aea22610320fd1e0fdf21db890',
        },
        {
          url: '/_next/static/chunks/app/auth/signup/page-f6c1bf0453149972.js',
          revision: 'f6c1bf0453149972',
        },
        {
          url: '/_next/static/chunks/app/auth/signup/page-f6c1bf0453149972.js.map',
          revision: '39407a45b33b15507bf128b257ed7101',
        },
        {
          url: '/_next/static/chunks/app/auth/waitlist/countdown/page-048db3f9670890a7.js',
          revision: '048db3f9670890a7',
        },
        {
          url: '/_next/static/chunks/app/auth/waitlist/countdown/page-048db3f9670890a7.js.map',
          revision: '92e0020aa2a4f0166529fa3bda22dcc2',
        },
        {
          url: '/_next/static/chunks/app/auth/waitlist/join/page-dda976c0b2927559.js',
          revision: 'dda976c0b2927559',
        },
        {
          url: '/_next/static/chunks/app/auth/waitlist/join/page-dda976c0b2927559.js.map',
          revision: '0ca8109d6ea5cec1bf106ceef4da669e',
        },
        {
          url: '/_next/static/chunks/app/editor/course/%5Bcourseid%5D/activity/%5Bactivityuuid%5D/edit/loading-c5fe923d9c622d8d.js',
          revision: 'c5fe923d9c622d8d',
        },
        {
          url: '/_next/static/chunks/app/editor/course/%5Bcourseid%5D/activity/%5Bactivityuuid%5D/edit/loading-c5fe923d9c622d8d.js.map',
          revision: 'de214b9c50395577f401edbe1fb2c2ae',
        },
        {
          url: '/_next/static/chunks/app/editor/course/%5Bcourseid%5D/activity/%5Bactivityuuid%5D/edit/page-e24ba5e3a8beba87.js',
          revision: 'e24ba5e3a8beba87',
        },
        {
          url: '/_next/static/chunks/app/editor/course/%5Bcourseid%5D/activity/%5Bactivityuuid%5D/edit/page-e24ba5e3a8beba87.js.map',
          revision: 'c90eca0c69940c2a13190df82fb1fad8',
        },
        {
          url: '/_next/static/chunks/app/global-error-6f77b9b969903f69.js',
          revision: '6f77b9b969903f69',
        },
        {
          url: '/_next/static/chunks/app/global-error-6f77b9b969903f69.js.map',
          revision: '86398ea40031766bf2fe43c0635437d8',
        },
        {
          url: '/_next/static/chunks/app/home/page-78e2b94229d6396c.js',
          revision: '78e2b94229d6396c',
        },
        {
          url: '/_next/static/chunks/app/home/page-78e2b94229d6396c.js.map',
          revision: '1c94d41e8393ecc60cb132ef20a24e9e',
        },
        {
          url: '/_next/static/chunks/app/join/%5Bsessionuuid%5D/page-75af624bb3bc609f.js',
          revision: '75af624bb3bc609f',
        },
        {
          url: '/_next/static/chunks/app/join/%5Bsessionuuid%5D/page-75af624bb3bc609f.js.map',
          revision: '86589979a2f6450ed6db8fb3b9789d06',
        },
        {
          url: '/_next/static/chunks/app/layout-1ded1c27e4674ca3.js',
          revision: '1ded1c27e4674ca3',
        },
        {
          url: '/_next/static/chunks/app/layout-1ded1c27e4674ca3.js.map',
          revision: '9799a4ac87b0fe3e392a36af03920b29',
        },
        {
          url: '/_next/static/chunks/app/not-found-4507c8d43858dce8.js',
          revision: '4507c8d43858dce8',
        },
        {
          url: '/_next/static/chunks/app/not-found-4507c8d43858dce8.js.map',
          revision: '8ca904f5a156e8027e5a69ff9a25b7ba',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/aan-open/page-2dcaf3862f6c1aa0.js',
          revision: '2dcaf3862f6c1aa0',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/aan-open/page-2dcaf3862f6c1aa0.js.map',
          revision: 'a2baeeeae9173560dcd9908212e51ca8',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/about/page-d356ec6bc14194b9.js',
          revision: 'd356ec6bc14194b9',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/about/page-d356ec6bc14194b9.js.map',
          revision: 'c8c1e5dd925dbd8ba76543ab183217d5',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/ai-automation/page-23127afb81e84256.js',
          revision: '23127afb81e84256',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/ai-automation/page-23127afb81e84256.js.map',
          revision: '7b2fd5defb6c92c82871fd52ad9a234b',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/ai-fundamentals/page-d78b87949fcfaed9.js',
          revision: 'd78b87949fcfaed9',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/ai-fundamentals/page-d78b87949fcfaed9.js.map',
          revision: '942b3ed60f80573b73c92c2da88e2041',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/calendar/page-53ab58c48f45d9ad.js',
          revision: '53ab58c48f45d9ad',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/calendar/page-53ab58c48f45d9ad.js.map',
          revision: 'e733d0dc269d03b4fd475d3147817d08',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/certificates/%5Buuid%5D/verify/page-c580552177f12f0f.js',
          revision: 'c580552177f12f0f',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/certificates/%5Buuid%5D/verify/page-c580552177f12f0f.js.map',
          revision: '15ba8a68605b0eb18815925e59aba452',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/chat/%5BconversationId%5D/page-1d195d219703fd23.js',
          revision: '1d195d219703fd23',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/chat/page-3755a8e7a5cf8383.js',
          revision: '3755a8e7a5cf8383',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collection/%5Bcollectionid%5D/error-acb5457fea2c6e6a.js',
          revision: 'acb5457fea2c6e6a',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collection/%5Bcollectionid%5D/error-acb5457fea2c6e6a.js.map',
          revision: '07eeda842fee2edcb01406b7dc40b35c',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collection/%5Bcollectionid%5D/loading-17bfd2a993dec239.js',
          revision: '17bfd2a993dec239',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collection/%5Bcollectionid%5D/loading-17bfd2a993dec239.js.map',
          revision: 'd9329068c42dbca099aaefe5bf6e3bef',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collection/%5Bcollectionid%5D/page-a646dec9417009c9.js',
          revision: 'a646dec9417009c9',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collection/%5Bcollectionid%5D/page-a646dec9417009c9.js.map',
          revision: '2e2a7a70d9b997b62dbf674549ec1664',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collections/loading-01b8a0a762795659.js',
          revision: '01b8a0a762795659',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collections/loading-01b8a0a762795659.js.map',
          revision: '58a68dd0756f3810f108c3af8a980793',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collections/new/page-6beafb6c0e21f259.js',
          revision: '6beafb6c0e21f259',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collections/new/page-6beafb6c0e21f259.js.map',
          revision: '1563e1a6ab5c1e2c6f55a986913ba01c',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collections/page-e2e5c2fe2c23e1c0.js',
          revision: 'e2e5c2fe2c23e1c0',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collections/page-e2e5c2fe2c23e1c0.js.map',
          revision: 'c61876946346ae2c50937b4b84353353',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/contact/page-814107a6feb0770d.js',
          revision: '814107a6feb0770d',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/contact/page-814107a6feb0770d.js.map',
          revision: '283afbdc50a359882109c98249dc1703',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/activity/%5Bactivityid%5D/error-eb7bd6cbf2ae18f6.js',
          revision: 'eb7bd6cbf2ae18f6',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/activity/%5Bactivityid%5D/error-eb7bd6cbf2ae18f6.js.map',
          revision: 'a51a6f123d1f15e1cddad9fc0c2e2d70',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/activity/%5Bactivityid%5D/loading-5f38b06975bea6d3.js',
          revision: '5f38b06975bea6d3',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/activity/%5Bactivityid%5D/loading-5f38b06975bea6d3.js.map',
          revision: '99921490e725ee02431fcc0ae986d1e3',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/activity/%5Bactivityid%5D/page-ed540da0997809ae.js',
          revision: 'ed540da0997809ae',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/activity/%5Bactivityid%5D/page-ed540da0997809ae.js.map',
          revision: '77b8ec18d3c74570a8fc6b6aaf6a74aa',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/error-a8923875e2f079c7.js',
          revision: 'a8923875e2f079c7',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/error-a8923875e2f079c7.js.map',
          revision: 'ae5833ca3189bab4d50a02ab19c1f460',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/page-02a03c4b2c2001c9.js',
          revision: '02a03c4b2c2001c9',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/page-02a03c4b2c2001c9.js.map',
          revision: '52ac5ff7308cf0cf105511f35a844859',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/courses/error-95ad79c99ccd4c42.js',
          revision: '95ad79c99ccd4c42',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/courses/error-95ad79c99ccd4c42.js.map',
          revision: '614ba5848e659444eca87e20ac9d4e7d',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/courses/loading-d4e48840735c4519.js',
          revision: 'd4e48840735c4519',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/courses/loading-d4e48840735c4519.js.map',
          revision: '61a57ecdf14df064f79e60ee80871959',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/courses/page-a4cc909c34252936.js',
          revision: 'a4cc909c34252936',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/courses/page-a4cc909c34252936.js.map',
          revision: '66eb359a2d1b7ef39333e59dfd15a468',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/error-74016da207e87354.js',
          revision: '74016da207e87354',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/error-74016da207e87354.js.map',
          revision: '7dd9a12afa3bc47c435230965dca7299',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/layout-c3b7e5c3ff5e7c3c.js',
          revision: 'c3b7e5c3ff5e7c3c',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/layout-c3b7e5c3ff5e7c3c.js.map',
          revision: '4f4f15276bf470a59403b067aa6aeb77',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/loading-f0382ca40adb7bcb.js',
          revision: 'f0382ca40adb7bcb',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/loading-f0382ca40adb7bcb.js.map',
          revision: '5f73c66fc928b185e3fbaabe88f4bf54',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/page-9442bdd9c2b2dc79.js',
          revision: '9442bdd9c2b2dc79',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/page-9442bdd9c2b2dc79.js.map',
          revision: '2e506b9e38648a31ad0daedfc8db09dc',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/pricing/page-cf8b719d68003dca.js',
          revision: 'cf8b719d68003dca',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/pricing/page-cf8b719d68003dca.js.map',
          revision: '117d524a8b24bf7307d76745f28a3971',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/search/page-2780efadd0a8061b.js',
          revision: '2780efadd0a8061b',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/search/page-2780efadd0a8061b.js.map',
          revision: 'b1118874f0316a57a3cc2c523918c1ad',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/trail/page-1682929099fd04dc.js',
          revision: '1682929099fd04dc',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/trail/page-1682929099fd04dc.js.map',
          revision: 'c4b57b1cf305ea3f7e7573e4d4165fe0',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/user/%5Busername%5D/error-09daa7f746ac1f6f.js',
          revision: '09daa7f746ac1f6f',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/user/%5Busername%5D/error-09daa7f746ac1f6f.js.map',
          revision: 'f2f180242dcc744b5015cca92daa3696',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/user/%5Busername%5D/page-d0edcf9b554933d8.js',
          revision: 'd0edcf9b554933d8',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/user/%5Busername%5D/page-d0edcf9b554933d8.js.map',
          revision: '852570d9e53bda5af34a74b9997faa92',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/affiliation/signup/page-1cbc3e1a34bd1920.js',
          revision: '1cbc3e1a34bd1920',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/affiliation/signup/page-1cbc3e1a34bd1920.js.map',
          revision: '3a3f1e8703fdaf43e3f133bfb3edc1ad',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/affiliation/page-f801667872def579.js',
          revision: 'f801667872def579',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/affiliation/page-f801667872def579.js.map',
          revision: '62bf6d79974a6d3b6b201f16af02d601',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/announcements/page-934346648e8a8992.js',
          revision: '934346648e8a8992',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/announcements/page-934346648e8a8992.js.map',
          revision: 'f6aa8aa76e1020630e09d91ff69b2d00',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/assignments/%5Bassignmentuuid%5D/page-c9de7d5701403dc8.js',
          revision: 'c9de7d5701403dc8',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/assignments/%5Bassignmentuuid%5D/page-c9de7d5701403dc8.js.map',
          revision: '0a590ecf76b1ac1c958475d4c6550872',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/assignments/page-85e8f0c8549a6c4a.js',
          revision: '85e8f0c8549a6c4a',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/assignments/page-85e8f0c8549a6c4a.js.map',
          revision: '058f52698390b8438f9470a468df6368',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/communications/page-db04c8f5d85cabdc.js',
          revision: 'db04c8f5d85cabdc',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/communications/page-db04c8f5d85cabdc.js.map',
          revision: '043a3430ec3ba1b96dd11d07303703af',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/communications/participants/%5Bactivityid%5D/page-4fff2750d088e3c6.js',
          revision: '4fff2750d088e3c6',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/communications/participants/%5Bactivityid%5D/page-4fff2750d088e3c6.js.map',
          revision: '9b85ce9730d56c59297479828724a001',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/courses/course/%5Bcourseuuid%5D/%5Bsubpage%5D/page-84916285b40aaf8e.js',
          revision: '84916285b40aaf8e',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/courses/course/%5Bcourseuuid%5D/%5Bsubpage%5D/page-84916285b40aaf8e.js.map',
          revision: '28c9b35959d705fe835a76d5585ba999',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/courses/page-9e4a3a4d2be48715.js',
          revision: '9e4a3a4d2be48715',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/courses/page-9e4a3a4d2be48715.js.map',
          revision: '776b6c371c02f48af3bff173f7d012c2',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/documentation/layout-7626925cd449cc1f.js',
          revision: '7626925cd449cc1f',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/documentation/rights/page-4172804623de28fc.js',
          revision: '4172804623de28fc',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/documentation/rights/page-4172804623de28fc.js.map',
          revision: '9295cfd601e1c2585c6c97031da904b4',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/handbook/page-6e0dd4c23f4c9083.js',
          revision: '6e0dd4c23f4c9083',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/handbook/page-6e0dd4c23f4c9083.js.map',
          revision: '076e834f40000017cb785be19648d012',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/layout-8dc35542b8524cec.js',
          revision: '8dc35542b8524cec',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/layout-8dc35542b8524cec.js.map',
          revision: 'b9df56f6aabd4de9ec39ed5978af0ed6',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/org/settings/%5Bsubpage%5D/page-e0383dce45676670.js',
          revision: 'e0383dce45676670',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/org/settings/%5Bsubpage%5D/page-e0383dce45676670.js.map',
          revision: 'e1b86d18ad59f1591068b789ca4f9dba',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/page-9fb7a709dfe68112.js',
          revision: '9fb7a709dfe68112',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/page-9fb7a709dfe68112.js.map',
          revision: '580a12b9fff8abfe3a72e4f2db06abea',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/payments/%5Bsubpage%5D/page-4cc5d711f1bc4f9c.js',
          revision: '4cc5d711f1bc4f9c',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/payments/%5Bsubpage%5D/page-4cc5d711f1bc4f9c.js.map',
          revision: '71194140ea1ea7a0bc6ebb0c1bcce2b6',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/referrals/page-120dde27414b7fa8.js',
          revision: '120dde27414b7fa8',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/referrals/page-120dde27414b7fa8.js.map',
          revision: 'c7954fb1fa3730664c99b147383fb45e',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/user-account/owned/page-c04d7c7a38a895e4.js',
          revision: 'c04d7c7a38a895e4',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/user-account/owned/page-c04d7c7a38a895e4.js.map',
          revision: 'cdc7de6f54fd8a52cb37e521512c4ef1',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/user-account/settings/%5Bsubpage%5D/page-e3b41f0a3c460a3d.js',
          revision: 'e3b41f0a3c460a3d',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/user-account/settings/%5Bsubpage%5D/page-e3b41f0a3c460a3d.js.map',
          revision: 'fd3530a4eb68cbfb367ed25b5bfd2324',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/users/settings/%5Bsubpage%5D/page-8b8141cdab65db6e.js',
          revision: '8b8141cdab65db6e',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/users/settings/%5Bsubpage%5D/page-8b8141cdab65db6e.js.map',
          revision: '325408d83553298617d4c98ab696df48',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/layout-bc59fe3fd5268793.js',
          revision: 'bc59fe3fd5268793',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/layout-bc59fe3fd5268793.js.map',
          revision: '646124dfd2a0255ededc16604a8c3e29',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/policy/page-7e9c4f0b5dc0e9ba.js',
          revision: '7e9c4f0b5dc0e9ba',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/policy/page-7e9c4f0b5dc0e9ba.js.map',
          revision: 'ccd8674b61f480eff3b929f658f95b57',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/privacy/page-fa1e31272996fec0.js',
          revision: 'fa1e31272996fec0',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/privacy/page-fa1e31272996fec0.js.map',
          revision: 'fe95dc8783cf52ab08689347db859ad9',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/verify-email/page-5447bada3449d0f1.js',
          revision: '5447bada3449d0f1',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/verify-email/page-5447bada3449d0f1.js.map',
          revision: 'd5346722b3cb275bb76f4b49c4c32e14',
        },
        {
          url: '/_next/static/chunks/app/payments/stripe/connect/oauth/page-a8b723a0f2b9d172.js',
          revision: 'a8b723a0f2b9d172',
        },
        {
          url: '/_next/static/chunks/app/payments/stripe/connect/oauth/page-a8b723a0f2b9d172.js.map',
          revision: '5087588f42ce67d9cbd1f2b2149b6969',
        },
        {
          url: '/_next/static/chunks/app/ref/%5Bcode%5D/page-47cbf1c0b441335f.js',
          revision: '47cbf1c0b441335f',
        },
        {
          url: '/_next/static/chunks/app/ref/%5Bcode%5D/page-47cbf1c0b441335f.js.map',
          revision: '0163a29b244358edff5cd18618d02adb',
        },
        {
          url: '/_next/static/chunks/b2d08614.84f1b84c9bbcdc5d.js',
          revision: '84f1b84c9bbcdc5d',
        },
        {
          url: '/_next/static/chunks/b2d08614.84f1b84c9bbcdc5d.js.map',
          revision: '4af95af62b5affa4bb3124573d520f3b',
        },
        {
          url: '/_next/static/chunks/badf541d.aa62aa74363e3b4f.js',
          revision: 'aa62aa74363e3b4f',
        },
        {
          url: '/_next/static/chunks/badf541d.aa62aa74363e3b4f.js.map',
          revision: '411aee20c3ab6cf68a20b4446ee20981',
        },
        {
          url: '/_next/static/chunks/bda40ab4-2c0552c08edf2d4a.js',
          revision: '2c0552c08edf2d4a',
        },
        {
          url: '/_next/static/chunks/c132bf7d-9aa0e53be5bf4e90.js',
          revision: '9aa0e53be5bf4e90',
        },
        {
          url: '/_next/static/chunks/c132bf7d-9aa0e53be5bf4e90.js.map',
          revision: '3351c0dc78f5032b42a4ffbf5c1675a3',
        },
        {
          url: '/_next/static/chunks/dc596880-75560de3e10bd8df.js',
          revision: '75560de3e10bd8df',
        },
        {
          url: '/_next/static/chunks/dc596880-75560de3e10bd8df.js.map',
          revision: '6a9363844b1e5c6291393f0547e0dd01',
        },
        {
          url: '/_next/static/chunks/de82efc7-85098dca6ec76a87.js',
          revision: '85098dca6ec76a87',
        },
        {
          url: '/_next/static/chunks/de82efc7-85098dca6ec76a87.js.map',
          revision: '67737ad627da57ded781b52cb35112bd',
        },
        {
          url: '/_next/static/chunks/fc43f782-96783066e7af7cb0.js',
          revision: '96783066e7af7cb0',
        },
        {
          url: '/_next/static/chunks/fc43f782-96783066e7af7cb0.js.map',
          revision: 'e175541b1d30fa0c9b76a20fbff3be1b',
        },
        {
          url: '/_next/static/chunks/framework-88ad8222dd6268ca.js',
          revision: '88ad8222dd6268ca',
        },
        {
          url: '/_next/static/chunks/framework-88ad8222dd6268ca.js.map',
          revision: '9f53bd3ffbf9b25b35a609167797dc09',
        },
        {
          url: '/_next/static/chunks/main-app-f883a8e461195697.js',
          revision: 'f883a8e461195697',
        },
        {
          url: '/_next/static/chunks/main-app-f883a8e461195697.js.map',
          revision: '1e89a8993c6027cf89bff7e2864d64b7',
        },
        {
          url: '/_next/static/chunks/main-ec3ee74c977378a3.js',
          revision: 'ec3ee74c977378a3',
        },
        {
          url: '/_next/static/chunks/main-ec3ee74c977378a3.js.map',
          revision: 'eefe0a7279652cce3f78ac081aca4881',
        },
        {
          url: '/_next/static/chunks/next/dist/client/components/builtin/app-error-bf2d3014e400e440.js',
          revision: 'bf2d3014e400e440',
        },
        {
          url: '/_next/static/chunks/next/dist/client/components/builtin/forbidden-16096a80260979cb.js',
          revision: '16096a80260979cb',
        },
        {
          url: '/_next/static/chunks/next/dist/client/components/builtin/unauthorized-41c691846aebc801.js',
          revision: '41c691846aebc801',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        {
          url: '/_next/static/chunks/webpack-f049964e7900fb9c.js',
          revision: 'f049964e7900fb9c',
        },
        {
          url: '/_next/static/chunks/webpack-f049964e7900fb9c.js.map',
          revision: '5c96e0273984c50e86fb01ebc78e77c6',
        },
        {
          url: '/_next/static/css/08850d20f66a437f.css',
          revision: '08850d20f66a437f',
        },
        {
          url: '/_next/static/css/08850d20f66a437f.css.map',
          revision: 'baca7f4ff496aa41c03bb5a65f076afd',
        },
        {
          url: '/_next/static/css/1dfb5e71b60cea90.css',
          revision: '1dfb5e71b60cea90',
        },
        {
          url: '/_next/static/css/1dfb5e71b60cea90.css.map',
          revision: '8afbbaec1c85377a496f5ec39c873941',
        },
        {
          url: '/_next/static/css/e39972efaf8c924d.css',
          revision: 'e39972efaf8c924d',
        },
        {
          url: '/_next/static/css/e39972efaf8c924d.css.map',
          revision: 'a4d8eb2604842f04a79e184121d29f3a',
        },
        {
          url: '/_next/static/css/fdac6bbf6bfe4fdb.css',
          revision: 'fdac6bbf6bfe4fdb',
        },
        {
          url: '/_next/static/css/fdac6bbf6bfe4fdb.css.map',
          revision: '2c33109c6da91e03b0e41bb233142c2d',
        },
        {
          url: '/_next/static/learnhouse-production/_buildManifest.js',
          revision: '928cc68456f00e8cc4147ec0956d024c',
        },
        {
          url: '/_next/static/learnhouse-production/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
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
          url: '/_next/static/media/african_ai_horizontal.a458ed88.png',
          revision: '0b1fd6b53772f706f90ab0a3d7b39aee',
        },
        {
          url: '/_next/static/media/african_ai_square.5df7c7b5.png',
          revision: '5923580248dc1999c8369ca9c55ce413',
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
          revision: '0b1fd6b53772f706f90ab0a3d7b39aee',
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
          url: '/landing/contact_bg.png',
          revision: '9cf6875f2d9d6c5653ed0bbdcc10a413',
        },
        {
          url: '/landing/hero_bg.png',
          revision: '20cc59a4a20aa8d5e8edf020444d3ba7',
        },
        {
          url: '/landing/hero_person.png',
          revision: 'cfa52b2bd78026135ac4f2927b047fd2',
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
          url: '/landing/program_genai.png',
          revision: 'd04c032de13b1716fe2d39cd596bfad6',
        },
        {
          url: '/landing/program_genai_v2.png',
          revision: 'a2d82f0d0cbecba48f359dfd91af0d4a',
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
        { url: '/manifest.json', revision: '10fa00d6b494a5f643e8f4ecbbdc9f73' },
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
      { ignoreURLParametersMatching: [] }
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      '/',
      new e.NetworkFirst({
        cacheName: 'start-url',
        plugins: [
          {
            cacheWillUpdate: async ({
              request: e,
              response: a,
              event: c,
              state: s,
            }) =>
              a && 'opaqueredirect' === a.type
                ? new Response(a.body, {
                    status: 200,
                    statusText: 'OK',
                    headers: a.headers,
                  })
                : a,
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
      /\.(?:mp4)$/i,
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
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
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
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1
        const a = e.pathname
        return !a.startsWith('/api/auth/') && !!a.startsWith('/api/')
      },
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
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1
        return !e.pathname.startsWith('/api/')
      },
      new e.NetworkFirst({
        cacheName: 'others',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ url: e }) => !(self.origin === e.origin),
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
