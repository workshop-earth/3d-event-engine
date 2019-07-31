'use strict';
const   gulp	= require('gulp'),
        sass	= require('gulp-sass');


gulp.task('js', function(){
    console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    console.log('JS not minified; run `npm run ugly`');
    console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    gulp.src('src/js/app.js')
    .pipe(gulp.dest('public'));
});


gulp.task('css', function(){
    return gulp.src('src/scss/style.scss')
        .pipe(sass({
										outputStyle: 'compressed',
										includePaths: [
											'./node_modules/reset-css/sass/'
										]
									})
            .on('error', sass.logError))
        .pipe(gulp.dest('public'));
});

gulp.task('watch', function(){
    gulp.watch('src/js/app.js', ['js']);
    gulp.watch('src/scss/style.scss', ['css']);
    gulp.watch('data/*', ['build']);
});

gulp.task('data', function(){
    return gulp.src(['data/data.json',
                     'data/fault-data.json'])
        .pipe(gulp.dest('public'));
});

gulp.task('build', ['js', 'css', 'data'], function(){
    console.log('Building site...');
    return
});

gulp.task('default', ['build']);



