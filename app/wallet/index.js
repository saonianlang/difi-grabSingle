'use strict';
const ethers = require('ethers');
const BlockNode = require('./blockNode');
const config = require('../../config');
const {logger} = require('../middleware/logger');

class Wallet extends BlockNode {
    constructor(url, key) {
        super(url);
        // 钱包连接
        this.wallet = new ethers.Wallet(key, this.provider);
        logger.info('钱包初始化完成...');

        this.getBlockNumber();
    }
    // 获取最新的区块编号
    async getBlockNumber() {
        const blockNumber = await this.provider.getBlockNumber();
        logger.info(`当前区块高度：${blockNumber}`);
        return blockNumber;
    }
}
module.exports = Wallet;
