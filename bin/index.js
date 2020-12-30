'use strict';
const Wallet = require('../app/wallet');
const config = require('../config');
const GrabSingle = require('../app/controller/grabSingle');

if (!process.env.NETWORK_URL) require('dotenv').config({path: '.env'});

class App {
    constructor() {
        // 上下文对象
        const context = (exports = {});
        context.txStatus = false; // 交易开关，保证当前只有一笔交易进行执行
        context.config = config;
        const wallet = new Wallet(process.env.NETWORK_URL, process.env.PRIVATE_KEY);
        context.wallet = wallet;
        const grabSingle = new GrabSingle(context);
    }
}

module.exports = App;
