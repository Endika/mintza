## [1.18.4](https://github.com/Endika/mintza/compare/v1.18.3...v1.18.4) (2026-05-21)


### Bug Fixes

* **recording:** preserve final chunk, render markdown summaries, show mic level ([de00ac2](https://github.com/Endika/mintza/commit/de00ac25cee3ed177625fd2da801697514272c50))

## [1.23.1](https://github.com/Endika/mintza/compare/v1.23.0...v1.23.1) (2026-10-03)


### Bug Fixes

* move on to the next provider when Claude refuses or runs out of room ([b152ae7](https://github.com/Endika/mintza/commit/b152ae787ea0468921a3a2c1da92ec990b539b5b))
* price unrecorded models historically and check Claude keys without a paid call ([0f6d35d](https://github.com/Endika/mintza/commit/0f6d35deeca4194177b11405e5768cca3d8a08e8))
* summarise with Claude Sonnet 5.5 before Sonnet 4.5 retires ([ad3419d](https://github.com/Endika/mintza/commit/ad3419dcbc32a6cfd36fba2e07d9747a50ece826))

## [1.23.0](https://github.com/Endika/mintza/compare/v1.22.2...v1.23.0) (2026-10-03)


### Features

* separate Google Gemini and Speech keys ([aeb8307](https://github.com/Endika/mintza/commit/aeb8307292a23a8b743a231bfa872b20170b6c90))


### Bug Fixes

* keep Gemini-only keys away from Speech and explain billing and restriction errors ([7699798](https://github.com/Endika/mintza/commit/7699798feb5aff0ab2deb76a4a78e2fbec03c6cb))
* show the real reason a key test failed ([fad7a5c](https://github.com/Endika/mintza/commit/fad7a5ca5c8c00a0444b576392902ee2bb8d6a82))
* summarise with a current Gemini model ([7ec898c](https://github.com/Endika/mintza/commit/7ec898c144135150ccda58646363f74cd1c46386))
* translate the remaining key and provider errors ([4c32bc8](https://github.com/Endika/mintza/commit/4c32bc8f0ec4aefc14025720de6c16fc4bd647fd))

## [1.22.2](https://github.com/Endika/mintza/compare/v1.22.1...v1.22.2) (2026-10-03)


### Bug Fixes

* **deps:** bump dompurify and brace-expansion to patched versions ([933ea33](https://github.com/Endika/mintza/commit/933ea338c058631b6ac0eea3b42e921f39f47a14))

## [1.22.1](https://github.com/Endika/mintza/compare/v1.22.0...v1.22.1) (2026-10-03)


### Bug Fixes

* animate the button press and keep domain code out of the build config ([6956b4c](https://github.com/Endika/mintza/commit/6956b4c4ed70549abfa244542a95ddc1394466e1))
* ask before a same-route navigation and undo refused pushes ([2c96718](https://github.com/Endika/mintza/commit/2c96718b4401d4c12aabc1b4f2b76d23bfe25d84))
* escape every script-breaking character in the boot script ([92a5c1e](https://github.com/Endika/mintza/commit/92a5c1ec881dd969d3b31b3d4757b9f24310e6ee))
* export with the translated meeting title ([86dd838](https://github.com/Endika/mintza/commit/86dd838db30990a5e280c26a041d43a6941402a3))
* ignore foreign navigations, always release the microphone and word the summaries prompt truthfully ([033a616](https://github.com/Endika/mintza/commit/033a6168b16259c4602492d2655890bf03782916))
* keep every empty live region announceable and label only the meeting page's result rows as regions ([ca0674f](https://github.com/Endika/mintza/commit/ca0674f8f662d00b81e7a6eeb1aa7aee32add8ae))
* keep result headings intact with disclosure buttons and an always-present regenerate status ([bb74906](https://github.com/Endika/mintza/commit/bb74906f490806e85d8e6053fb09bbd0dbe56cb5))
* keep the docked Record out of the card morph and inline on short landscape phones ([8e0d82b](https://github.com/Endika/mintza/commit/8e0d82ba86a6c7352f2543dcaa9d096ed526e080))
* never hang leaving a recording and tell when results weren't saved ([a5ec15b](https://github.com/Endika/mintza/commit/a5ec15b9243dd403f1355479354335e5c6cbd76b))
* price unknown models with the provider default and show a dash before the first cost ([5e1fe21](https://github.com/Endika/mintza/commit/5e1fe21249ddcdfe05feb491a2e6a67b231ebfcf))
* send Google keys in a header instead of the URL ([6db9e23](https://github.com/Endika/mintza/commit/6db9e239a14e8153e7fd23853561b0f89660b0ea))
* set the page language and title from the stored config before the app loads ([1c1f6d6](https://github.com/Endika/mintza/commit/1c1f6d6e2d4e1149f8ff5a136b29169376114f84))
* tell when the microphone needed too long to stop and pin summarize-now kinds ([83b4711](https://github.com/Endika/mintza/commit/83b4711bd3dd10f17c1fd94dab02ced3ef8ebc28))

## [1.22.0](https://github.com/Endika/mintza/compare/v1.21.3...v1.22.0) (2026-10-03)


### Features

* guard route changes and move focus and title on navigation ([f5ba8d3](https://github.com/Endika/mintza/commit/f5ba8d3790adcc5d2cefe4b1748b61399b2a1862))
* persistent app shell with a bottom tab bar on phones ([fef029c](https://github.com/Endika/mintza/commit/fef029c613b80ca2b68e554c41d8438a0eb2460f))
* redesign history and meeting detail with the main result first ([0e5de16](https://github.com/Endika/mintza/commit/0e5de16a8ed760f9a8d7c489487e94988fc46497))
* redesign home around connecting, recording and one result first ([b0d3a63](https://github.com/Endika/mintza/commit/b0d3a6380f7586535c0bd46f1f64074d4097a177))
* redesign settings and templates with plain language and progressive disclosure ([6b6d690](https://github.com/Endika/mintza/commit/6b6d690e82a249b806552eaf47fc57bc81e9d07a))
* shift summary headings under their card ([73a2548](https://github.com/Endika/mintza/commit/73a2548e939cccca0f7fbb9a0f888fefb1b76dda))
* store the spoken language apart from the interface language ([5b39175](https://github.com/Endika/mintza/commit/5b39175c1bd4a430a20e98b4d7b81a8c7dc77891))
* warm design tokens with dark mode, self-hosted Figtree and zoom allowed ([92c642e](https://github.com/Endika/mintza/commit/92c642ec545e643af3acd7fdc1f0f5b1222ce8b6))


### Bug Fixes

* address detector findings ([de30c85](https://github.com/Endika/mintza/commit/de30c857d6298b196e80f6479dadb1ec598c365a))
* ask before leaving a meeting that isn't saved ([ec9e1b9](https://github.com/Endika/mintza/commit/ec9e1b9452c83d9de3364a95ed75ddfee2ce66e5))
* ask before starting over on an unsaved meeting ([8024013](https://github.com/Endika/mintza/commit/8024013ff8d0cc3c49f4beb8f2a4b24f544453c6))
* clean font url, status colours and control borders ([fdc2fb4](https://github.com/Endika/mintza/commit/fdc2fb4bf41637cfd3b56709bc228d3195279326))
* escape error messages rendered into the page ([8b9fc51](https://github.com/Endika/mintza/commit/8b9fc513187ea2e974b4bd6a81c1c4df9b33ce21))
* escape user-entered names everywhere they reach HTML ([7bcc785](https://github.com/Endika/mintza/commit/7bcc785f8f04e9cce83b0e1ac07ef47dfb86309e))
* generate only the summaries the template asks for ([9a203aa](https://github.com/Endika/mintza/commit/9a203aa4e2c28df0f4e1ecc2a5d9f12588880d36))
* keep sentiment and mind map out of the action colour ([29258bf](https://github.com/Endika/mintza/commit/29258bfc6ba4dc12d9ac14474ced7fc056c1a0da))
* keep the save bar in view and stop pinning the spoken language ([2ba6c32](https://github.com/Endika/mintza/commit/2ba6c3216c377611822cd73a62b2a6906008c954))
* keep the shown page alive when navigation returns to it ([6e93600](https://github.com/Endika/mintza/commit/6e93600d688abb4a48a9d92efcffd3f472efe78c))
* larger recording timer and smaller fixes ([d9995f2](https://github.com/Endika/mintza/commit/d9995f2a613f06e2f965fd0c0b859e4b1d3a53c4))
* never lose a recording when leaving the page ([509b7e5](https://github.com/Endika/mintza/commit/509b7e52267918a11fa65782a883a2ddb48bcd1f))
* only call registered route factories ([26c3705](https://github.com/Endika/mintza/commit/26c3705f1a68a23eca8c24457b1f4ca4adc69ed2))
* only leave a recording once its transcript is saved ([0cce83d](https://github.com/Endika/mintza/commit/0cce83d4400b558ce8ee599d74f815df97281e79))
* pin the record button above the tab bar on phones ([aeb6bf0](https://github.com/Endika/mintza/commit/aeb6bf0e5f4fe6de25306b347af9413bcf366588))
* price summaries and the mind map with the model that ran ([d1bee19](https://github.com/Endika/mintza/commit/d1bee19b11562d20113abeed49e819adf6a9d282))
* relabel the app shell when the interface language changes ([43b012d](https://github.com/Endika/mintza/commit/43b012d4ef7929e2dde7b546ec7784f576c7019f))
* render each route into its own container ([b0f0152](https://github.com/Endika/mintza/commit/b0f0152c31d9045ec405b8434e1533b7880ac426))
* restore cost breakdown, keep red for recording and fix history focus ([c346b06](https://github.com/Endika/mintza/commit/c346b0656c267ec38a21ca8ecd93bb23c0ed44e9))
* route every interface string through i18n and set the document language ([51d816c](https://github.com/Endika/mintza/commit/51d816c303ddd38706b30416a1b88b76ab95e241))
* serialize leave checks and ignore restored hashes in the router ([3f4aefa](https://github.com/Endika/mintza/commit/3f4aefaf76e2840f93619baadc2a5a05402b2570))
* settings quality list and save strip ([e06c77d](https://github.com/Endika/mintza/commit/e06c77d24d9efae876c6ad7295e51ae9d5a63d8e))
* tighten home layout, motion and status handling ([528741c](https://github.com/Endika/mintza/commit/528741c16406d977a80e3c0f8667a764f85e34c9))
* tighten translated copy and match search on translated template names ([d1d8603](https://github.com/Endika/mintza/commit/d1d860394f11041519848a7e8ef285c3075a221a))
* track the latest route target so going back mid-navigation is not dropped ([9c04b80](https://github.com/Endika/mintza/commit/9c04b80315b2f99da28ff7d59dde9dab5eac5297))
* translate default meeting titles, show custom template names and fix plural copy ([7499f81](https://github.com/Endika/mintza/commit/7499f81e58c9400e1d021454468f1cb48fe456cd))
* wrap meta values without separators and keep the regenerate status live ([283d1bb](https://github.com/Endika/mintza/commit/283d1bb78195f7f7244cdd5e0bc1cf6994bdc8d5))

## [1.21.3](https://github.com/Endika/mintza/compare/v1.21.2...v1.21.3) (2026-09-25)


### Bug Fixes

* report failed saves and never overwrite stored keys with defaults ([a075af2](https://github.com/Endika/mintza/commit/a075af2b08950fce55885bd5d909444eecf30f5f))

## [1.21.2](https://github.com/Endika/mintza/compare/v1.21.1...v1.21.2) (2026-09-17)


### Bug Fixes

* **sw:** reject cross-origin messages before skipWaiting ([6578cca](https://github.com/Endika/mintza/commit/6578cca797048d7185c9e9b9e08c461ad28ba709))

## [1.21.1](https://github.com/Endika/mintza/compare/v1.21.0...v1.21.1) (2026-09-16)


### Bug Fixes

* **sw:** drop the unreachable API-host check before the origin guard ([9712787](https://github.com/Endika/mintza/commit/97127878582f606b650907fa6f444b3043d38505))

## [1.21.0](https://github.com/Endika/mintza/compare/v1.20.0...v1.21.0) (2026-09-16)


### Features

* **ci:** add CodeQL static analysis ([572e06d](https://github.com/Endika/mintza/commit/572e06dddd2f7a1088b22a718d2743bc65d1e64f))

## [1.20.0](https://github.com/Endika/mintza/compare/v1.19.17...v1.20.0) (2026-09-16)


### Features

* **ci:** block PRs that introduce high-severity dependency advisories ([7763ef2](https://github.com/Endika/mintza/commit/7763ef2f93c13d0322ddbf28cd73521563147c49))

## [1.19.17](https://github.com/Endika/mintza/compare/v1.19.16...v1.19.17) (2026-09-07)


### Chores

* **deps-dev:** bump the dev-dependencies group with 6 updates ([e1b44a8](https://github.com/Endika/mintza/commit/e1b44a8f9ffb94a3536fbbc3dd5084c430027776))
* **deps-dev:** bump vitest and @vitest/coverage-v8 from 4.1.11 to 5.0.0 ([05b29e2](https://github.com/Endika/mintza/commit/05b29e2a1ac4660b8e0e76ede9782ff8f755c113))

## [1.19.16](https://github.com/Endika/mintza/compare/v1.19.15...v1.19.16) (2026-09-05)


### Chores

* run the four CI gates in pre-commit ([00dcabe](https://github.com/Endika/mintza/commit/00dcabe2291a2c4b95f95c6e500adf81d84b8a0a))

## [1.19.15](https://github.com/Endika/mintza/compare/v1.19.14...v1.19.15) (2026-09-05)


### Chores

* lint the service worker and configs instead of excluding them ([2c3e6a9](https://github.com/Endika/mintza/commit/2c3e6a9c930db8094dba85ca8440fe2e88cb5e6a))

## [1.19.14](https://github.com/Endika/mintza/compare/v1.19.13...v1.19.14) (2026-09-05)


### Chores

* fail the lint gate on warnings ([c7b20c0](https://github.com/Endika/mintza/commit/c7b20c06d24ba92df4deff48a642ee4559843ebc))

## [1.19.13](https://github.com/Endika/mintza/compare/v1.19.12...v1.19.13) (2026-09-05)


### Chores

* **deps-dev:** bump the dev-dependencies group with 6 updates ([e804814](https://github.com/Endika/mintza/commit/e804814178d5a5510c528ee0a606fed611699614))
* order CI gates and rename typecheck to type:check ([95c3f15](https://github.com/Endika/mintza/commit/95c3f15c9817d8b623e7e4eb523f5984467d57b7))

## [1.19.12](https://github.com/Endika/mintza/compare/v1.19.11...v1.19.12) (2026-08-26)


### Chores

* **deps-dev:** bump the dev-dependencies group with 4 updates ([23b7761](https://github.com/Endika/mintza/commit/23b7761f8801b9db8a57a322315888e48f40a380))
* **deps-dev:** bump the dev-dependencies group with 7 updates ([d717bdb](https://github.com/Endika/mintza/commit/d717bdb1e5ae03ec6fe7cc54d6741ee69ca288c9))
* **deps:** migrate to tailwindcss 4 ([74b768e](https://github.com/Endika/mintza/commit/74b768ec459ea6ccd3457677c26de461880aef05))

## [1.19.11](https://github.com/Endika/mintza/compare/v1.19.10...v1.19.11) (2026-08-12)


### Chores

* **deps-dev:** bump fake-indexeddb from 5.0.2 to 6.2.5 ([#63](https://github.com/Endika/mintza/issues/63)) ([9d2bf3e](https://github.com/Endika/mintza/commit/9d2bf3e7038b9a2a0042b17095eaeed64c37bdb3))
* **deps-dev:** bump the dev-dependencies group with 2 updates ([f17fb74](https://github.com/Endika/mintza/commit/f17fb7475d6cfb2067003b4f3a7215e7913e764d))

## [1.19.10](https://github.com/Endika/mintza/compare/v1.19.9...v1.19.10) (2026-08-04)


### Chores

* move to eslint 10 and typescript-eslint 8 with flat config ([5a729c3](https://github.com/Endika/mintza/commit/5a729c34c8710b723ffdc52bcf2b2ec983cb4d61))

## [1.19.9](https://github.com/Endika/mintza/compare/v1.19.8...v1.19.9) (2026-08-04)


### Chores

* **deps-dev:** bump vite, @vitest/coverage-v8 and vitest ([adb5e90](https://github.com/Endika/mintza/commit/adb5e90ca551bdc1543db3590606300175a75e1f))

## [1.19.8](https://github.com/Endika/mintza/compare/v1.19.7...v1.19.8) (2026-08-04)


### Chores

* **deps-dev:** bump @types/node from 20.19.43 to 26.1.2 ([3c376cb](https://github.com/Endika/mintza/commit/3c376cbcc062727c5a790d34f151a4273433ec15))

## [1.19.7](https://github.com/Endika/mintza/compare/v1.19.6...v1.19.7) (2026-08-04)


### Chores

* **deps-dev:** bump js-yaml from 4.1.1 to 4.3.1 ([6d35774](https://github.com/Endika/mintza/commit/6d357740f55faa4ba8507eff53499348e75ad99a))
* **deps-dev:** bump postcss in the dev-dependencies group ([bb13b39](https://github.com/Endika/mintza/commit/bb13b3959acdd612207df011410ce9f1fe61b9a6))
* **deps:** bump brace-expansion ([5655735](https://github.com/Endika/mintza/commit/56557350d1b6c43d1f010cd37b07abea4206059e))
* **deps:** bump dompurify from 3.4.5 to 3.4.13 ([9918571](https://github.com/Endika/mintza/commit/99185711fc7317013875a0d84e9218b00edb98f3))

## [1.19.6](https://github.com/Endika/mintza/compare/v1.19.5...v1.19.6) (2026-08-01)


### Chores

* **deps-dev:** bump the dev-dependencies group with 3 updates ([2034d87](https://github.com/Endika/mintza/commit/2034d87cfd8b5ba9366986b9bd8720710d726a78))
* **deps-dev:** bump the dev-dependencies group with 3 updates ([4b58215](https://github.com/Endika/mintza/commit/4b58215bc96c8ae334d33d626039047e6a912e65))

## [1.19.5](https://github.com/Endika/mintza/compare/v1.19.4...v1.19.5) (2026-07-13)


### Bug Fixes

* prevent accidental pinch and double-tap zoom on mobile ([ee79aee](https://github.com/Endika/mintza/commit/ee79aeef0f52fe70d92537bdaa9bb3658d617e16))


### Chores

* **deps-dev:** bump the dev-dependencies group with 2 updates ([6b88cea](https://github.com/Endika/mintza/commit/6b88cea6dc884616a4b7eb31a9a8588c83016f3c))

## [1.19.4](https://github.com/Endika/mintza/compare/v1.19.3...v1.19.4) (2026-07-06)


### Chores

* **ci:** drop redundant deploy dispatch from release flow ([35a2361](https://github.com/Endika/mintza/commit/35a2361e5606a9a49878790edf1b8ad563de619a))
* **deps-dev:** bump the dev-dependencies group with 3 updates ([a9bf285](https://github.com/Endika/mintza/commit/a9bf285a4e26143bec3164d60b3bc3a68b06d74f))

## [1.19.3](https://github.com/Endika/mintza/compare/v1.19.2...v1.19.3) (2026-07-06)


### Bug Fixes

* **ci:** stop release-please auto-merge loop ([0879ef1](https://github.com/Endika/mintza/commit/0879ef1ac88f8d5c745c2f8143be38848ba4db6f))

## [1.19.2](https://github.com/Endika/mintza/compare/v1.19.1...v1.19.2) (2026-07-06)


### Chores

* **deps-dev:** bump happy-dom in the dev-dependencies group ([fa8154f](https://github.com/Endika/mintza/commit/fa8154fdb48acbcfa01bb48d4e7524d106469c33))
* **deps-dev:** bump the dev-dependencies group with 3 updates ([f43900b](https://github.com/Endika/mintza/commit/f43900bbdaf6c640516c48b82417d79d7454aa1b))

## [1.19.1](https://github.com/Endika/mintza/compare/v1.19.0...v1.19.1) (2026-06-09)


### Chores

* **deps-dev:** bump the dev-dependencies group with 2 updates ([ccc4f5f](https://github.com/Endika/mintza/commit/ccc4f5f7b258b1f4ca9fcfa04f7a10d22f2cc371))

## [1.19.0](https://github.com/Endika/mintza/compare/v1.18.8...v1.19.0) (2026-06-04)


### Features

* reliable mobile recording (wake lock + Whisper anti-hallucination) ([#18](https://github.com/Endika/mintza/issues/18)) ([2b550ab](https://github.com/Endika/mintza/commit/2b550aba5a2cbc4e1c80079211429a5c75a96771))

## [1.18.8](https://github.com/Endika/mintza/compare/v1.18.7...v1.18.8) (2026-05-22)


### Bug Fixes

* **ci:** parse release-please pr payload in run script, not env ([8d53af0](https://github.com/Endika/mintza/commit/8d53af083d5f493c1bb6c688896d79b8627d4b06))

## [1.18.7](https://github.com/Endika/mintza/compare/v1.18.6...v1.18.7) (2026-05-22)


### Bug Fixes

* **ci:** also delete the release-please head branch after auto-merge ([0b9be94](https://github.com/Endika/mintza/commit/0b9be940765e59168a6ff31659aea80bb348be54))

## [1.18.6](https://github.com/Endika/mintza/compare/v1.18.5...v1.18.6) (2026-05-22)


### Bug Fixes

* **ci:** delete PR branch on close regardless of merge state ([58d6ba3](https://github.com/Endika/mintza/commit/58d6ba31166af6f17ff1f5f597121908938a0582))
* **ci:** grant actions: write to enable workflow_dispatch self-rearm ([fd37cef](https://github.com/Endika/mintza/commit/fd37cef460c4af557c82331531ee14c4c154097e))
* **ci:** re-trigger release-please via workflow_dispatch after auto-merge ([f0aefc1](https://github.com/Endika/mintza/commit/f0aefc1698ac57665d0fc36498420c84bac7e19e))

## [1.18.5](https://github.com/Endika/mintza/compare/v1.18.4...v1.18.5) (2026-05-22)


### Bug Fixes

* **release:** pass -R repo to gh pr merge ([ffbacda](https://github.com/Endika/mintza/commit/ffbacdad398b4cfa605b7e681ceb012e9aa73fe9))


### Documentation

* **changelog:** remove duplicate 1.18.4 entry left by migration ([175efeb](https://github.com/Endika/mintza/commit/175efeb6c31adbcc30a0ab86229bf11ab91ac662))
* **license:** add MIT LICENSE file ([dd36753](https://github.com/Endika/mintza/commit/dd367530131399cde4b2539b8203cd376c8f2051))
* **readme:** align structure with kartaak and converthub ([3ff8927](https://github.com/Endika/mintza/commit/3ff892704abfd2438e59511acf9a1294f7e42688))


### Chores

* **main:** release 1.18.4 ([e423d80](https://github.com/Endika/mintza/commit/e423d8071b9898cd2cd91e4875ed2b82e7c36dc0))
* **release:** migrate from semantic-release to release-please with auto-merge ([8722c18](https://github.com/Endika/mintza/commit/8722c185aa88fced46bacf5e5a0906f758b21c84))

## [1.18.3](https://github.com/Endika/mintza/compare/v1.18.2...v1.18.3) (2026-05-21)


### Bug Fixes

* **persistence:** resolve custom templates when loading meetings ([2b15638](https://github.com/Endika/mintza/commit/2b156380d676f3ed0d618fd3cee953335c04de14))

## [1.18.2](https://github.com/Endika/mintza/compare/v1.18.1...v1.18.2) (2026-05-21)


### Bug Fixes

* **meeting:** persist meeting and mind map after recording stops ([f25f39d](https://github.com/Endika/mintza/commit/f25f39d7af9bd2aa8aac0a0b611a71fd990d12e1))

## [1.18.1](https://github.com/Endika/mintza/compare/v1.18.0...v1.18.1) (2026-05-21)


### Bug Fixes

* **templates:** prefill duplicate/edit with defaults and enlarge text areas ([68bb25c](https://github.com/Endika/mintza/commit/68bb25c351ecf841c22bf93fde73eda2c613ac26))

# [1.18.0](https://github.com/Endika/mintza/compare/v1.17.0...v1.18.0) (2026-05-21)


### Features

* **templates:** block deletion when meetings still reference the template ([2d30940](https://github.com/Endika/mintza/commit/2d30940ca974f0c1b91ecd98534ba30d4554821a))

# [1.17.0](https://github.com/Endika/mintza/compare/v1.16.0...v1.17.0) (2026-05-21)


### Features

* **templates:** CRUD page for custom prompts, dynamic selector and regenerate from history ([2e67660](https://github.com/Endika/mintza/commit/2e67660ef7b424f493556f1be866d9f4e006b9d0))

# [1.16.0](https://github.com/Endika/mintza/compare/v1.15.2...v1.16.0) (2026-05-21)


### Features

* **history:** search box and sort by recent/oldest/longest/title ([071a7ca](https://github.com/Endika/mintza/commit/071a7ca9c01fbb232867957d8c63883d0de7e523))

## [1.15.2](https://github.com/Endika/mintza/compare/v1.15.1...v1.15.2) (2026-05-21)


### Bug Fixes

* **home:** reset state on new-meeting and disable Record when no API key ([eef7ac2](https://github.com/Endika/mintza/commit/eef7ac21dd5a24c6c324ef7ace8a92f926ae39d5))

## [1.15.1](https://github.com/Endika/mintza/compare/v1.15.0...v1.15.1) (2026-05-21)


### Bug Fixes

* **home:** freeze duration, counter and mic level meter while paused ([954436c](https://github.com/Endika/mintza/commit/954436c409fec366180222cd444106ceced7259a))

# [1.15.0](https://github.com/Endika/mintza/compare/v1.14.0...v1.15.0) (2026-05-21)


### Features

* **home:** standard play/pause/stop/record icons on control buttons ([64d06b0](https://github.com/Endika/mintza/commit/64d06b0bca0e0b7e711846b508ceecb08ad5b528))

# [1.14.0](https://github.com/Endika/mintza/compare/v1.13.0...v1.14.0) (2026-05-21)


### Features

* **settings:** dirty-state Save button, Clear disabled when empty, no-changes feedback ([3327383](https://github.com/Endika/mintza/commit/33273834bf981223f24f0e004039543cf55c6b9b))

# [1.13.0](https://github.com/Endika/mintza/compare/v1.12.0...v1.13.0) (2026-05-21)


### Features

* **home:** summarize-now button generates summary mid-recording without stopping ([650bbf3](https://github.com/Endika/mintza/commit/650bbf3c14ede2089c56705c3ae59621c7004cc5))

# [1.12.0](https://github.com/Endika/mintza/compare/v1.11.1...v1.12.0) (2026-05-21)


### Features

* **settings:** per-service validation results with check/cross per provider ([17ad971](https://github.com/Endika/mintza/commit/17ad971e6111ef462781bf39b93893ed0ca91109))

## [1.11.1](https://github.com/Endika/mintza/compare/v1.11.0...v1.11.1) (2026-05-21)


### Bug Fixes

* **audio,errors,ux:** rotate MediaRecorder per chunk, polished REC badge, i18n update banner and Google multi-endpoint validation ([52dc4a8](https://github.com/Endika/mintza/commit/52dc4a8c37cd96907b4f82d94654746db2763468))

# [1.11.0](https://github.com/Endika/mintza/compare/v1.10.1...v1.11.0) (2026-05-21)


### Features

* **errors:** provider-named messages and full attempt list in chain failures ([c66ed3b](https://github.com/Endika/mintza/commit/c66ed3b9c27b1e8a7dbfe4cc4fd627056d7e6e78))

## [1.10.1](https://github.com/Endika/mintza/compare/v1.10.0...v1.10.1) (2026-05-21)


### Bug Fixes

* **pwa:** network-first for HTML and SW so new releases land instantly ([acfa9fa](https://github.com/Endika/mintza/commit/acfa9fadb54025d3eab7c7af946f8a456d0fc8d6))

# [1.10.0](https://github.com/Endika/mintza/compare/v1.9.0...v1.10.0) (2026-05-21)


### Features

* **home:** pause/resume, new-meeting reset and reactive button states ([41dea10](https://github.com/Endika/mintza/commit/41dea10572d14e5c8cdb6dcc92aa25313df38603))

# [1.9.0](https://github.com/Endika/mintza/compare/v1.8.0...v1.9.0) (2026-05-21)


### Features

* **home:** live mic level meter, chunk progress and last-error feedback ([6b9a7c0](https://github.com/Endika/mintza/commit/6b9a7c0e47551d456b6de6426a07c0895276ff6b))

# [1.8.0](https://github.com/Endika/mintza/compare/v1.7.0...v1.8.0) (2026-05-21)


### Features

* **pwa:** versioned cache, in-app update banner and semantic-release npm sync ([7462a80](https://github.com/Endika/mintza/commit/7462a8035c8bc509e20608e5d33869d5ecc877b6))

# [1.7.0](https://github.com/Endika/mintza/compare/v1.6.0...v1.7.0) (2026-05-21)


### Bug Fixes

* **cost-counter:** use real transcribed segments and provider-aware pricing ([6b84a7b](https://github.com/Endika/mintza/commit/6b84a7b7fefac07b148f49226d553d94115f62a1))


### Features

* **brand:** show app version baked from package.json in a discreet badge ([3f52072](https://github.com/Endika/mintza/commit/3f52072ac9bd3b3783c95f1610cbc7e2200c4173))
* **history:** clickable detail page, per-entry delete and clear all ([041434c](https://github.com/Endika/mintza/commit/041434c29ad914daf57ff2ac849f75ab87d5454e))

# [1.6.0](https://github.com/Endika/mintza/compare/v1.5.1...v1.6.0) (2026-05-21)


### Features

* **brand:** waveform favicon with brand gradient and live demo badge ([9a0eae7](https://github.com/Endika/mintza/commit/9a0eae7501a8291eea0de9e25d0a0e5f1d577176))

## [1.5.1](https://github.com/Endika/mintza/compare/v1.5.0...v1.5.1) (2026-05-21)


### Performance Improvements

* **presentation:** lazy-load Settings and History; add a11y skip link and live regions ([86c4f49](https://github.com/Endika/mintza/commit/86c4f4939c5d934acf50bb9c04cc5e8916ded69b))

# [1.5.0](https://github.com/Endika/mintza/compare/v1.4.0...v1.5.0) (2026-05-21)


### Features

* **export:** add PDF export with dynamically imported jsPDF ([71d8a58](https://github.com/Endika/mintza/commit/71d8a58221d50134ea06fcddfc01b439199453e2))
* **i18n:** translator with English, Spanish and Basque dictionaries ([92234ec](https://github.com/Endika/mintza/commit/92234ec5f33f7c6b0d52c8d4223517ce02dc98bf))
* **infrastructure:** Azure Speech client with region configuration ([354d396](https://github.com/Endika/mintza/commit/354d396a0d6a5c0c8a0c87a5fecc8d3de10256f6))
* **mindmap:** domain model, LLM JSON adapter and use case ([c973082](https://github.com/Endika/mintza/commit/c9730820ca10351b964a97be4fefabd8228527cd))
* **presentation:** mind map visualization with collapsible branches ([8c77776](https://github.com/Endika/mintza/commit/8c77776a946b5e83a45bd080d9250647c4fe2bf2))

# [1.4.0](https://github.com/Endika/mintza/compare/v1.3.0...v1.4.0) (2026-05-21)


### Features

* **domain:** parse temperature score from sentiment summary ([6650cac](https://github.com/Endika/mintza/commit/6650cac5f177ecd8ce050cf44adf54bc407c1a1e))
* **domain:** statistics calculator and meeting exporter for md/json/txt/csv ([2fab551](https://github.com/Endika/mintza/commit/2fab5516029a465503d7ae07c86e5e9d98c01a28))
* **presentation:** render temperature gauge after summaries ([7bfaa9f](https://github.com/Endika/mintza/commit/7bfaa9f5a40776c14f40d1a8583640c611e78df6))
* **presentation:** statistics panel, export menu and integrated rendering ([2587a6a](https://github.com/Endika/mintza/commit/2587a6a13eff44ff9d1adf8cd78ea9cb6a5f9eb4))

# [1.3.0](https://github.com/Endika/mintza/compare/v1.2.0...v1.3.0) (2026-05-21)


### Features

* **infrastructure:** Google Speech client and transcription chain with quality profiles ([edc389d](https://github.com/Endika/mintza/commit/edc389dfdee15d1df5533aabb35993c433321fba))

# [1.2.0](https://github.com/Endika/mintza/compare/v1.1.0...v1.2.0) (2026-05-21)


### Features

* **domain:** cost calculator with provider pricing constants ([ddb04d7](https://github.com/Endika/mintza/commit/ddb04d711b9e85033635360640df0f0467368070))
* **presentation:** live cost counter during recording and final breakdown ([15c7e4a](https://github.com/Endika/mintza/commit/15c7e4a0d2495ea922dcd9867e6810d21c60a244))
* **settings:** per-provider API key validator with test buttons ([67970a3](https://github.com/Endika/mintza/commit/67970a383ec42bc1bbdafc71ec0bbc0ad8b0d2b3))

# [1.1.0](https://github.com/Endika/mintza/compare/v1.0.0...v1.1.0) (2026-05-21)


### Features

* **domain:** featured summary order per template ([1209463](https://github.com/Endika/mintza/commit/12094632e0090e36ff9631289f84d052aefba369))
* **infrastructure:** Claude and Gemini clients with summarization chain ([1373e6e](https://github.com/Endika/mintza/commit/1373e6ec6e0a999e1b4271ac0d61a827c101639e))
* **presentation:** template and language selectors with all 8 summary kinds ([eb1fbbc](https://github.com/Endika/mintza/commit/eb1fbbcde891d8bc762692aee26c54b0a491c7aa))
* **presentation:** wire quality profile chains and surface them in settings ([349d2c0](https://github.com/Endika/mintza/commit/349d2c086a7463d717943ca3c31415670716f2e0))

# 1.0.0 (2026-05-21)


### Features

* **application:** use cases for recording, transcription and persistence ([14e6140](https://github.com/Endika/mintza/commit/14e6140ccbd0715d6bacd6a6cf3df375ad77b508))
* **domain:** value objects, entities and ports for meetings ([ab127a7](https://github.com/Endika/mintza/commit/ab127a72ab6ab7a65a48a7e72b87867a32e87be7))
* **infrastructure:** Whisper, OpenAI, MediaRecorder and storage adapters ([1d8d11c](https://github.com/Endika/mintza/commit/1d8d11c7072b6a42e18c53f53fab9f76de63c403))
* **presentation:** home, history and settings pages with hash router ([da77a0c](https://github.com/Endika/mintza/commit/da77a0c3b18c5c4bfe976b553fcaab5460dbbe0a))
* **pwa:** service worker for installable offline shell ([37bf7f6](https://github.com/Endika/mintza/commit/37bf7f699d9abf1abbdaf21108297bd6cbf48f24))
