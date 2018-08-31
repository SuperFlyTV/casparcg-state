# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
