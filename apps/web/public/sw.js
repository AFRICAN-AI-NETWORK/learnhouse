if (!self.define) {
  let e,
    a = {}
  const s = (s, i) => (
    (s = new URL(s + '.js', i).href),
    a[s] ||
      new Promise((a) => {
        if ('document' in self) {
          const e = document.createElement('script')
          ;(e.src = s), (e.onload = a), document.head.appendChild(e)
        } else (e = s), importScripts(s), a()
      }).then(() => {
        let e = a[s]
        if (!e) throw new Error(`Module ${s} didn’t register its module`)
        return e
      })
  )
  self.define = (i, c) => {
    const n =
      e ||
      ('document' in self ? document.currentScript.src : '') ||
      location.href
    if (a[n]) return
    let t = {}
    const r = (e) => s(e, n),
      d = { module: { uri: n }, exports: t, require: r }
    a[n] = Promise.all(i.map((e) => d[e] || r(e))).then((e) => (c(...e), t))
  }
}
define(['./workbox-d0ed9bb0'], function (e) {
  'use strict'
  importScripts('/fallback-ce627215c0e4a9af.js', '/worker-1be416d8dafefdc0.js'),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: '/_next/static/chunks/0af3c2ec-e4da71e6f93660d4.js',
          revision: 'e4da71e6f93660d4',
        },
        {
          url: '/_next/static/chunks/1180.7a5d15d8d6398770.js',
          revision: '7a5d15d8d6398770',
        },
        {
          url: '/_next/static/chunks/1192-63fd85a8618ec07b.js',
          revision: '63fd85a8618ec07b',
        },
        {
          url: '/_next/static/chunks/1202-81134d70d59501c0.js',
          revision: '81134d70d59501c0',
        },
        {
          url: '/_next/static/chunks/1594-f28c9da82266fcdb.js',
          revision: 'f28c9da82266fcdb',
        },
        {
          url: '/_next/static/chunks/1680.0373f91fef40d659.js',
          revision: '0373f91fef40d659',
        },
        {
          url: '/_next/static/chunks/1704-34431cb8813d7fa8.js',
          revision: '34431cb8813d7fa8',
        },
        {
          url: '/_next/static/chunks/171-193fb68964385989.js',
          revision: '193fb68964385989',
        },
        {
          url: '/_next/static/chunks/1799-81f055cff626ce99.js',
          revision: '81f055cff626ce99',
        },
        {
          url: '/_next/static/chunks/209-f8d8c6d6017f3e59.js',
          revision: 'f8d8c6d6017f3e59',
        },
        {
          url: '/_next/static/chunks/2143-70672e16a54cb900.js',
          revision: '70672e16a54cb900',
        },
        {
          url: '/_next/static/chunks/2157.cf5df1ab6cd7017b.js',
          revision: 'cf5df1ab6cd7017b',
        },
        {
          url: '/_next/static/chunks/2527-7537c5be58b7d949.js',
          revision: '7537c5be58b7d949',
        },
        {
          url: '/_next/static/chunks/2562-572e8435ca83a66d.js',
          revision: '572e8435ca83a66d',
        },
        {
          url: '/_next/static/chunks/2595.0c7a4d7e388180a4.js',
          revision: '0c7a4d7e388180a4',
        },
        {
          url: '/_next/static/chunks/2646-fa9adf6bb8cc7035.js',
          revision: 'fa9adf6bb8cc7035',
        },
        {
          url: '/_next/static/chunks/2658-1be70acc3acb9412.js',
          revision: '1be70acc3acb9412',
        },
        {
          url: '/_next/static/chunks/2735-cf73a581d26bfa3c.js',
          revision: 'cf73a581d26bfa3c',
        },
        {
          url: '/_next/static/chunks/273acdc0-37045cef2c1aa7ee.js',
          revision: '37045cef2c1aa7ee',
        },
        {
          url: '/_next/static/chunks/2776-b8d4f3770df3b64b.js',
          revision: 'b8d4f3770df3b64b',
        },
        {
          url: '/_next/static/chunks/2786-aae6eff199a9825d.js',
          revision: 'aae6eff199a9825d',
        },
        {
          url: '/_next/static/chunks/2868-308f1c73b0d08f7f.js',
          revision: '308f1c73b0d08f7f',
        },
        {
          url: '/_next/static/chunks/2b1d48d8-a4ddede375e3b71e.js',
          revision: 'a4ddede375e3b71e',
        },
        {
          url: '/_next/static/chunks/3023.4e03cb95c051dec5.js',
          revision: '4e03cb95c051dec5',
        },
        {
          url: '/_next/static/chunks/3029-015f1d3ebfb87b5e.js',
          revision: '015f1d3ebfb87b5e',
        },
        {
          url: '/_next/static/chunks/3123-31dea565e5434952.js',
          revision: '31dea565e5434952',
        },
        {
          url: '/_next/static/chunks/3173-8bd84e239c9a03b8.js',
          revision: '8bd84e239c9a03b8',
        },
        {
          url: '/_next/static/chunks/3277-251c8af6ef4d8baa.js',
          revision: '251c8af6ef4d8baa',
        },
        {
          url: '/_next/static/chunks/3450-919d0b9cbe6bf5bc.js',
          revision: '919d0b9cbe6bf5bc',
        },
        {
          url: '/_next/static/chunks/3481.25fa08b507fe55b2.js',
          revision: '25fa08b507fe55b2',
        },
        {
          url: '/_next/static/chunks/3512-c5b5fe032410c3b7.js',
          revision: 'c5b5fe032410c3b7',
        },
        {
          url: '/_next/static/chunks/3665.8ab48a0c8a1b65b6.js',
          revision: '8ab48a0c8a1b65b6',
        },
        {
          url: '/_next/static/chunks/3747.d0a9dd7508ce5dcc.js',
          revision: 'd0a9dd7508ce5dcc',
        },
        {
          url: '/_next/static/chunks/3827-0cbedb0d946d8b21.js',
          revision: '0cbedb0d946d8b21',
        },
        {
          url: '/_next/static/chunks/3856-241aaf6b7ab002da.js',
          revision: '241aaf6b7ab002da',
        },
        {
          url: '/_next/static/chunks/3b42e7c7-fe8369ef716f003d.js',
          revision: 'fe8369ef716f003d',
        },
        {
          url: '/_next/static/chunks/4072-212827bd519d6f4c.js',
          revision: '212827bd519d6f4c',
        },
        {
          url: '/_next/static/chunks/4080-9e3e95c62e1bd370.js',
          revision: '9e3e95c62e1bd370',
        },
        {
          url: '/_next/static/chunks/4159-3616d9c311181d1d.js',
          revision: '3616d9c311181d1d',
        },
        {
          url: '/_next/static/chunks/4210-65f36ce033d5df24.js',
          revision: '65f36ce033d5df24',
        },
        {
          url: '/_next/static/chunks/4241-7be0a3fa227dde89.js',
          revision: '7be0a3fa227dde89',
        },
        {
          url: '/_next/static/chunks/4387-250be5b8bb3f2c9d.js',
          revision: '250be5b8bb3f2c9d',
        },
        {
          url: '/_next/static/chunks/4449-e7cdcfcdc77343d1.js',
          revision: 'e7cdcfcdc77343d1',
        },
        {
          url: '/_next/static/chunks/4452-91bc0b75c34dd01d.js',
          revision: '91bc0b75c34dd01d',
        },
        {
          url: '/_next/static/chunks/4480-39be8c2ee3f625c0.js',
          revision: '39be8c2ee3f625c0',
        },
        {
          url: '/_next/static/chunks/4567-dbe56f0eccc752c1.js',
          revision: 'dbe56f0eccc752c1',
        },
        {
          url: '/_next/static/chunks/4636-30a2535370313b3e.js',
          revision: '30a2535370313b3e',
        },
        {
          url: '/_next/static/chunks/4696-4db67a0d33a7b8ea.js',
          revision: '4db67a0d33a7b8ea',
        },
        {
          url: '/_next/static/chunks/4723.218360d0523534d5.js',
          revision: '218360d0523534d5',
        },
        {
          url: '/_next/static/chunks/4744.fb0b20c8522040dc.js',
          revision: 'fb0b20c8522040dc',
        },
        {
          url: '/_next/static/chunks/4784-28dbe0832ac87d99.js',
          revision: '28dbe0832ac87d99',
        },
        {
          url: '/_next/static/chunks/4828.d2c05b0d4e7d73bb.js',
          revision: 'd2c05b0d4e7d73bb',
        },
        {
          url: '/_next/static/chunks/4841-056f260f5c818a65.js',
          revision: '056f260f5c818a65',
        },
        {
          url: '/_next/static/chunks/5057-7411eb95701feb1e.js',
          revision: '7411eb95701feb1e',
        },
        {
          url: '/_next/static/chunks/5746.98e74e386c7e0db3.js',
          revision: '98e74e386c7e0db3',
        },
        {
          url: '/_next/static/chunks/5787-8569c37b1d4521cf.js',
          revision: '8569c37b1d4521cf',
        },
        {
          url: '/_next/static/chunks/5974-fc145fb0fbf74aa3.js',
          revision: 'fc145fb0fbf74aa3',
        },
        {
          url: '/_next/static/chunks/6037-4ab58827a3e6b38c.js',
          revision: '4ab58827a3e6b38c',
        },
        {
          url: '/_next/static/chunks/6049.305b0e334be22f8f.js',
          revision: '305b0e334be22f8f',
        },
        {
          url: '/_next/static/chunks/6216.0972bc1d770dcd00.js',
          revision: '0972bc1d770dcd00',
        },
        {
          url: '/_next/static/chunks/6243b3d4-4364e9a8dbe8f2e8.js',
          revision: '4364e9a8dbe8f2e8',
        },
        {
          url: '/_next/static/chunks/6252-8043d146dd6ffbe0.js',
          revision: '8043d146dd6ffbe0',
        },
        {
          url: '/_next/static/chunks/6350-7b82444b31ef3fa3.js',
          revision: '7b82444b31ef3fa3',
        },
        {
          url: '/_next/static/chunks/6359-3c8aaee34b9051b9.js',
          revision: '3c8aaee34b9051b9',
        },
        {
          url: '/_next/static/chunks/6391-f4859629d34e8b09.js',
          revision: 'f4859629d34e8b09',
        },
        {
          url: '/_next/static/chunks/640-ce2a38417bff7547.js',
          revision: 'ce2a38417bff7547',
        },
        {
          url: '/_next/static/chunks/6498-e284e70b9c8649d0.js',
          revision: 'e284e70b9c8649d0',
        },
        {
          url: '/_next/static/chunks/6527-fc32549377f1b374.js',
          revision: 'fc32549377f1b374',
        },
        {
          url: '/_next/static/chunks/670.46fd0807526e297e.js',
          revision: '46fd0807526e297e',
        },
        {
          url: '/_next/static/chunks/6842-41806f230a6be18a.js',
          revision: '41806f230a6be18a',
        },
        {
          url: '/_next/static/chunks/6909-37aca8e934ef7709.js',
          revision: '37aca8e934ef7709',
        },
        {
          url: '/_next/static/chunks/6939.8db2866ec5c6d7fa.js',
          revision: '8db2866ec5c6d7fa',
        },
        {
          url: '/_next/static/chunks/6991-ec92bf10b1c36955.js',
          revision: 'ec92bf10b1c36955',
        },
        {
          url: '/_next/static/chunks/6997-0b46fcda8134f31a.js',
          revision: '0b46fcda8134f31a',
        },
        {
          url: '/_next/static/chunks/7106-73ea7f26b87ea4cf.js',
          revision: '73ea7f26b87ea4cf',
        },
        {
          url: '/_next/static/chunks/7137-862d7dbeae92a360.js',
          revision: '862d7dbeae92a360',
        },
        {
          url: '/_next/static/chunks/72-1cd41740878f0118.js',
          revision: '1cd41740878f0118',
        },
        {
          url: '/_next/static/chunks/7335.7ed45f0815ed27d7.js',
          revision: '7ed45f0815ed27d7',
        },
        {
          url: '/_next/static/chunks/7349-c4a14a1f43ffc9eb.js',
          revision: 'c4a14a1f43ffc9eb',
        },
        {
          url: '/_next/static/chunks/7459-2dbd60cb928d96a5.js',
          revision: '2dbd60cb928d96a5',
        },
        {
          url: '/_next/static/chunks/7478-6a5ffe05ed09614f.js',
          revision: '6a5ffe05ed09614f',
        },
        {
          url: '/_next/static/chunks/7511-bce89cab0bda5bc5.js',
          revision: 'bce89cab0bda5bc5',
        },
        {
          url: '/_next/static/chunks/7578-2cc96a0c502778c1.js',
          revision: '2cc96a0c502778c1',
        },
        {
          url: '/_next/static/chunks/7645-0ef1857e584e7af5.js',
          revision: '0ef1857e584e7af5',
        },
        {
          url: '/_next/static/chunks/78-cc1cc1c13253e0e4.js',
          revision: 'cc1cc1c13253e0e4',
        },
        {
          url: '/_next/static/chunks/7938.81f5b16d20460471.js',
          revision: '81f5b16d20460471',
        },
        {
          url: '/_next/static/chunks/7b3dac53-f567e3eb640d6148.js',
          revision: 'f567e3eb640d6148',
        },
        {
          url: '/_next/static/chunks/8147-e816d51f3f6b1795.js',
          revision: 'e816d51f3f6b1795',
        },
        {
          url: '/_next/static/chunks/8229-88a1aa6fe2495dc1.js',
          revision: '88a1aa6fe2495dc1',
        },
        {
          url: '/_next/static/chunks/8238-afd449c6c6de8261.js',
          revision: 'afd449c6c6de8261',
        },
        {
          url: '/_next/static/chunks/831.45443508cae57e55.js',
          revision: '45443508cae57e55',
        },
        {
          url: '/_next/static/chunks/8383-515cbbc3a18ae9e7.js',
          revision: '515cbbc3a18ae9e7',
        },
        {
          url: '/_next/static/chunks/8436-6cbcca40ba876c84.js',
          revision: '6cbcca40ba876c84',
        },
        {
          url: '/_next/static/chunks/8447-5aae50bf3243c6b0.js',
          revision: '5aae50bf3243c6b0',
        },
        {
          url: '/_next/static/chunks/852-44f9538fe6be7d25.js',
          revision: '44f9538fe6be7d25',
        },
        {
          url: '/_next/static/chunks/8721-7c38f0eb81513155.js',
          revision: '7c38f0eb81513155',
        },
        {
          url: '/_next/static/chunks/8745-d04e50739e54adb5.js',
          revision: 'd04e50739e54adb5',
        },
        {
          url: '/_next/static/chunks/8825.e61a6c4431c647b5.js',
          revision: 'e61a6c4431c647b5',
        },
        {
          url: '/_next/static/chunks/890-c7e1d0d687603ae2.js',
          revision: 'c7e1d0d687603ae2',
        },
        {
          url: '/_next/static/chunks/8918-fec222f23bd65d49.js',
          revision: 'fec222f23bd65d49',
        },
        {
          url: '/_next/static/chunks/9087-e421bae57d4fa28a.js',
          revision: 'e421bae57d4fa28a',
        },
        {
          url: '/_next/static/chunks/9097-7cb447aa3c445cb2.js',
          revision: '7cb447aa3c445cb2',
        },
        {
          url: '/_next/static/chunks/9409-f98ac732db6d7864.js',
          revision: 'f98ac732db6d7864',
        },
        {
          url: '/_next/static/chunks/9419-4232ed7e7f4bc7af.js',
          revision: '4232ed7e7f4bc7af',
        },
        {
          url: '/_next/static/chunks/9423-09dc81c32cf50ca5.js',
          revision: '09dc81c32cf50ca5',
        },
        {
          url: '/_next/static/chunks/9445-be97b85c23fa304f.js',
          revision: 'be97b85c23fa304f',
        },
        {
          url: '/_next/static/chunks/9447.01fc22b1b89f71cc.js',
          revision: '01fc22b1b89f71cc',
        },
        {
          url: '/_next/static/chunks/9485-e0af90ec226914e4.js',
          revision: 'e0af90ec226914e4',
        },
        {
          url: '/_next/static/chunks/9705-9e7bb5379fc60944.js',
          revision: '9e7bb5379fc60944',
        },
        {
          url: '/_next/static/chunks/9760-31a46ef2260b5b35.js',
          revision: '31a46ef2260b5b35',
        },
        {
          url: '/_next/static/chunks/9761.67781473bee38600.js',
          revision: '67781473bee38600',
        },
        {
          url: '/_next/static/chunks/9781-f132d810e2fbd8a1.js',
          revision: 'f132d810e2fbd8a1',
        },
        {
          url: '/_next/static/chunks/98-e88a6d38c92ead0d.js',
          revision: 'e88a6d38c92ead0d',
        },
        {
          url: '/_next/static/chunks/9927-1186d0a8072fdb75.js',
          revision: '1186d0a8072fdb75',
        },
        {
          url: '/_next/static/chunks/9938.64bfed3cde161d32.js',
          revision: '64bfed3cde161d32',
        },
        {
          url: '/_next/static/chunks/996-30a4af788f388a21.js',
          revision: '30a4af788f388a21',
        },
        {
          url: '/_next/static/chunks/9e784b99-cd417425fa57ed46.js',
          revision: 'cd417425fa57ed46',
        },
        {
          url: '/_next/static/chunks/app/_global-error/page-baf6f7baddec3ed2.js',
          revision: 'baf6f7baddec3ed2',
        },
        {
          url: '/_next/static/chunks/app/_not-found/page-86d034f2783f22b8.js',
          revision: '86d034f2783f22b8',
        },
        {
          url: '/_next/static/chunks/app/api/auth/%5B...nextauth%5D/route-6d4b44b7a2d780d2.js',
          revision: '6d4b44b7a2d780d2',
        },
        {
          url: '/_next/static/chunks/app/api/health/route-7f7d984e0db96505.js',
          revision: '7f7d984e0db96505',
        },
        {
          url: '/_next/static/chunks/app/api/revalidate/route-ee15198f53ceb648.js',
          revision: 'ee15198f53ceb648',
        },
        {
          url: '/_next/static/chunks/app/api/sitemap/route-b86bbfe9459963a7.js',
          revision: 'b86bbfe9459963a7',
        },
        {
          url: '/_next/static/chunks/app/auth/forgot/page-d836dcbf12fd356a.js',
          revision: 'd836dcbf12fd356a',
        },
        {
          url: '/_next/static/chunks/app/auth/layout-1381b7416af40dde.js',
          revision: '1381b7416af40dde',
        },
        {
          url: '/_next/static/chunks/app/auth/login/page-c1c82bea7c5c469f.js',
          revision: 'c1c82bea7c5c469f',
        },
        {
          url: '/_next/static/chunks/app/auth/reset/page-0a1ea3b99cfc7ac5.js',
          revision: '0a1ea3b99cfc7ac5',
        },
        {
          url: '/_next/static/chunks/app/auth/signup/page-ab7c2a246a56cd7c.js',
          revision: 'ab7c2a246a56cd7c',
        },
        {
          url: '/_next/static/chunks/app/auth/waitlist/countdown/page-7160fb6401c8d737.js',
          revision: '7160fb6401c8d737',
        },
        {
          url: '/_next/static/chunks/app/auth/waitlist/join/page-1744d1a4a0af6308.js',
          revision: '1744d1a4a0af6308',
        },
        {
          url: '/_next/static/chunks/app/editor/course/%5Bcourseid%5D/activity/%5Bactivityuuid%5D/edit/loading-ad35ce290d3cd0cd.js',
          revision: 'ad35ce290d3cd0cd',
        },
        {
          url: '/_next/static/chunks/app/editor/course/%5Bcourseid%5D/activity/%5Bactivityuuid%5D/edit/page-847962b3645af4cd.js',
          revision: '847962b3645af4cd',
        },
        {
          url: '/_next/static/chunks/app/global-error-e4e63164e8a1ddcb.js',
          revision: 'e4e63164e8a1ddcb',
        },
        {
          url: '/_next/static/chunks/app/home/page-b6f1d171a41490e8.js',
          revision: 'b6f1d171a41490e8',
        },
        {
          url: '/_next/static/chunks/app/join/%5Bsessionuuid%5D/page-bea65a2403f0cc13.js',
          revision: 'bea65a2403f0cc13',
        },
        {
          url: '/_next/static/chunks/app/layout-feea9514fff0bbd1.js',
          revision: 'feea9514fff0bbd1',
        },
        {
          url: '/_next/static/chunks/app/not-found-17dc79d68d8d459f.js',
          revision: '17dc79d68d8d459f',
        },
        {
          url: '/_next/static/chunks/app/offline/page-bd3db63d6d55a56b.js',
          revision: 'bd3db63d6d55a56b',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/aan-open/page-b9f465156272e6e4.js',
          revision: 'b9f465156272e6e4',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/about/page-d9c18a71c73b0854.js',
          revision: 'd9c18a71c73b0854',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/ai-automation-content-creators/page-e1fcc9c821dc6754.js',
          revision: 'e1fcc9c821dc6754',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/ai-automation/page-2812afe904813896.js',
          revision: '2812afe904813896',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/ai-fundamentals/page-06f48fab58c2a5bf.js',
          revision: '06f48fab58c2a5bf',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/calendar/page-0411cb657a973e1a.js',
          revision: '0411cb657a973e1a',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/certificates/%5Buuid%5D/verify/page-0784d82f9ecbb5d7.js',
          revision: '0784d82f9ecbb5d7',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/chat/%5BconversationId%5D/page-d12c22fb37bd238a.js',
          revision: 'd12c22fb37bd238a',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/chat/page-9fb07eb4d7ea45fd.js',
          revision: '9fb07eb4d7ea45fd',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collection/%5Bcollectionid%5D/error-ae90d9360f94bcc1.js',
          revision: 'ae90d9360f94bcc1',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collection/%5Bcollectionid%5D/loading-6f57fddb46b8a250.js',
          revision: '6f57fddb46b8a250',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collection/%5Bcollectionid%5D/page-2a5e72d8f273fc16.js',
          revision: '2a5e72d8f273fc16',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collections/loading-ad1e2309009c2a28.js',
          revision: 'ad1e2309009c2a28',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collections/new/page-f7a2d4aaa904462e.js',
          revision: 'f7a2d4aaa904462e',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collections/page-c0a0af0be63efa80.js',
          revision: 'c0a0af0be63efa80',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/contact/page-5e13977376d7ad4e.js',
          revision: '5e13977376d7ad4e',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/activity/%5Bactivityid%5D/error-8d4009cd43a5ecc1.js',
          revision: '8d4009cd43a5ecc1',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/activity/%5Bactivityid%5D/loading-cb42115b095f3e0c.js',
          revision: 'cb42115b095f3e0c',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/activity/%5Bactivityid%5D/page-0edfe81dbf2225f9.js',
          revision: '0edfe81dbf2225f9',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/error-9f55a5a48a479814.js',
          revision: '9f55a5a48a479814',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/page-cad98a34d9a55a3e.js',
          revision: 'cad98a34d9a55a3e',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/courses/error-0420967f766e1140.js',
          revision: '0420967f766e1140',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/courses/loading-2caa219dd0da018d.js',
          revision: '2caa219dd0da018d',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/courses/page-7d3d70b89cdb13e6.js',
          revision: '7d3d70b89cdb13e6',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/error-fde81fe1106af853.js',
          revision: 'fde81fe1106af853',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/layout-ab7060890ba78a62.js',
          revision: 'ab7060890ba78a62',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/loading-bf2f473e0a344935.js',
          revision: 'bf2f473e0a344935',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/page-ca3b7e75b4c7a5f4.js',
          revision: 'ca3b7e75b4c7a5f4',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/pricing/page-5fd714a8e5f4ad6b.js',
          revision: '5fd714a8e5f4ad6b',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/search/page-14514cc6044844c4.js',
          revision: '14514cc6044844c4',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/trail/page-6885a96cfc94c7b6.js',
          revision: '6885a96cfc94c7b6',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/user/%5Busername%5D/error-f5a534bf516933da.js',
          revision: 'f5a534bf516933da',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/user/%5Busername%5D/page-ce9f968eabf3c547.js',
          revision: 'ce9f968eabf3c547',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/affiliation/signup/page-01601bfe2668ccfb.js',
          revision: '01601bfe2668ccfb',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/affiliation/page-d19e68e170020704.js',
          revision: 'd19e68e170020704',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/announcements/page-e77badc9894e0d81.js',
          revision: 'e77badc9894e0d81',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/assignments/%5Bassignmentuuid%5D/page-a070dc2efee280e0.js',
          revision: 'a070dc2efee280e0',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/assignments/page-a1d7689bbda0b68b.js',
          revision: 'a1d7689bbda0b68b',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/communications/page-efe8941ab3746e5a.js',
          revision: 'efe8941ab3746e5a',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/communications/participants/%5Bactivityid%5D/page-8a624e005190e19c.js',
          revision: '8a624e005190e19c',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/courses/course/%5Bcourseuuid%5D/%5Bsubpage%5D/page-3ad8f71e1b723509.js',
          revision: '3ad8f71e1b723509',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/courses/page-0eba851421367b67.js',
          revision: '0eba851421367b67',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/documentation/layout-33dac3cf6d16232b.js',
          revision: '33dac3cf6d16232b',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/documentation/rights/page-3ca8c5aba9d4beca.js',
          revision: '3ca8c5aba9d4beca',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/handbook/page-8c8940fb81254a97.js',
          revision: '8c8940fb81254a97',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/layout-c41ed55cd3811d4a.js',
          revision: 'c41ed55cd3811d4a',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/org/settings/%5Bsubpage%5D/page-0c836a715891d4aa.js',
          revision: '0c836a715891d4aa',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/page-f9f434b8d8b9f36a.js',
          revision: 'f9f434b8d8b9f36a',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/payments/%5Bsubpage%5D/page-90aae5dd0fb01157.js',
          revision: '90aae5dd0fb01157',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/referrals/page-9b3de9a2241d5746.js',
          revision: '9b3de9a2241d5746',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/students/%5Buserid%5D/page-89a3a22be59bed07.js',
          revision: '89a3a22be59bed07',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/students/page-24fcad6581edc5ed.js',
          revision: '24fcad6581edc5ed',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/user-account/owned/page-8e0d1b548dd0b6cb.js',
          revision: '8e0d1b548dd0b6cb',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/user-account/settings/%5Bsubpage%5D/page-1cf4156c6ddde68c.js',
          revision: '1cf4156c6ddde68c',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/users/settings/%5Bsubpage%5D/page-0193c74370a7d777.js',
          revision: '0193c74370a7d777',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/layout-dc6193adafbe2bc2.js',
          revision: 'dc6193adafbe2bc2',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/marketer/page-bd3edf44d2badd30.js',
          revision: 'bd3edf44d2badd30',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/marketer/payouts/page-06ffd4b2c7d17041.js',
          revision: '06ffd4b2c7d17041',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/marketer/register/page-dce5a22fac76645b.js',
          revision: 'dce5a22fac76645b',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/marketer/revenue/page-40dfeb4694963669.js',
          revision: '40dfeb4694963669',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/marketer/students/page-5ac7ddc518830176.js',
          revision: '5ac7ddc518830176',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/policy/page-2cd56fc52142acb2.js',
          revision: '2cd56fc52142acb2',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/privacy/page-a8299ee4b3e92692.js',
          revision: 'a8299ee4b3e92692',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/verify-email/page-dc80e586f75ebc10.js',
          revision: 'dc80e586f75ebc10',
        },
        {
          url: '/_next/static/chunks/app/payments/stripe/connect/oauth/page-13d24295bdaf1310.js',
          revision: '13d24295bdaf1310',
        },
        {
          url: '/_next/static/chunks/app/ref/%5Bcode%5D/page-2302474892cff14e.js',
          revision: '2302474892cff14e',
        },
        {
          url: '/_next/static/chunks/b2d08614.ffa15873cc53acd7.js',
          revision: 'ffa15873cc53acd7',
        },
        {
          url: '/_next/static/chunks/badf541d.53c8157a18d10832.js',
          revision: '53c8157a18d10832',
        },
        {
          url: '/_next/static/chunks/bda40ab4-2c0552c08edf2d4a.js',
          revision: '2c0552c08edf2d4a',
        },
        {
          url: '/_next/static/chunks/c132bf7d.fe139c1f05924b2c.js',
          revision: 'fe139c1f05924b2c',
        },
        {
          url: '/_next/static/chunks/dc596880-f13ffe70ed2254cd.js',
          revision: 'f13ffe70ed2254cd',
        },
        {
          url: '/_next/static/chunks/ef288fc7-70dd221944df3743.js',
          revision: '70dd221944df3743',
        },
        {
          url: '/_next/static/chunks/fc43f782-a9fb865094b4f5b9.js',
          revision: 'a9fb865094b4f5b9',
        },
        {
          url: '/_next/static/chunks/framework-c931236c7a82fe24.js',
          revision: 'c931236c7a82fe24',
        },
        {
          url: '/_next/static/chunks/main-app-d9298405494535ed.js',
          revision: 'd9298405494535ed',
        },
        {
          url: '/_next/static/chunks/main-c91cfcd2afdd0c04.js',
          revision: 'c91cfcd2afdd0c04',
        },
        {
          url: '/_next/static/chunks/next/dist/client/components/builtin/app-error-dba9f809e5aa6d67.js',
          revision: 'dba9f809e5aa6d67',
        },
        {
          url: '/_next/static/chunks/next/dist/client/components/builtin/forbidden-605720bf5882de52.js',
          revision: '605720bf5882de52',
        },
        {
          url: '/_next/static/chunks/next/dist/client/components/builtin/unauthorized-d60ec54d4d692277.js',
          revision: 'd60ec54d4d692277',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        {
          url: '/_next/static/chunks/webpack-774ad220c0d0d046.js',
          revision: '774ad220c0d0d046',
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
          url: '/_next/static/css/5a88d731322f60e6.css',
          revision: '5a88d731322f60e6',
        },
        {
          url: '/_next/static/css/fdac6bbf6bfe4fdb.css',
          revision: 'fdac6bbf6bfe4fdb',
        },
        {
          url: '/_next/static/learnhouse-production/_buildManifest.js',
          revision: '61bd736ccc923b93780f84af6f97563c',
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
        {
          url: '/fallback-ce627215c0e4a9af.js',
          revision: '491ad88c9915c9c00cfd65626a11693e',
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
          url: '/landing/aina_mobile_mockup.png',
          revision: 'c316bbb4bebc0b4af0cd7d9074deace2',
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
          url: '/landing/program_content_creators.png',
          revision: '2cfd36b0ab9508d2ed50e20f493b07a2',
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
        { url: '/manifest.json', revision: '5bc01d74676b52b50cdc9cd615790684' },
        {
          url: '/marketer-bg.png',
          revision: '4807f313d34ce14ae02f7b81005c1ffc',
        },
        {
          url: '/offline-placeholder.svg',
          revision: 'c44d07f12bdf7c157b15c5eb0514a9da',
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
        {
          url: '/svg/collections.svg',
          revision: 'f4a0219ca10d0f4b8136410ed991d09f',
        },
        {
          url: '/svg/courses.svg',
          revision: 'f4e1807b7edc9ee39b89c8b30d387292',
        },
        { url: '/svg/trail.svg', revision: '1e647fc65528aee2a326ae963a0108c7' },
        {
          url: '/worker-1be416d8dafefdc0.js',
          revision: '1f20e8f5bf6e6aa50d00ee4538397971',
        },
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
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /(?:\/api\/v1\/(?:payments(?:\/|\?|$)|referrals(?:\/|\?|$)|marketers(?:\/|\?|$)|ee(?:\/|\?|$)|admin(?:\/|\?|$)|dashboard(?:\/|\?|$)|auth(?:\/|\?|$)|code(?:\/|\?|$)|webhooks(?:\/|\?|$)|dev(?:\/|\?|$)|ai(?:\/|\?|$)|live_sessions(?:\/|\?|$)|waitlist(?:\/|\?|$)|contact(?:\/|\?|$)|health(?:\/|\?|$)|users\/session|users\/profile|users\/reset_password|users\/change_password|chat\/ws))|(?:\/api\/v1\/.*\/(?:admin(?:\/|\?|$)))/,
      new e.NetworkOnly(),
      'GET'
    ),
    e.registerRoute(/\/umami\//, new e.NetworkOnly(), 'GET'),
    e.registerRoute(
      /\/api\/v1\/(orgs|courses|chapters|activities|blocks|collections|certifications|assignments|trail|users|roles|usergroups|announcements|notifications|communications|search|cohorts|prerequisites)(\/|\?|$)/,
      new e.NetworkFirst({
        cacheName: 'lh-api-data-v1',
        networkTimeoutSeconds: 4,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 86400 }),
          new e.CacheableResponsePlugin({ statuses: [200] }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/content\/.*\.(?:png|jpg|jpeg|gif|webp|svg|pdf)$/i,
      new e.CacheFirst({
        cacheName: 'lh-media-v1',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 604800 }),
          new e.CacheableResponsePlugin({ statuses: [200] }),
          new e.RangeRequestsPlugin(),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/image\?/,
      new e.CacheFirst({
        cacheName: 'lh-images-v1',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 259200 }),
          new e.CacheableResponsePlugin({ statuses: [200] }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:woff2?|eot|ttf|otf)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'lh-fonts-v1',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 2592e3 }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
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
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ request: e, url: { pathname: a }, sameOrigin: s }) =>
        '1' === e.headers.get('RSC') &&
        '1' === e.headers.get('Next-Router-Prefetch') &&
        s &&
        !a.startsWith('/api/'),
      new e.NetworkFirst({
        cacheName: 'pages-rsc-prefetch',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ request: e, url: { pathname: a }, sameOrigin: s }) =>
        '1' === e.headers.get('RSC') && s && !a.startsWith('/api/'),
      new e.NetworkFirst({
        cacheName: 'pages-rsc',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    )
})
//# sourceMappingURL=sw.js.map
