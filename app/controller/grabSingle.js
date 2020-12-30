'use strict';
const {logger} = require('../middleware/logger');
const config = require('../../config');
const ethers = require('ethers');
const {formatTokenEther, parseTokenEther} = require('../utils/index');
const BPool = require('../contract/abis/BPool.json');
const EthContract = require('../contract/eth');
const UsdtContract = require('../contract/usdt');

/**
 * 处理Eth合约线路
 */
class GrabSingleController {
    constructor(context) {
        // 用户池子id对应结果池的名称
        this.poolIdName = ['vs', 'us', 'vu', 've', 'se'];

        this.ctx = context;

        this.wallet = context.wallet;

        // ETH合约对象
        this.ethContract = new EthContract(
            process.env.VS_BPT_ADDRESSE,
            process.env.SE_BPT_ADDRESSE,
            process.env.VE_BPT_ADDRESSE,
            process.env.WVLX_CONTRACT_ADDRESSE,
            process.env.SYX_CONTRACT_ADDRESSE,
            process.env.WETH_CONTRACT_ADDRESSE,
            BPool,
            this.wallet
        );

        // USDT合约对象
        this.usdtContract = new UsdtContract(
            process.env.VS_BPT_ADDRESSE,
            process.env.US_BPT_ADDRESSE,
            process.env.VU_BPT_ADDRESSE,
            process.env.WVLX_CONTRACT_ADDRESSE,
            process.env.SYX_CONTRACT_ADDRESSE,
            process.env.USDT_CONTRACT_ADDRESSE,
            BPool,
            this.wallet
        );

        // 池子交易对
        this.poolTwain = {
            vu: {
                pool: this.usdtContract.cPoolContract,
                correct: [process.env.WVLX_CONTRACT_ADDRESSE, process.env.USDT_CONTRACT_ADDRESSE],
            },
            vs: {
                pool: this.usdtContract.aPoolContract,
                correct: [process.env.WVLX_CONTRACT_ADDRESSE, process.env.SYX_CONTRACT_ADDRESSE],
            },
            us: {
                pool: this.usdtContract.bPoolContract,
                correct: [process.env.USDT_CONTRACT_ADDRESSE, process.env.SYX_CONTRACT_ADDRESSE],
            },
            ve: {
                pool: this.ethContract.cPoolContract,
                correct: [process.env.WVLX_CONTRACT_ADDRESSE, process.env.WETH_CONTRACT_ADDRESSE],
            },
            se: {
                pool: this.ethContract.bPoolContract,
                correct: [process.env.SYX_CONTRACT_ADDRESSE, process.env.WETH_CONTRACT_ADDRESSE],
            },
        };
        // 监听内存池交易
        context.wallet.provider.on('pending', (tx) => {
            if (!this.ctx.txStatus) this.parseTransaction(tx);
        });
    }
    // 解析交易请求
    async parseTransaction(transaction) {
        try {
            const {to, from, data, value, gasPrice} = transaction;
            // 判断白名单
            if (this.isWhitelist(from)) return false;
            // 获取交易方法
            const methodName = this.getMethodName(data);
            if (!methodName) return false;
            // 获取池子名称
            const poolName = await this.getPoolName(to);
            if (!poolName) return false;
            this.ctx.txStatus = true;
            // 获取交易数值
            const parseData = this.parseData(data, methodName, value);
            // 交易信息
            const transactionDetail = {
                gasPrice,
                value: parseData.value,
                maxPrice: parseData.maxPrice,
                to,
                methodName,
                poolName,
                inToken: parseData.inToken,
            };
            // 交易执行方法
            const transactionMethod = this.getTransactionMethod(methodName, parseData.inToken, poolName);
            // 发送抢单交易
            this.sendTransaction(transactionDetail, transactionMethod);
        } catch (error) {
            this.ctx.txStatus = false;
            logger.error(error);
        }
    }
    // 发送抢单交易
    async sendTransaction(detail, method) {
        try {
            const balance = await this.balance();
            if (!balance) throw '余额获取失败';
            const userBalance = balance[detail.inToken];
            if (detail.value > userBalance) detail.value = userBalance;
            if (detail.value <= 0) throw '余额不足抢单失败';
            const nonce = await this.wallet.wallet.getTransactionCount();
            if (!nonce) throw '获取交易nonce失败';
            const gasPrice = detail.gasPrice.add(ethers.utils.parseUnits('5', 'gwei'));
            logger.info(
                `抢单调用方法：${detail.methodName} 值：${detail.value} 执行方法：${method.sendMethodName} 手续费：${ethers.utils.formatUnits(
                    gasPrice,
                    'gwei'
                )}`
            );
            const res = await method.contract[method.sendMethodName](detail.value, 0, nonce, 0.1, gasPrice, detail.maxPrice);
            const complete = await res.wait();
            if (!complete) throw `抢单交易失败`;
            this.redemptionTransaction(detail, method, nonce + 1, balance);
        } catch (error) {
            this.ctx.txStatus = false;
            logger.error(error);
        }
    }
    // 发送赎回交易
    async redemptionTransaction(detail, method, nonce, balance) {
        try {
            const value = await this.calcOutGiven(detail.value, detail.inToken, detail.poolName, method.contract, detail.methodName);
            if (!value) throw '计算赎回数据失败';
            logger.info(`赎回调用值：${value} 执行方法：${method.redemptionMethodName} 手续费：${ethers.utils.formatUnits(detail.gasPrice, 'gwei')}`);
            const res = await method.contract[method.redemptionMethodName](value, 0, nonce, 0.1, detail.gasPrice);
            const complete = await res.wait();
            if (!complete) throw `赎回交易失败`;
            logger.info('--- 抢单交易成功 ---');
            const newBalance = await this.balance();
            if (!newBalance) throw '最新余额获取失败';
            const profit = newBalance[detail.inToken] - newBalance[detail.inToken];
            const tokenName = this.tokenName(detail.inToken);
            logger.info(`--- 当前交易盈利${profit} ${tokenName}---`);
            this.ctx.txStatus = false;
        } catch (error) {
            this.ctx.txStatus = false;
            logger.error(error);
        }
    }
    /**
     * 获取代币名称
     * @param {String} token 代币地址
     */
    tokenName(token) {
        for (const key in config.CONTRACT) {
            if (Object.hasOwnProperty.call(config.CONTRACT, key)) {
                const element = config.CONTRACT[key];
                if (element.toLowerCase() === token.toLowerCase()) return key;
            }
        }
        return '';
    }
    // 获取抢单交易方法
    getTransactionMethod(methodName, inToken, poolName) {
        let cAddr = '';
        let contract = null;
        if (poolName.indexOf('e') === -1) {
            cAddr = this.usdtContract.cToken.toLowerCase();
            contract = this.usdtContract;
        } else {
            cAddr = this.ethContract.cToken.toLowerCase();
            contract = this.ethContract;
        }
        const bAddr = this.ethContract.bToken.toLowerCase();
        let sendMethodName = '';
        let redemptionMethodName = '';
        if (methodName === 'swapExactAmountInWTokenOut') {
            if (inToken === bAddr) {
                sendMethodName = 'inBToA';
                redemptionMethodName = 'inAToB';
            } else {
                sendMethodName = 'inCToA';
                redemptionMethodName = 'inAToC';
            }
        } else if (methodName === 'swapWTokenAmountIn') {
            if (inToken === bAddr) {
                sendMethodName = 'inAToB';
                redemptionMethodName = 'inBToA';
            } else {
                sendMethodName = 'inAToC';
                redemptionMethodName = 'inCToA';
            }
        } else {
            if (inToken === bAddr) {
                sendMethodName = 'inBToC';
                redemptionMethodName = 'inCToB';
            } else {
                sendMethodName = 'inCToB';
                redemptionMethodName = 'inBToC';
            }
        }
        return {
            redemptionMethodName,
            sendMethodName,
            contract,
        };
    }
    /**
     * 解析data数据
     * @param {String} data 需要解析的data数据
     * @param {String} type 解析交易类型
     * @param {Bi} value 解析交易类型
     */
    parseData(data, type, value) {
        const original = ethers.utils.defaultAbiCoder.decode(config.PARAMTYPE[type], ethers.utils.hexDataSlice(data, 4));
        const tx = {};
        const inToken = original[0].toLowerCase();
        if (type === 'swapWTokenAmountIn') {
            tx.maxPrice = original[2].toString();
            tx.value = formatTokenEther(value);
        } else if (type === 'swapExactAmountInWTokenOut') {
            tx.maxPrice = original[3].toString();
            tx.value = formatTokenEther(original[1], inToken);
        } else {
            tx.maxPrice = original[4].toString();
            tx.value = formatTokenEther(original[1], inToken);
        }
        tx.inToken = inToken;
        return tx;
    }
    // 获取池子名称
    getPoolName(token) {
        for (const key in config.BPT) if (config.BPT[key].toLowerCase() === token.toLowerCase()) return key;
        return '';
    }
    // 获取当前操作方法名
    getMethodName(data) {
        for (const code in config.METHODCODE) if (data.indexOf(code) !== -1) return config.METHODCODE[code];
        return '';
    }
    // 判断交易白名单
    isWhitelist(token) {
        for (let index = 0; index < config.WHITELIST.length; index++) {
            const element = config.WHITELIST[index];
            if (element.toLowerCase() === token) return true;
        }
        return false;
    }
    // 获取今日账户余额
    balance() {
        return new Promise(async (resolve, reject) => {
            try {
                // 获取我的代币余额
                const usdtbalance = await this.usdtContract.balance();
                const ethbalance = await this.ethContract.balance();
                if (!ethbalance || !usdtbalance) throw '获取账户余额失败';
                const balance = {};
                balance[process.env.WVLX_CONTRACT_ADDRESSE.toLowerCase()] = usdtbalance.a;
                balance[process.env.SYX_CONTRACT_ADDRESSE.toLowerCase()] = ethbalance.b;
                balance[process.env.USDT_CONTRACT_ADDRESSE.toLowerCase()] = usdtbalance.c;
                balance[process.env.WETH_CONTRACT_ADDRESSE.toLowerCase()] = ethbalance.c;
                resolve(balance);
            } catch (error) {
                reject(error);
            }
        });
    }
    /**
     * 计算卖出一种代币所得另一种代币数量
     * @param {Number} value 交易数量
     * @param {String} token 卖出token地址
     * @param {String} pool 池子对象key
     * @param {Contract} contract 合约对象
     * @param {String} methodName 方法名称
     */
    calcOutGiven(value, token, poolType, contract, methodName) {
        return new Promise(async (resolve, reject) => {
            try {
                const currentPool = this.poolTwain[poolType];
                const correct = currentPool.correct;
                const index = correct.findIndex((item) => item.toLowerCase() === token.toLowerCase());
                if (index === 1) correct.reverse();
                if (methodName === 'swapWTokenAmountIn') correct.reverse();
                const pool = currentPool.pool;
                value = parseTokenEther(value, correct[0]);
                const num = await contract.calcOutGivenIn(correct[0], correct[1], value, pool);
                if (!num) return reject(false);
                resolve(parseFloat(num));
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = GrabSingleController;
