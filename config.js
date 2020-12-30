'use strict';

const path = require('path');

module.exports = {
    CONTRACT: {
        syx: '0x01db6acfa20562ba835ae9f5085859580a0b1386',
        vlx: '0x2b1abeb48f875465bf0d3a262a2080ab1c7a3e39',
        eth: '0x380f73bad5e7396b260f737291ae5a8100baabcd',
        usdt: '0x4b773e1ae1baa4894e51cc1d1faf485c91b1012f',
    },
    PARAMTYPE: {
        swapExactAmountInWTokenOut: ['address', 'uint256', 'uint256', 'uint256'],
        swapWTokenAmountIn: ['address', 'uint256', 'uint256'],
        swapExactAmountIn: ['address', 'uint256', 'address', 'uint256', 'uint256'],
    },
    BPT: {
        vs: '0x7bd57dca1c703e068f4a0a3bc506612372ef7dc6',
        us: '0xf02f3959c0b52a337d0c662a123103618fd38f74',
        ve: '0xaa47d5475d89a837d61e0a33ce32ac31d3aaf0dd',
        se: '0x4f5d1990f667baa8f5d5a76282707508ad2def05',
        vu: '0x1fa22a3f8b36b5b24dee233fdac1114e930b9cda',
    },
    METHODCODE: {
        '21674b60': 'swapExactAmountInWTokenOut', // ERC20代币置换主链代币
        '5231fb89': 'swapWTokenAmountIn', // 主链代币置换ERC20代币
        '8201aa3f': 'swapExactAmountIn', // ERC20代币置换
    },
    WHITELIST: ['0xA622d71228A0025fB944740829b4077922D49762'], // 交易白名单
    LOG: {
        // 日志打印文件路径
        error: path.resolve(__dirname, './logs/error.log'),
        combined: path.resolve(__dirname, './logs/combined.log'),
    },
    AUTHORIZED_NUM: (() => {
        // 交易授权额度 1000000000000
        return 1000000000000 + Math.round(Math.random() * 10);
    })(),
    MONGODB: {
        // 数据库配置
        database: 'arbitrage',
        username: 'saonian',
        password: 'Abc123_',
        host: '127.0.0.1',
        port: 27017,
    },
};
