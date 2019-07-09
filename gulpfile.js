'use strict';
const   gulp = require('gulp');


gulp.task('js', function(){
    gulp.src('src/app.js')
    .pipe(gulp.dest('public'));
});

gulp.task('watch', function(){
    gulp.watch('src/app.js', ['js']);
});

gulp.task('build', ['js'], function(){
    console.log('build command');
    return
});

gulp.task('default', ['build']);



