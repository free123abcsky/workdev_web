/*
 * @Author: dmyang
 * @Date:   2015-05-18 14:16:41
 * @Last Modified by:   dmyang
 * @Last Modified time: 2016-02-04 14:24:58
 */

'use strict';
let path = require('path')
let fs = require('fs')

let webpack = require('webpack')
//let _ = require('lodash')
let glob = require('glob')

let ExtractTextPlugin = require('extract-text-webpack-plugin'); //将css成生文件，而非内联
let HtmlWebpackPlugin = require('html-webpack-plugin');  //生成html文件

let UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;  //压缩文件
let CommonsChunkPlugin = webpack.optimize.CommonsChunkPlugin;  //多个html共用一个js文件(chunk)

let srcDir = path.resolve(process.cwd(), 'src');
let assets = path.resolve(process.cwd(), 'assets')
let nodeModPath = path.resolve(__dirname, './node_modules')
let pathMap = require('./src/pathmap.json')

let entries = (() => {
    let jsDir = path.resolve(srcDir, 'js')
    let entryFiles = glob.sync(jsDir + '/*.{js,jsx}'); //同步获取匹配文件列表
    let files = {};

    entryFiles.forEach((filePath) => {
        let filename = filePath.substring(filePath.lastIndexOf('\/') + 1, filePath.lastIndexOf('.'))
        files[filename] = filePath
    })

    return files
})();
let chunks = Object.keys(entries)

// 这里publicPath要使用绝对路径，不然scss/css最终生成的css图片引用路径是错误的，应该是scss-loader的bug
let publicPath = '/'
let extractCSS
let cssLoader
let sassLoader

// generate entry html files
// 自动生成入口文件，入口js名必须和入口文件名相同
// 例如，a页的入口文件是a.html，那么在js目录下必须有一个a.js作为入口文件
let plugins = (() => {
    let entryHtml = glob.sync(srcDir + '/*.html')
    let r = []

    entryHtml.forEach((filePath) => {
        let filename = filePath.substring(filePath.lastIndexOf('\/') + 1, filePath.lastIndexOf('.'))
        let conf = {
            template: 'html!' + filePath,
            filename: filename + '.html'
        }

        if(filename in entries) {
            conf.inject = 'body'
            conf.chunks = ['vendors', 'common', filename]
        }
        if(/b|c/.test(filename)) conf.chunks.splice(2, 0, 'common-b-c')

        r.push(new HtmlWebpackPlugin(conf))
    })

    return r
})();

// 提取CSS文件
extractCSS = new ExtractTextPlugin('css/[name].css?[contenthash]')
cssLoader = extractCSS.extract(['css'])
sassLoader = extractCSS.extract(['css', 'sass'])
plugins.push(extractCSS, new webpack.HotModuleReplacementPlugin())


let config = {
    //入口文件配置
    entry: Object.assign(entries, {
        // 用到什么公共lib（例如React.js），就把它加进vendors去，目的是将公用库单独提取打包
        'vendors': ['zepto']
    }),
    //文件导出的配置
    output: {
        path: assets, // 编译好的文件目录
        filename: '[name].js',  //资源命名规则
        chunkFilename: '[chunkhash:8].chunk.js',  //公共js打包后输出的命名
        hotUpdateChunkFilename:'[id].js',
        publicPath: publicPath  // 静态资源的公共路径, 比如线上CDN地址等
    },
    //当requrie的模块找不到时，添加这些后缀
    resolve: {
        root: [srcDir, nodeModPath],
        alias: pathMap,
        extensions: ['', '.js', '.css', '.scss', '.tpl', '.png', '.jpg']
    },
    //模块loaders配置
    module: {
        loaders: [
            {
                test: /\.((woff2?|svg)(\?v=[0-9]\.[0-9]\.[0-9]))|(woff2?|svg|jpe?g|png|gif|ico)$/,
                loaders: [
                    // url-loader更好用，小于10KB的图片会自动转成dataUrl，
                    // 否则则调用file-loader，参数直接传入
                    'url?limit=10000&name=img/[hash:8].[name].[ext]',
                    'image?{bypassOnDebug:true, progressive:true,optimizationLevel:3,pngquant:{quality:"65-80",speed:4}}'
                ]
            },
            {
                test: /\.((ttf|eot)(\?v=[0-9]\.[0-9]\.[0-9]))|(ttf|eot)$/,
                loader: 'url?limit=10000&name=fonts/[hash:8].[name].[ext]'
            },
            {test: /\.(tpl|ejs)$/, loader: 'ejs'},
            {test: /\.css$/, loader: cssLoader},
            {test: /\.scss$/, loader: sassLoader},
            {test: /\.jsx?$/, loader: 'babel?presets[]=react,presets[]=es2015'}
        ]
    },
    //使用插件的配置
    plugins: [

        //公共库
        new CommonsChunkPlugin({
            name: 'common-b-c',
            chunks: ['b', 'c']
        }),
        new CommonsChunkPlugin({
            name: 'common',
            chunks: ['common-b-c', 'a']
        }),
        new CommonsChunkPlugin({
            name: 'vendors',
            chunks: ['common']
        })
    ].concat(plugins),

    devServer: {
        hot: true,
        noInfo: false,
        inline: true,
        publicPath: publicPath,
        stats: {
            cached: false,
            colors: true
        }
    }
}

// 为实现webpack-hot-middleware做相关配置
// @see https://github.com/glenjamin/webpack-hot-middleware
let hotMiddlewareSet = ((entry) => {
    for (let key of Object.keys(entry)) {
        if (! Array.isArray(entry[key])) {
            entry[key] = Array.of(entry[key])
        }
        entry[key].push('webpack-hot-middleware/client?reload=true')
    }
})(config.entry)

config.plugins.push( new webpack.HotModuleReplacementPlugin() )
config.plugins.push( new webpack.NoErrorsPlugin() );

module.exports = config
