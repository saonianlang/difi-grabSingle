'use strict';
const ethers = require('ethers');
const BLOCK_NODE = Symbol('Config#BLOCK_NODE');
const {logger} = require('../middleware/logger');

class BlockNode {
    constructor(url, timeOut) {
        // 节点连接
        this.provider = new ethers.providers.JsonRpcProvider({
            url: url || BLOCK_NODE.url, // 不指定连接区块地址，默认连接主配置地址
            timeout: timeOut || BLOCK_NODE.timeOut,
        });
        logger.info('已连接区块节点...');
    }
}
module.exports = BlockNode;
