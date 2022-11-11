# Changelog

All notable changes to this project will be documented in this file. See [Convential Commits](https://www.conventionalcommits.org/en/v1.0.0/#specification) for commit guidelines.

## [3.0.1](http://superfly.tv/compare/v3.0.0...v3.0.1) (Fri Nov 11 2022)


## [3.0.0](http://superfly.tv/compare/2.1.2...v3.0.0) (Fri Nov 11 2022)

## Breaking changes

### Features

* **!** adjust for casparcg-connection rewrite [74dbe01](http://superfly.tv/commit/74dbe012ec5ec9a3ef5dd298632998993229f77f)

### [2.1.2](https://github.com/SuperFlyTV/casparcg-state/compare/2.1.1...2.1.2) (2022-10-28)

### Bug Fixes

- pass `in` to LoadCommand ([c8da760](https://github.com/SuperFlyTV/casparcg-state/commit/c8da760ba42eba132cbf42bc6b39a31f46da48b6))

### [2.1.1](https://github.com/SuperFlyTV/casparcg-state/compare/2.1.0...2.1.1) (2022-04-19)

### Bug Fixes

- dont issue a seek when going from clip with playTime, to playTime=null ([#67](https://github.com/SuperFlyTV/casparcg-state/issues/67)) ([6ffd80d](https://github.com/SuperFlyTV/casparcg-state/commit/6ffd80d2b5e0b5443acce2a00d6c19edb43abc6b))
- MIN_TIME_SINCE_PLAY was defined in seconds, it should be in ms ([e0f5aad](https://github.com/SuperFlyTV/casparcg-state/commit/e0f5aad4420f79d83a95ea7999c75426a6f10546))

## [2.1.0](https://github.com/SuperFlyTV/casparcg-state/compare/2.0.0...2.1.0) (2020-11-16)

### Features

- ffmpeg style filter strings ([57db8fa](https://github.com/SuperFlyTV/casparcg-state/commit/57db8faacf1b56d6ac2e0ddb18074e394d62f331))

### Bug Fixes

- add customOptions property on transitions, for pass-through of data blob ([adf60ac](https://github.com/SuperFlyTV/casparcg-state/commit/adf60ac87601da96738b87d6d4c3e546e67f7b6d))

## [2.0.0](https://github.com/SuperFlyTV/casparcg-state/compare/1.12.0...2.0.0) (2020-09-29)

### ⚠ BREAKING CHANGES

- refactoring of CasparCGState
- drop node 8 support

### Features

- drop node 8 support ([afdfa2c](https://github.com/SuperFlyTV/casparcg-state/commit/afdfa2c679eeb8e26ed45cc977e5ea2c0e4ec9ff))
- full refactor of all typings, and making it clearer what is frames and what is milliseconds ([5333a12](https://github.com/SuperFlyTV/casparcg-state/commit/5333a123aa9dfc51961f2aea005aa49f5310a7cf))
- refactoring of CasparCGState ([92468c7](https://github.com/SuperFlyTV/casparcg-state/commit/92468c7ca4949ada1f6c5a4f58ff9e48b964266c))
- **ci:** prerelease workflow + optionally skip audit ([b18e3f8](https://github.com/SuperFlyTV/casparcg-state/commit/b18e3f8568a69f62db2a9affb013cebf0396fdd9))

### Bug Fixes

- compare route modes ([b5dc3ae](https://github.com/SuperFlyTV/casparcg-state/commit/b5dc3ae2b24e49272ac3c8f45409b101ab7d9632))
- standardize frame - time conversions ([2d5673a](https://github.com/SuperFlyTV/casparcg-state/commit/2d5673aede60ba327bab4552130876e2ec368731))
- timings ([b7f3507](https://github.com/SuperFlyTV/casparcg-state/commit/b7f3507f065147f0649cb3daf21e350654b85c5b))

## [1.12.0](https://github.com/SuperFlyTV/casparcg-state/compare/1.11.2...1.12.0) (2020-03-11)

### Features

- decklink filter parameter ([4e970f4](https://github.com/SuperFlyTV/casparcg-state/commit/4e970f425c5643c8357bd359340935f683323d6f))

### [1.11.2](https://github.com/SuperFlyTV/casparcg-state/compare/1.11.1...1.11.2) (2019-12-11)

### Bug Fixes

- state mutations when nextUp routes change ([#41](https://github.com/SuperFlyTV/casparcg-state/issues/41)) ([7c6b605](https://github.com/SuperFlyTV/casparcg-state/commit/7c6b605bd8590b378dd3078f273b9f002b6f191b))

### [1.11.1](https://github.com/SuperFlyTV/casparcg-state/compare/1.11.0...1.11.1) (2019-12-05)

### Bug Fixes

- do not send empty LOAD command ([7e66cd1](https://github.com/SuperFlyTV/casparcg-state/commit/7e66cd1387b1c58c1c26a38b46e3a47bd05ab89f))

## [1.11.0](https://github.com/SuperFlyTV/casparcg-state/compare/1.10.0...1.11.0) (2019-11-22)

### Features

- add support for FRAMES_DELAY on route ([f1904af](https://github.com/SuperFlyTV/casparcg-state/commit/f1904afb4796861c5a230b4993e576240ecf285f))

### Bug Fixes

- change framesDelay to delay and use miliseconds instead of frames ([97b69b0](https://github.com/SuperFlyTV/casparcg-state/commit/97b69b037fc89f8d91283f9978bfc10a6c561b47))
- changed routing delay triggers new command ([343b170](https://github.com/SuperFlyTV/casparcg-state/commit/343b170912ef57f13032a2af6af5f3ae220b583b))

## [1.10.0](https://github.com/SuperFlyTV/casparcg-state/compare/1.9.1...1.10.0) (2019-11-18)

### Features

- clear_on_404 parameter for PLAY/LOAD/LOADBG ([8ef80e7](https://github.com/SuperFlyTV/casparcg-state/commit/8ef80e78f8b4539f504ba676a70d558f5783157a))

### [1.9.1](https://github.com/SuperFlyTV/casparcg-state/compare/1.9.0...1.9.1) (2019-11-07)

## [1.9.0](https://github.com/SuperFlyTV/casparcg-state/compare/1.8.1...1.9.0) (2019-11-07)

### Features

- sting transition fade parameters ([00a0713](https://github.com/SuperFlyTV/casparcg-state/commit/00a0713d9d56b95b6b0553189182a00ee55ebcae))
- update ci to run for node 8,10,12 ([51b7047](https://github.com/SuperFlyTV/casparcg-state/commit/51b7047eb3bcf860c4ed58d225d87b4ab41ac58a))

### Bug Fixes

- sting transition fade parameters are in ms ([a2ded80](https://github.com/SuperFlyTV/casparcg-state/commit/a2ded808b768524db9a402789302325737c7a218))

### [1.8.1](https://github.com/SuperFlyTV/casparcg-state/compare/1.8.0...1.8.1) (2019-08-07)

### Bug Fixes

- add support for deep object comparison ([b0b2138](https://github.com/SuperFlyTV/casparcg-state/commit/b0b2138))
- changing clip transition after load ([d7fefcc](https://github.com/SuperFlyTV/casparcg-state/commit/d7fefcc))
- downgrade gh-pages due to bug in 2.1.0 ([22260b1](https://github.com/SuperFlyTV/casparcg-state/commit/22260b1))

## [1.8.0](https://github.com/SuperFlyTV/casparcg-state/compare/1.7.0...1.8.0) (2019-06-05)

### Features

- Add context to all commands ([6d7f466](https://github.com/SuperFlyTV/casparcg-state/commit/6d7f466))

# [1.7.0](https://github.com/SuperFlyTV/casparcg-state/compare/1.6.0...1.7.0) (2019-04-11)

### Bug Fixes

- update dependencies ([e133436](https://github.com/SuperFlyTV/casparcg-state/commit/e133436))
- update dependencies + TS3 ([72b44da](https://github.com/SuperFlyTV/casparcg-state/commit/72b44da))

### Features

- add support for inPoint, seek, length & loop. ([3173c9e](https://github.com/SuperFlyTV/casparcg-state/commit/3173c9e))

<a name="1.6.0"></a>

# [1.6.0](https://github.com/SuperFlyTV/casparcg-state/compare/1.5.1...1.6.0) (2019-02-06)

### Features

- remove currentTime function and replacing it with time parameter, to allow for processing at multiple concurrent points in time. ([60553e0](https://github.com/SuperFlyTV/casparcg-state/commit/60553e0))

<a name="1.5.1"></a>

## [1.5.1](https://github.com/SuperFlyTV/casparcg-state/compare/1.5.0...1.5.1) (2018-12-16)

<a name="1.5.0"></a>

# [1.5.0](https://github.com/SuperFlyTV/casparcg-state/compare/1.4.3...1.5.0) (2018-12-13)

### Features

- channel_layout for ffmpeg and route producer ([2b1871f](https://github.com/SuperFlyTV/casparcg-state/commit/2b1871f))

<a name="1.4.3"></a>

## [1.4.3](https://github.com/SuperFlyTV/casparcg-state/compare/1.4.2...1.4.3) (2018-12-13)

### Bug Fixes

- lint error ([fb05381](https://github.com/SuperFlyTV/casparcg-state/commit/fb05381))
- update dependencies, linting & switch from nsp to yarn audit ([f07ba70](https://github.com/SuperFlyTV/casparcg-state/commit/f07ba70))

<a name="1.4.2"></a>

## [1.4.2](https://github.com/SuperFlyTV/casparcg-state/compare/1.4.1...1.4.2) (2018-11-23)

### Bug Fixes

- do not reload bg on stop command ([851147f](https://github.com/SuperFlyTV/casparcg-state/commit/851147f))
- only do loadbg empty if another clip was preloaded ([adf3e52](https://github.com/SuperFlyTV/casparcg-state/commit/adf3e52))

<a name="1.4.1"></a>

## [1.4.1](https://github.com/SuperFlyTV/casparcg-state/compare/1.4.0...1.4.1) (2018-11-19)

### Bug Fixes

- broken test ([9c7b60d](https://github.com/SuperFlyTV/casparcg-state/commit/9c7b60d))
- make transition obj type check more durable ([e5005fd](https://github.com/SuperFlyTV/casparcg-state/commit/e5005fd))
- transition obj building if type is uppercase sting ([d3c452e](https://github.com/SuperFlyTV/casparcg-state/commit/d3c452e))

<a name="1.4.0"></a>

# [1.4.0](https://github.com/SuperFlyTV/casparcg-state/compare/1.3.3...1.4.0) (2018-11-12)

### Bug Fixes

- lint error ([f3efb9c](https://github.com/SuperFlyTV/casparcg-state/commit/f3efb9c))
- lint error & updated yarn.lock file ([976a1f1](https://github.com/SuperFlyTV/casparcg-state/commit/976a1f1))

### Features

- added support & tests for clearing the nextUp / loadbg ([3e0ea2c](https://github.com/SuperFlyTV/casparcg-state/commit/3e0ea2c))
- order commands for execution time ([e99722a](https://github.com/SuperFlyTV/casparcg-state/commit/e99722a))

<a name="1.3.3"></a>

## [1.3.3](https://github.com/SuperFlyTV/casparcg-state/compare/1.3.2...1.3.3) (2018-09-22)

### Bug Fixes

- a route should not reload when it was preloaded ([6afa888](https://github.com/SuperFlyTV/casparcg-state/commit/6afa888))
- loadbg with loop + seek ([0c3daf0](https://github.com/SuperFlyTV/casparcg-state/commit/0c3daf0))

<a name="1.3.2"></a>

## [1.3.2](https://github.com/SuperFlyTV/casparcg-state/compare/1.3.1...1.3.2) (2018-09-11)

<a name="1.3.1"></a>

## [1.3.1](https://github.com/SuperFlyTV/casparcg-state/compare/1.3.0...1.3.1) (2018-08-31)

### Bug Fixes

- empty bg layer before loadbg'ing ([40654bc](https://github.com/SuperFlyTV/casparcg-state/commit/40654bc))

<a name="1.3.0"></a>

# [1.3.0](https://github.com/SuperFlyTV/casparcg-state/compare/1.2.0...1.3.0) (2018-08-31)

### Bug Fixes

- decklink play command should not get null parameters ([7671a83](https://github.com/SuperFlyTV/casparcg-state/commit/7671a83))
- minTimeSincePlay is a public property and defaults to 150ms ([6c4be29](https://github.com/SuperFlyTV/casparcg-state/commit/6c4be29))

### Features

- loadbg routes ([401f3b0](https://github.com/SuperFlyTV/casparcg-state/commit/401f3b0))

<a name="1.2.0"></a>

# [1.2.0](https://github.com/SuperFlyTV/casparcg-state/compare/1.1.5...1.2.0) (2018-08-16)

### Bug Fixes

- default minTimeSIncePlay in ms ([acbda87](https://github.com/SuperFlyTV/casparcg-state/commit/acbda87))
- looping does not interfere with play / pause ([3141581](https://github.com/SuperFlyTV/casparcg-state/commit/3141581))

### Features

- native route command ([86f6298](https://github.com/SuperFlyTV/casparcg-state/commit/86f6298))

<a name="1.1.5"></a>

## [1.1.5](https://github.com/SuperFlyTV/casparcg-state/compare/1.1.4...1.1.5) (2018-08-10)

### Bug Fixes

- maintain background layer when a clip is played on foreground ([c1ccb9f](https://github.com/SuperFlyTV/casparcg-state/commit/c1ccb9f))

<a name="1.1.4"></a>

## [1.1.4](https://github.com/SuperFlyTV/casparcg-state/compare/1.1.3...1.1.4) (2018-08-07)

### Bug Fixes

- behaviour for empty foreground layers ([facf466](https://github.com/SuperFlyTV/casparcg-state/commit/facf466))

<a name="1.1.3"></a>

## [1.1.3](https://github.com/SuperFlyTV/casparcg-state/compare/1.1.2...1.1.3) (2018-08-03)

### Bug Fixes

- don't resend transitions that were set on the background layer ([4afe3d9](https://github.com/SuperFlyTV/casparcg-state/commit/4afe3d9))
- refactored handling of commands ([9398c51](https://github.com/SuperFlyTV/casparcg-state/commit/9398c51))

<a name="1.1.2"></a>

## [1.1.2](https://github.com/SuperFlyTV/casparcg-state/compare/1.1.1...1.1.2) (2018-08-02)

### Bug Fixes

- empty layers get stop command, not clear command ([08ad7ce](https://github.com/SuperFlyTV/casparcg-state/commit/08ad7ce))

<a name="1.1.1"></a>

## [1.1.1](https://github.com/SuperFlyTV/casparcg-state/compare/1.1.0...1.1.1) (2018-08-02)

<a name="1.1.0"></a>

# [1.1.0](https://github.com/SuperFlyTV/casparcg-state/compare/1.0.5...1.1.0) (2018-08-02)

### Bug Fixes

- logic around playing after loadbg ([2f219ac](https://github.com/SuperFlyTV/casparcg-state/commit/2f219ac))
- use resume command when possible ([82907cc](https://github.com/SuperFlyTV/casparcg-state/commit/82907cc))

### Features

- background/next routes ([ee241bd](https://github.com/SuperFlyTV/casparcg-state/commit/ee241bd))
- sting transition ([f5b8a47](https://github.com/SuperFlyTV/casparcg-state/commit/f5b8a47))
- support preloading ([903315d](https://github.com/SuperFlyTV/casparcg-state/commit/903315d))

<a name="1.0.5"></a>

## [1.0.5](https://github.com/SuperFlyTV/casparcg-state/compare/1.0.4...1.0.5) (2018-06-15)

<a name="1.0.4"></a>

## [1.0.4](https://github.com/SuperFlyTV/casparcg-state/compare/1.0.3...1.0.4) (2018-06-14)

<a name="1.0.3"></a>

## [1.0.3](https://github.com/SuperFlyTV/casparcg-state/compare/1.0.2...1.0.3) (2018-06-14)

### Bug Fixes

- added yarn publish --verbose to see why publish fails ([8a50fee](https://github.com/SuperFlyTV/casparcg-state/commit/8a50fee))

<a name="1.0.2"></a>

## [1.0.2](https://github.com/SuperFlyTV/casparcg-state/compare/1.0.1...1.0.2) (2018-06-14)

<a name="1.0.1"></a>

## [1.0.1](https://github.com/SuperFlyTV/casparcg-state/compare/1.0.0...1.0.1) (2018-06-10)

<a name="1.0.0"></a>

# [1.0.0](https://bitbucket.org/superflytv/casparcg-state/compare/0.1.1...1.0.0) (2018-06-09)

### Feat

- implemented tests for all mixerCommands ([b3108c4](https://bitbucket.org/superflytv/casparcg-state/commits/b3108c4))

### BREAKING CHANGES

- changed API to better reflekt casparcg-connection: mixer.blend => mixer.blendmode

<a name="0.1.1"></a>

## [0.1.1](https://bitbucket.org/superflytv/casparcg-state/compare/0.1.0...0.1.1) (2018-06-08)

### Bug Fixes

- remove private: true ([19b1469](https://bitbucket.org/superflytv/casparcg-state/commits/19b1469))

<a name="0.1.0"></a>

# [0.1.0](https://bitbucket.org/superflytv/casparcg-state/compare/v0.0.4...v0.1.0) (2018-06-08)

### Bug Fixes

- add circleCI badge ([26cdbef](https://bitbucket.org/superflytv/casparcg-state/commits/26cdbef))
- important standard-version update ([b501c87](https://bitbucket.org/superflytv/casparcg-state/commits/b501c87))
- resolve ts-related issues ([27cdf56](https://bitbucket.org/superflytv/casparcg-state/commits/27cdf56))
- set correct ssh fingerprint ([58c12f9](https://bitbucket.org/superflytv/casparcg-state/commits/58c12f9))
- update packages and format tslint.json ([a2ecbb5](https://bitbucket.org/superflytv/casparcg-state/commits/a2ecbb5))
- update scripts, script-info, devDeps, and contributors ([4942fbd](https://bitbucket.org/superflytv/casparcg-state/commits/4942fbd))

### Features

- add license ([afd8b6b](https://bitbucket.org/superflytv/casparcg-state/commits/afd8b6b))
- add missing files ([32007be](https://bitbucket.org/superflytv/casparcg-state/commits/32007be))
- added more tests and some minor fixes ([de8f3f7](https://bitbucket.org/superflytv/casparcg-state/commits/de8f3f7))
- added multiple tests and some minor fixes, typing & linting ([b84c433](https://bitbucket.org/superflytv/casparcg-state/commits/b84c433))
- added support for transition for Routes ([658ad0a](https://bitbucket.org/superflytv/casparcg-state/commits/658ad0a))
- added support for transitions for decklnik-input ([fa1a6c1](https://bitbucket.org/superflytv/casparcg-state/commits/fa1a6c1))
- Major refactoring ([14d27f4](https://bitbucket.org/superflytv/casparcg-state/commits/14d27f4))
