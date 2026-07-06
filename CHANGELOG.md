## [1.18.4](https://github.com/Endika/mintza/compare/v1.18.3...v1.18.4) (2026-05-21)


### Bug Fixes

* **recording:** preserve final chunk, render markdown summaries, show mic level ([de00ac2](https://github.com/Endika/mintza/commit/de00ac25cee3ed177625fd2da801697514272c50))

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
