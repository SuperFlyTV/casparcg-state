# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

# [1.7.0](https://github.com/SuperFlyTV/casparcg-state/compare/1.6.0...1.7.0) (2019-04-11)


### Bug Fixes

* update dependencies ([e133436](https://github.com/SuperFlyTV/casparcg-state/commit/e133436))
* update dependencies + TS3 ([72b44da](https://github.com/SuperFlyTV/casparcg-state/commit/72b44da))


### Features

* add support for inPoint, seek, length & loop. ([3173c9e](https://github.com/SuperFlyTV/casparcg-state/commit/3173c9e))



<a name="1.6.0"></a>
# [1.6.0](https://github.com/SuperFlyTV/casparcg-state/compare/1.5.1...1.6.0) (2019-02-06)


### Features

* remove currentTime function and replacing it with time parameter, to allow for processing at multiple concurrent points in time. ([60553e0](https://github.com/SuperFlyTV/casparcg-state/commit/60553e0))



<a name="1.5.1"></a>
## [1.5.1](https://github.com/SuperFlyTV/casparcg-state/compare/1.5.0...1.5.1) (2018-12-16)



<a name="1.5.0"></a>
# [1.5.0](https://github.com/SuperFlyTV/casparcg-state/compare/1.4.3...1.5.0) (2018-12-13)


### Features

* channel_layout for ffmpeg and route producer ([2b1871f](https://github.com/SuperFlyTV/casparcg-state/commit/2b1871f))



<a name="1.4.3"></a>
## [1.4.3](https://github.com/SuperFlyTV/casparcg-state/compare/1.4.2...1.4.3) (2018-12-13)


### Bug Fixes

* lint error ([fb05381](https://github.com/SuperFlyTV/casparcg-state/commit/fb05381))
* update dependencies, linting & switch from nsp to yarn audit ([f07ba70](https://github.com/SuperFlyTV/casparcg-state/commit/f07ba70))



<a name="1.4.2"></a>
## [1.4.2](https://github.com/SuperFlyTV/casparcg-state/compare/1.4.1...1.4.2) (2018-11-23)


### Bug Fixes

* do not reload bg on stop command ([851147f](https://github.com/SuperFlyTV/casparcg-state/commit/851147f))
* only do loadbg empty if another clip was preloaded ([adf3e52](https://github.com/SuperFlyTV/casparcg-state/commit/adf3e52))



<a name="1.4.1"></a>
## [1.4.1](https://github.com/SuperFlyTV/casparcg-state/compare/1.4.0...1.4.1) (2018-11-19)


### Bug Fixes

* broken test ([9c7b60d](https://github.com/SuperFlyTV/casparcg-state/commit/9c7b60d))
* make transition obj type check more durable ([e5005fd](https://github.com/SuperFlyTV/casparcg-state/commit/e5005fd))
* transition obj building if type is uppercase sting ([d3c452e](https://github.com/SuperFlyTV/casparcg-state/commit/d3c452e))



<a name="1.4.0"></a>
# [1.4.0](https://github.com/SuperFlyTV/casparcg-state/compare/1.3.3...1.4.0) (2018-11-12)


### Bug Fixes

* lint error ([f3efb9c](https://github.com/SuperFlyTV/casparcg-state/commit/f3efb9c))
* lint error & updated yarn.lock file ([976a1f1](https://github.com/SuperFlyTV/casparcg-state/commit/976a1f1))


### Features

* added support & tests for clearing the nextUp / loadbg ([3e0ea2c](https://github.com/SuperFlyTV/casparcg-state/commit/3e0ea2c))
* order commands for execution time ([e99722a](https://github.com/SuperFlyTV/casparcg-state/commit/e99722a))



<a name="1.3.3"></a>
## [1.3.3](https://github.com/SuperFlyTV/casparcg-state/compare/1.3.2...1.3.3) (2018-09-22)


### Bug Fixes

* a route should not reload when it was preloaded ([6afa888](https://github.com/SuperFlyTV/casparcg-state/commit/6afa888))
* loadbg with loop + seek ([0c3daf0](https://github.com/SuperFlyTV/casparcg-state/commit/0c3daf0))



<a name="1.3.2"></a>
## [1.3.2](https://github.com/SuperFlyTV/casparcg-state/compare/1.3.1...1.3.2) (2018-09-11)



<a name="1.3.1"></a>
## [1.3.1](https://github.com/SuperFlyTV/casparcg-state/compare/1.3.0...1.3.1) (2018-08-31)


### Bug Fixes

* empty bg layer before loadbg'ing ([40654bc](https://github.com/SuperFlyTV/casparcg-state/commit/40654bc))



<a name="1.3.0"></a>
# [1.3.0](https://github.com/SuperFlyTV/casparcg-state/compare/1.2.0...1.3.0) (2018-08-31)


### Bug Fixes

* decklink play command should not get null parameters ([7671a83](https://github.com/SuperFlyTV/casparcg-state/commit/7671a83))
* minTimeSincePlay is a public property and defaults to 150ms ([6c4be29](https://github.com/SuperFlyTV/casparcg-state/commit/6c4be29))


### Features

* loadbg routes ([401f3b0](https://github.com/SuperFlyTV/casparcg-state/commit/401f3b0))



<a name="1.2.0"></a>
# [1.2.0](https://github.com/SuperFlyTV/casparcg-state/compare/1.1.5...1.2.0) (2018-08-16)


### Bug Fixes

* default minTimeSIncePlay in ms ([acbda87](https://github.com/SuperFlyTV/casparcg-state/commit/acbda87))
* looping does not interfere with play / pause ([3141581](https://github.com/SuperFlyTV/casparcg-state/commit/3141581))


### Features

* native route command ([86f6298](https://github.com/SuperFlyTV/casparcg-state/commit/86f6298))



<a name="1.1.5"></a>
## [1.1.5](https://github.com/SuperFlyTV/casparcg-state/compare/1.1.4...1.1.5) (2018-08-10)


### Bug Fixes

* maintain background layer when a clip is played on foreground ([c1ccb9f](https://github.com/SuperFlyTV/casparcg-state/commit/c1ccb9f))



<a name="1.1.4"></a>
## [1.1.4](https://github.com/SuperFlyTV/casparcg-state/compare/1.1.3...1.1.4) (2018-08-07)


### Bug Fixes

* behaviour for empty foreground layers ([facf466](https://github.com/SuperFlyTV/casparcg-state/commit/facf466))



<a name="1.1.3"></a>
## [1.1.3](https://github.com/SuperFlyTV/casparcg-state/compare/1.1.2...1.1.3) (2018-08-03)


### Bug Fixes

* don't resend transitions that were set on the background layer ([4afe3d9](https://github.com/SuperFlyTV/casparcg-state/commit/4afe3d9))
* refactored handling of commands ([9398c51](https://github.com/SuperFlyTV/casparcg-state/commit/9398c51))



<a name="1.1.2"></a>
## [1.1.2](https://github.com/SuperFlyTV/casparcg-state/compare/1.1.1...1.1.2) (2018-08-02)


### Bug Fixes

* empty layers get stop command, not clear command ([08ad7ce](https://github.com/SuperFlyTV/casparcg-state/commit/08ad7ce))



<a name="1.1.1"></a>
## [1.1.1](https://github.com/SuperFlyTV/casparcg-state/compare/1.1.0...1.1.1) (2018-08-02)



<a name="1.1.0"></a>
# [1.1.0](https://github.com/SuperFlyTV/casparcg-state/compare/1.0.5...1.1.0) (2018-08-02)


### Bug Fixes

* logic around playing after loadbg ([2f219ac](https://github.com/SuperFlyTV/casparcg-state/commit/2f219ac))
* use resume command when possible ([82907cc](https://github.com/SuperFlyTV/casparcg-state/commit/82907cc))


### Features

* background/next routes ([ee241bd](https://github.com/SuperFlyTV/casparcg-state/commit/ee241bd))
* sting transition ([f5b8a47](https://github.com/SuperFlyTV/casparcg-state/commit/f5b8a47))
* support preloading ([903315d](https://github.com/SuperFlyTV/casparcg-state/commit/903315d))



<a name="1.0.5"></a>
## [1.0.5](https://github.com/SuperFlyTV/casparcg-state/compare/1.0.4...1.0.5) (2018-06-15)



<a name="1.0.4"></a>
## [1.0.4](https://github.com/SuperFlyTV/casparcg-state/compare/1.0.3...1.0.4) (2018-06-14)



<a name="1.0.3"></a>
## [1.0.3](https://github.com/SuperFlyTV/casparcg-state/compare/1.0.2...1.0.3) (2018-06-14)


### Bug Fixes

* added yarn publish --verbose to see why publish fails ([8a50fee](https://github.com/SuperFlyTV/casparcg-state/commit/8a50fee))



<a name="1.0.2"></a>
## [1.0.2](https://github.com/SuperFlyTV/casparcg-state/compare/1.0.1...1.0.2) (2018-06-14)



<a name="1.0.1"></a>
## [1.0.1](https://github.com/SuperFlyTV/casparcg-state/compare/1.0.0...1.0.1) (2018-06-10)



<a name="1.0.0"></a>
# [1.0.0](https://bitbucket.org/superflytv/casparcg-state/compare/0.1.1...1.0.0) (2018-06-09)


### Feat

* implemented tests for all mixerCommands ([b3108c4](https://bitbucket.org/superflytv/casparcg-state/commits/b3108c4))


### BREAKING CHANGES

* changed API to better reflekt casparcg-connection: mixer.blend => mixer.blendmode



<a name="0.1.1"></a>
## [0.1.1](https://bitbucket.org/superflytv/casparcg-state/compare/0.1.0...0.1.1) (2018-06-08)


### Bug Fixes

* remove private: true ([19b1469](https://bitbucket.org/superflytv/casparcg-state/commits/19b1469))



<a name="0.1.0"></a>
# [0.1.0](https://bitbucket.org/superflytv/casparcg-state/compare/v0.0.4...v0.1.0) (2018-06-08)


### Bug Fixes

* add circleCI badge ([26cdbef](https://bitbucket.org/superflytv/casparcg-state/commits/26cdbef))
* important standard-version update ([b501c87](https://bitbucket.org/superflytv/casparcg-state/commits/b501c87))
* resolve ts-related issues ([27cdf56](https://bitbucket.org/superflytv/casparcg-state/commits/27cdf56))
* set correct ssh fingerprint ([58c12f9](https://bitbucket.org/superflytv/casparcg-state/commits/58c12f9))
* update packages and format tslint.json ([a2ecbb5](https://bitbucket.org/superflytv/casparcg-state/commits/a2ecbb5))
* update scripts, script-info, devDeps, and contributors ([4942fbd](https://bitbucket.org/superflytv/casparcg-state/commits/4942fbd))


### Features

* add license ([afd8b6b](https://bitbucket.org/superflytv/casparcg-state/commits/afd8b6b))
* add missing files ([32007be](https://bitbucket.org/superflytv/casparcg-state/commits/32007be))
* added more tests and some minor fixes ([de8f3f7](https://bitbucket.org/superflytv/casparcg-state/commits/de8f3f7))
* added multiple tests and some minor fixes, typing & linting ([b84c433](https://bitbucket.org/superflytv/casparcg-state/commits/b84c433))
* added support for transition for Routes ([658ad0a](https://bitbucket.org/superflytv/casparcg-state/commits/658ad0a))
* added support for transitions for decklnik-input ([fa1a6c1](https://bitbucket.org/superflytv/casparcg-state/commits/fa1a6c1))
* Major refactoring ([14d27f4](https://bitbucket.org/superflytv/casparcg-state/commits/14d27f4))
