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
          url: '/_next/static/chunks/1704-f77624b7dfe26121.js',
          revision: 'f77624b7dfe26121',
        },
        {
          url: '/_next/static/chunks/209-f8d8c6d6017f3e59.js',
          revision: 'f8d8c6d6017f3e59',
        },
        {
          url: '/_next/static/chunks/2092-a7b1e02606f336ce.js',
          revision: 'a7b1e02606f336ce',
        },
        {
          url: '/_next/static/chunks/2143-70672e16a54cb900.js',
          revision: '70672e16a54cb900',
        },
        {
          url: '/_next/static/chunks/2157.300d7b1f221dd2cc.js',
          revision: '300d7b1f221dd2cc',
        },
        {
          url: '/_next/static/chunks/2527-0551e9f71636a9ed.js',
          revision: '0551e9f71636a9ed',
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
          url: '/_next/static/chunks/2735-1043f588038d88d2.js',
          revision: '1043f588038d88d2',
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
          url: '/_next/static/chunks/2868-ed0dab4dd1f633c9.js',
          revision: 'ed0dab4dd1f633c9',
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
          url: '/_next/static/chunks/3029-3624b4c9579c08bd.js',
          revision: '3624b4c9579c08bd',
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
          url: '/_next/static/chunks/3472-dde2221e54a8e81a.js',
          revision: 'dde2221e54a8e81a',
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
          url: '/_next/static/chunks/3665.c5b2ae573cb082d4.js',
          revision: 'c5b2ae573cb082d4',
        },
        {
          url: '/_next/static/chunks/3747.b59a7978897e08e2.js',
          revision: 'b59a7978897e08e2',
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
          url: '/_next/static/chunks/3875-2886aa1cc46f2dbd.js',
          revision: '2886aa1cc46f2dbd',
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
          url: '/_next/static/chunks/4480-c1f76ebb50c13486.js',
          revision: 'c1f76ebb50c13486',
        },
        {
          url: '/_next/static/chunks/4567-00b6ea2ebeacf8ae.js',
          revision: '00b6ea2ebeacf8ae',
        },
        {
          url: '/_next/static/chunks/4636-30a2535370313b3e.js',
          revision: '30a2535370313b3e',
        },
        {
          url: '/_next/static/chunks/4691-284cf270b8c0369c.js',
          revision: '284cf270b8c0369c',
        },
        {
          url: '/_next/static/chunks/4696-1130d9282895884e.js',
          revision: '1130d9282895884e',
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
          url: '/_next/static/chunks/4841-7c9832279efd37cb.js',
          revision: '7c9832279efd37cb',
        },
        {
          url: '/_next/static/chunks/492-b9850fb45f98c003.js',
          revision: 'b9850fb45f98c003',
        },
        {
          url: '/_next/static/chunks/5008-43b16fda22f0ae57.js',
          revision: '43b16fda22f0ae57',
        },
        {
          url: '/_next/static/chunks/5057-b811dd66096551f6.js',
          revision: 'b811dd66096551f6',
        },
        {
          url: '/_next/static/chunks/5359-9fae2f491fffe243.js',
          revision: '9fae2f491fffe243',
        },
        {
          url: '/_next/static/chunks/5704-baaee34d61e6a10f.js',
          revision: 'baaee34d61e6a10f',
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
          url: '/_next/static/chunks/5899-8742cf841db37576.js',
          revision: '8742cf841db37576',
        },
        {
          url: '/_next/static/chunks/6049.e69db93ff66ca642.js',
          revision: 'e69db93ff66ca642',
        },
        {
          url: '/_next/static/chunks/6216.5ec9fcd517578eb4.js',
          revision: '5ec9fcd517578eb4',
        },
        {
          url: '/_next/static/chunks/6221-2afd41465aea1df3.js',
          revision: '2afd41465aea1df3',
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
          url: '/_next/static/chunks/6527-199d4b35d17ca495.js',
          revision: '199d4b35d17ca495',
        },
        {
          url: '/_next/static/chunks/670.cdd76188f2d34980.js',
          revision: 'cdd76188f2d34980',
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
          url: '/_next/static/chunks/6997-fa8fb2925215e9be.js',
          revision: 'fa8fb2925215e9be',
        },
        {
          url: '/_next/static/chunks/7106-543bdce021d264b5.js',
          revision: '543bdce021d264b5',
        },
        {
          url: '/_next/static/chunks/7137-862d7dbeae92a360.js',
          revision: '862d7dbeae92a360',
        },
        {
          url: '/_next/static/chunks/7174-4d0d64611dfd91ad.js',
          revision: '4d0d64611dfd91ad',
        },
        {
          url: '/_next/static/chunks/72-1cd41740878f0118.js',
          revision: '1cd41740878f0118',
        },
        {
          url: '/_next/static/chunks/7335.76e634c5b7f0a5d7.js',
          revision: '76e634c5b7f0a5d7',
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
          url: '/_next/static/chunks/7578-8703679c8a9c5f7f.js',
          revision: '8703679c8a9c5f7f',
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
          url: '/_next/static/chunks/7974-54f7258d0b4768c1.js',
          revision: '54f7258d0b4768c1',
        },
        {
          url: '/_next/static/chunks/7b3dac53-f567e3eb640d6148.js',
          revision: 'f567e3eb640d6148',
        },
        {
          url: '/_next/static/chunks/8147-4b4f6b59788d0f17.js',
          revision: '4b4f6b59788d0f17',
        },
        {
          url: '/_next/static/chunks/8229-3d1115c57dfa8565.js',
          revision: '3d1115c57dfa8565',
        },
        {
          url: '/_next/static/chunks/8238-afd449c6c6de8261.js',
          revision: 'afd449c6c6de8261',
        },
        {
          url: '/_next/static/chunks/831.a11bda3f76debfa7.js',
          revision: 'a11bda3f76debfa7',
        },
        {
          url: '/_next/static/chunks/8383-515cbbc3a18ae9e7.js',
          revision: '515cbbc3a18ae9e7',
        },
        {
          url: '/_next/static/chunks/8447-86cad9dca2ed12de.js',
          revision: '86cad9dca2ed12de',
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
          url: '/_next/static/chunks/9447.04d7517be1e07d0e.js',
          revision: '04d7517be1e07d0e',
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
          url: '/_next/static/chunks/9938.bb76eae7c228dae1.js',
          revision: 'bb76eae7c228dae1',
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
          url: '/_next/static/chunks/app/auth/forgot/page-df92803fb7ac27fa.js',
          revision: 'df92803fb7ac27fa',
        },
        {
          url: '/_next/static/chunks/app/auth/layout-f74e53cd2baca178.js',
          revision: 'f74e53cd2baca178',
        },
        {
          url: '/_next/static/chunks/app/auth/login/page-2d5a26b1794a9cc0.js',
          revision: '2d5a26b1794a9cc0',
        },
        {
          url: '/_next/static/chunks/app/auth/reset/page-82295893cf6a3f95.js',
          revision: '82295893cf6a3f95',
        },
        {
          url: '/_next/static/chunks/app/auth/signup/page-3d01c02ba033e79f.js',
          revision: '3d01c02ba033e79f',
        },
        {
          url: '/_next/static/chunks/app/auth/waitlist/countdown/page-0e497e56f54bdab0.js',
          revision: '0e497e56f54bdab0',
        },
        {
          url: '/_next/static/chunks/app/auth/waitlist/join/page-34d860e19482bac5.js',
          revision: '34d860e19482bac5',
        },
        {
          url: '/_next/static/chunks/app/editor/course/%5Bcourseid%5D/activity/%5Bactivityuuid%5D/edit/loading-0500b446bf7f7bc8.js',
          revision: '0500b446bf7f7bc8',
        },
        {
          url: '/_next/static/chunks/app/editor/course/%5Bcourseid%5D/activity/%5Bactivityuuid%5D/edit/page-efa4dd324fbaaa04.js',
          revision: 'efa4dd324fbaaa04',
        },
        {
          url: '/_next/static/chunks/app/global-error-6f6a509b3d1e4bfb.js',
          revision: '6f6a509b3d1e4bfb',
        },
        {
          url: '/_next/static/chunks/app/home/page-041fd96e8e181b48.js',
          revision: '041fd96e8e181b48',
        },
        {
          url: '/_next/static/chunks/app/join/%5Bsessionuuid%5D/page-d5aafec4ce165583.js',
          revision: 'd5aafec4ce165583',
        },
        {
          url: '/_next/static/chunks/app/layout-2f671d911f5009e7.js',
          revision: '2f671d911f5009e7',
        },
        {
          url: '/_next/static/chunks/app/not-found-6c5b539ed9ffaa47.js',
          revision: '6c5b539ed9ffaa47',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/aan-open/page-7e52d84ba2f384bb.js',
          revision: '7e52d84ba2f384bb',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/about/page-dba260c2d0e1cebb.js',
          revision: 'dba260c2d0e1cebb',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/ai-automation-content-creators/page-b41e39fc1c76abeb.js',
          revision: 'b41e39fc1c76abeb',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/ai-automation/page-594cab73c64b3348.js',
          revision: '594cab73c64b3348',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/ai-fundamentals/page-5ea5a67a5b03d221.js',
          revision: '5ea5a67a5b03d221',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/calendar/page-916c78ecb3f7bafd.js',
          revision: '916c78ecb3f7bafd',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/certificates/%5Buuid%5D/verify/page-d74b756c2e169a15.js',
          revision: 'd74b756c2e169a15',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/chat/%5BconversationId%5D/page-0b56b43bcbbd284e.js',
          revision: '0b56b43bcbbd284e',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/chat/page-53cc6df6613d2fef.js',
          revision: '53cc6df6613d2fef',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collection/%5Bcollectionid%5D/error-7a6a9ffb31289b21.js',
          revision: '7a6a9ffb31289b21',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collection/%5Bcollectionid%5D/loading-692fcb58c0097150.js',
          revision: '692fcb58c0097150',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collection/%5Bcollectionid%5D/page-0ca0b0bcbf51af1b.js',
          revision: '0ca0b0bcbf51af1b',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collections/loading-41b6c60c44b85cfa.js',
          revision: '41b6c60c44b85cfa',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collections/new/page-828ba91d08717e58.js',
          revision: '828ba91d08717e58',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/collections/page-0266648c89c004d6.js',
          revision: '0266648c89c004d6',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/contact/page-112eff00bff2555b.js',
          revision: '112eff00bff2555b',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/activity/%5Bactivityid%5D/error-af8e8a35261775ba.js',
          revision: 'af8e8a35261775ba',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/activity/%5Bactivityid%5D/loading-fca1108b33e9c59d.js',
          revision: 'fca1108b33e9c59d',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/activity/%5Bactivityid%5D/page-97b560d93cda6d97.js',
          revision: '97b560d93cda6d97',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/error-4eeb4342df071b5a.js',
          revision: '4eeb4342df071b5a',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/course/%5Bcourseuuid%5D/page-ce0f6c0d98029f63.js',
          revision: 'ce0f6c0d98029f63',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/courses/error-55e570be20452745.js',
          revision: '55e570be20452745',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/courses/loading-80a8a06afa713435.js',
          revision: '80a8a06afa713435',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/courses/page-cf947aaec4e2a711.js',
          revision: 'cf947aaec4e2a711',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/error-38b5149daf872f18.js',
          revision: '38b5149daf872f18',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/layout-fb8c951fe6010ffd.js',
          revision: 'fb8c951fe6010ffd',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/loading-5a064c2528705db9.js',
          revision: '5a064c2528705db9',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/page-9c850db54ae5b90b.js',
          revision: '9c850db54ae5b90b',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/pricing/page-915ff5503c2e476c.js',
          revision: '915ff5503c2e476c',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/search/page-144daa19da7a234e.js',
          revision: '144daa19da7a234e',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/trail/page-74895d3d9a44ed05.js',
          revision: '74895d3d9a44ed05',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/user/%5Busername%5D/error-3f5300b0a0f34852.js',
          revision: '3f5300b0a0f34852',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/(withmenu)/user/%5Busername%5D/page-ce0e7be23e11d3ea.js',
          revision: 'ce0e7be23e11d3ea',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/affiliation/signup/page-60f5287ce01743c3.js',
          revision: '60f5287ce01743c3',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/affiliation/page-b71104d0a6758a7b.js',
          revision: 'b71104d0a6758a7b',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/announcements/page-b1b0342431e21359.js',
          revision: 'b1b0342431e21359',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/assignments/%5Bassignmentuuid%5D/page-2d6aeeadfa66dba2.js',
          revision: '2d6aeeadfa66dba2',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/assignments/page-56e2b4c33dc39189.js',
          revision: '56e2b4c33dc39189',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/communications/page-5c147be35c4b31e4.js',
          revision: '5c147be35c4b31e4',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/communications/participants/%5Bactivityid%5D/page-3fed1ff86aaab853.js',
          revision: '3fed1ff86aaab853',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/courses/course/%5Bcourseuuid%5D/%5Bsubpage%5D/page-d9397bad0826e11f.js',
          revision: 'd9397bad0826e11f',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/courses/page-905f7bd17200f543.js',
          revision: '905f7bd17200f543',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/documentation/layout-33dac3cf6d16232b.js',
          revision: '33dac3cf6d16232b',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/documentation/rights/page-a69605caf7b13c63.js',
          revision: 'a69605caf7b13c63',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/handbook/page-9de55e0841e447db.js',
          revision: '9de55e0841e447db',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/layout-b9b0251ae18b51a6.js',
          revision: 'b9b0251ae18b51a6',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/org/settings/%5Bsubpage%5D/page-fd9af66a8dd37ca8.js',
          revision: 'fd9af66a8dd37ca8',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/page-df0c3d32daabc72b.js',
          revision: 'df0c3d32daabc72b',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/payments/%5Bsubpage%5D/page-eeb536866b6cfeba.js',
          revision: 'eeb536866b6cfeba',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/referrals/page-8524074dab394b52.js',
          revision: '8524074dab394b52',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/students/%5Buserid%5D/page-6fd12ccfeb1038ae.js',
          revision: '6fd12ccfeb1038ae',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/students/page-d968ccaa103e4551.js',
          revision: 'd968ccaa103e4551',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/user-account/owned/page-3954b3fc6e1dfe29.js',
          revision: '3954b3fc6e1dfe29',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/user-account/settings/%5Bsubpage%5D/page-ba79432f69e482bd.js',
          revision: 'ba79432f69e482bd',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/dash/users/settings/%5Bsubpage%5D/page-1920bcb243e3c112.js',
          revision: '1920bcb243e3c112',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/layout-547ab6c615f5cca1.js',
          revision: '547ab6c615f5cca1',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/marketer/page-5712462cc7b7b078.js',
          revision: '5712462cc7b7b078',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/marketer/payouts/page-3f2a55f22fefe42f.js',
          revision: '3f2a55f22fefe42f',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/marketer/register/page-182ddc65eaf00c90.js',
          revision: '182ddc65eaf00c90',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/marketer/revenue/page-1c0e2d91eaa01016.js',
          revision: '1c0e2d91eaa01016',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/marketer/students/page-8a3889caf309f958.js',
          revision: '8a3889caf309f958',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/policy/page-3b135011cbbdff6b.js',
          revision: '3b135011cbbdff6b',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/privacy/page-d02f77d4b831cefc.js',
          revision: 'd02f77d4b831cefc',
        },
        {
          url: '/_next/static/chunks/app/orgs/%5Borgslug%5D/verify-email/page-f1483da9520cc64e.js',
          revision: 'f1483da9520cc64e',
        },
        {
          url: '/_next/static/chunks/app/payments/stripe/connect/oauth/page-7b512fc37bf450e5.js',
          revision: '7b512fc37bf450e5',
        },
        {
          url: '/_next/static/chunks/app/ref/%5Bcode%5D/page-d3ae921b53f6bbec.js',
          revision: 'd3ae921b53f6bbec',
        },
        {
          url: '/_next/static/chunks/b2d08614.4fc1dc1882f05e18.js',
          revision: '4fc1dc1882f05e18',
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
          url: '/_next/static/chunks/main-4dc3e92df1f18528.js',
          revision: '4dc3e92df1f18528',
        },
        {
          url: '/_next/static/chunks/main-app-9b8dc134be19f0e0.js',
          revision: '9b8dc134be19f0e0',
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
          url: '/_next/static/chunks/webpack-7fa764c996bf0298.js',
          revision: '7fa764c996bf0298',
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
          url: '/_next/static/css/d233f13bd268e0dc.css',
          revision: 'd233f13bd268e0dc',
        },
        {
          url: '/_next/static/css/fdac6bbf6bfe4fdb.css',
          revision: 'fdac6bbf6bfe4fdb',
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
