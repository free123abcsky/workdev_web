/*
* @Author: dmyang
* @Date:   2015-06-16 15:19:59
* @Last Modified by:   dmyang
* @Last Modified time: 2016-03-28 10:27:11
*/

'use strict';

let gulp = require('gulp');  //引入前端构建工具
let webpack = require('webpack'); //引入webpack模块加载器兼打包工具

let gutil = require('gulp-util')   //gulp工具模块

let webpackConf = require('./webpack.config')  //引入webpack模块配置文件
// let webpackDevConf = require('./webpack-dev.config')

let src = process.cwd() + '/src';   //process.cwd():返回运行当前脚本的工作目录的路径
let assets = process.cwd() + '/assets'

// js check
gulp.task('hint', () => {
    let jshint = require('gulp-jshint');  //js代码校验
    let stylish = require('jshint-stylish')

    return gulp.src([
            '!' + src + '/js/lib/**/*.js',
            src + '/js/**/*.js'
        ])
        .pipe(jshint())
        .pipe(jshint.reporter(stylish));
})

// clean assets
gulp.task('clean', ['hint'], () => {
    let clean = require('gulp-clean')

    return gulp.src(assets, {read: true}).pipe(clean())
})

// run webpack pack
gulp.task('pack', ['clean'], (done) => {
    webpack(webpackConf, (err, stats) => {
        if(err) throw new gutil.PluginError('webpack', err)
        gutil.log('[webpack]', stats.toString({colors: true}))
        done()
    })
})

// html process
gulp.task('default', ['pack'])
/*gulp.task('default', ['pack'], () => {
    let replace = require('gulp-replace')
    let htmlmin = require('gulp-htmlmin')

    return gulp
        .src(assets + '/*.html')
        // @see https://github.com/kangax/html-minifier
        .pipe(htmlmin({
            collapseWhitespace: true,
            removeComments: true
        }))
        .pipe(gulp.dest(assets))
})*/

// deploy assets to remote server
gulp.task('deploy', () => {
    let sftp = require('gulp-sftp')

    return gulp.src(assets + '/**')
        .pipe(sftp({
            host: '[remote server ip]',
            remotePath: '/www/app/',
            user: 'foo',
            pass: 'bar'
        }))
})
