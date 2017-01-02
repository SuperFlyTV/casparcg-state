'use strict';
var gulp        = require('gulp'),
    typescript  = require('typescript'),
    ts          = require('gulp-typescript'),
    del         = require('del'),
    typedoc     = require('gulp-typedoc');

var project = ts.createProject('tsconfig.json', {typescript: typescript});
var DIST_DIR = 'js/';

//statics
gulp.task('static', function () {
	//gulp
    //.src(['assets/**/*.*'])
    //.pipe(gulp.dest(DIST_DIR + '/assets'));
});

//compile
gulp.task('compile', function () {
  var tsResult = project.src() 
        .pipe(ts(project));

         tsResult.dts
			.pipe(gulp.dest(DIST_DIR));
            
    return tsResult.js
			.pipe(gulp.dest(DIST_DIR));
});

//watch
gulp.task('watch', function() {
  gulp.watch('src/**/*{.ts,.tsx}', ['compile']); 
});

//clean
gulp.task('clean', function () {
  return del([
    'js/**/*' 
  ]);
});

//dfault
gulp.task('default', ['watch', 'compile']); 
gulp.task('build', ['compile', 'static']);