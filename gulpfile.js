'use strict';
const	gulp	= require('gulp'),
			sass	= require('gulp-sass');


gulp.task('js', function(){
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
    gulp.watch('data/data.json', ['build']);
});

gulp.task('build', ['js', 'css'], function(){
    console.log('Building site...');
    return
});

gulp.task('default', ['build']);



