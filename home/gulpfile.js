'use strict';
const   gulp	= require('gulp'),
        sass	= require('gulp-sass'),
        handlebars      = require('handlebars'),
        compilehbs      = require('gulp-compile-handlebars'),
        layouts         = require('handlebars-layouts'),
        rename          = require('gulp-rename'),
        data            = require('./data/site.json');


gulp.task('css', function(){
    return gulp.src('src/scss/style.scss')
        .pipe(sass({
										outputStyle: 'compressed',
										includePaths: [
											'./node_modules/reset-css/sass/'
										]
									})
            .on('error', sass.logError))
        .pipe(gulp.dest('built'));
});


gulp.task('hbs', function(){
    gulp.src('src/hbs/**/*.hbs')
        .pipe(compilehbs(data.site, {
                            ignorePartials: true,
                            batch: 'src/hbs/partials',
                            helpers: {}
                        }))
        .pipe(rename({
            extname: '.html'
        }))
    .pipe(gulp.dest('../'));
});


gulp.task('watch', function(){
    gulp.watch('src/scss/style.scss', ['css']);
    gulp.watch('src/hbs/**/*.hbs', ['hbs']);
});


gulp.task('build', ['css', 'hbs'], function(){
    console.log('Building site...');
    return
});

gulp.task('default', ['build']);