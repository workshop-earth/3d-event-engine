'use strict';
const   gulp	= require('gulp'),
        sass	= require('gulp-sass');


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

gulp.task('watch', function(){
    gulp.watch('src/scss/style.scss', ['css']);
});


gulp.task('build', ['css'], function(){
    console.log('Building site...');
    return
});

gulp.task('default', ['build']);