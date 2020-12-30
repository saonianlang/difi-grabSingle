const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose'); //引用mongoose模块
const config = require('../../config');
const {logger} = require('../middleware/logger');

let url = 'mongodb://' + config.MONGODB.host + ':' + config.MONGODB.port + '/' + config.MONGODB.database;
var mongo = mongoose.createConnection(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    user: config.MONGODB.username,
    pass: config.MONGODB.password,
}); //创建一个数据库连接

let db = {
    mongoose: mongoose,
    mongo: mongo,
    models: {},
};
// 错误
mongo.on('error', function (err) {
    logger.error(new Error(err));
});

// 开启
mongo.once('open', function () {
    logger.info('mongo数据库连接成功...');
});

// 整合models文件下的其他js文件
fs.readdirSync(__dirname)
    .filter(function (file) {
        return file.indexOf('.') !== 0 && file !== 'index.js';
    })
    .forEach(function (file) {
        var modelFile = require(path.join(__dirname, file));
        var schema = new mongoose.Schema(modelFile.schema);
        db.models[modelFile.name] = mongo.model(modelFile.name, schema, modelFile.name);
    });

// 根据name选择model
db.getModel = function (name) {
    return this.models[name];
};

module.exports = db;
