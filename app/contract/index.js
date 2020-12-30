/**
 * 智能合约
 * @description 链接智能合约
 */

const ethers = require('ethers');
const {bigNumberSum, bigNumberMul, formatTokenEther, parseTokenEther} = require('../utils/index');

class Contract {
    /**
     * 构造函数
     * @description 交易池模型 为三角形模型 A <-> B <-> C <-> A
     * @param {String} aAddr a交易池地址
     * @param {String} bAddr b交易池地址
     * @param {String} cAddr c交易池地址
     * @param {String} aToken a代币地址
     * @param {String} bToken b代币地址
     * @param {String} cToken c代币地址
     * @param {Object} abis 合约模型
     * @param {Object} wallet 钱包对象
     */
    constructor(aAddr, bAddr, cAddr, aToken, bToken, cToken, abis, wallet) {
        this.aToken = aToken;
        this.bToken = bToken;
        this.cToken = cToken;

        this.aAddr = aAddr;
        this.bAddr = bAddr;
        this.cAddr = cAddr;

        // 交易池合约创建
        this.aPoolContract = new ethers.Contract(aAddr, abis, wallet.wallet);
        this.bPoolContract = new ethers.Contract(bAddr, abis, wallet.wallet);
        this.cPoolContract = new ethers.Contract(cAddr, abis, wallet.wallet);
        // 代币合约创建
        this.aContract = new ethers.Contract(aToken, abis, wallet.wallet);
        this.bContract = new ethers.Contract(bToken, abis, wallet.wallet);
        this.cContract = new ethers.Contract(cToken, abis, wallet.wallet);

        this.wallet = wallet;
        this.gasNum = 1; // gas递增数
    }
    /**
     * 获取Gas价格
     * @param {Number} value 高于当前价格值
     */
    getCurrentGas(value = 1) {
        value = value + this.gasNum / 1000000000; // 添加随机数
        if (this.gasNum === 1000000000) this.gasNum = 0;
        this.gasNum += 1;
        const summand = ethers.utils.parseUnits(value.toString(), 'gwei');
        return this.wallet.maxGas.add(summand);
    }
    /**
     * 根据卖出数量计算出买入代币数量
     * @param {String} tokenIn 卖出方地址
     * @param {String} tokenOut 买入方地址
     * @param {BigNumber} sellAmount 卖出数量
     * @param {Contract} contract 交易池合约对象
     */
    calcOutGivenIn(tokenIn, tokenOut, sellAmount = 0, contract) {
        return new Promise(async (resolve, reject) => {
            try {
                const swapFee = await contract.getSwapFee(); // 交易手续费
                let balanceIn = await contract.getBalance(tokenIn);
                const denormIn = await contract.getDenormalizedWeight(tokenIn);
                let balanceOut = await contract.getBalance(tokenOut);
                const denormOut = await contract.getDenormalizedWeight(tokenOut);
                const res = await contract.calcOutGivenIn(balanceIn, denormIn, balanceOut, denormOut, sellAmount, swapFee);
                if (res) return resolve(formatTokenEther(res, tokenOut));
                reject(false);
            } catch (error) {
                reject(error);
            }
        });
    }
    /**
     * 根据买入代币数量算出卖出代币数量
     * @param {String} tokenIn 卖出方地址
     * @param {String} tokenOut 买入方地址
     * @param {BigNumber} buyAmount 买入数量
     * @param {Contract} contract 交易池合约对象
     */
    calcInGivenOut(tokenIn, tokenOut, buyAmount = 0, contract) {
        return new Promise(async (resolve, reject) => {
            try {
                const swapFee = await contract.getSwapFee(); // 交易手续费
                let balanceIn = await contract.getBalance(tokenIn);
                const denormIn = await contract.getDenormalizedWeight(tokenIn);
                let balanceOut = await contract.getBalance(tokenOut);
                const denormOut = await contract.getDenormalizedWeight(tokenOut);
                const res = await contract.calcInGivenOut(balanceIn, denormIn, balanceOut, denormOut, buyAmount, swapFee);
                if (res) return resolve(formatTokenEther(res, tokenIn));
                reject(false);
            } catch (error) {
                reject(error);
            }
        });
    }
    /**
     * 获取交易能接受的最大价格
     * 注：usdt合约交易长度为6位
     * @param {String} tokenIn 卖出方地址
     * @param {String} tokenOut 购买方地址
     * @param {String} amountIn 卖出的数量
     * @param {String} amountOut 买入的数量
     * @param {Contract} contract 交易池合约对象
     * @param {Number} rate 交易池合约对象
     */
    maxPrice(tokenIn, tokenOut, amountIn = 0, amountOut = 0, contract, rate = 0.1) {
        return new Promise(async (resolve, reject) => {
            try {
                if (rate > 0.1) rate = 0.1;
                // 交易手续费
                const swapFee = await contract.getSwapFee();
                // 获取卖出方余额
                let balanceIn = await contract.getBalance(tokenIn);
                // 加上卖出数量
                balanceIn = bigNumberSum(balanceIn, amountIn, tokenIn);
                const denormIn = await contract.getDenormalizedWeight(tokenIn);
                // 获取买入方余额
                let balanceOut = await contract.getBalance(tokenOut);
                // 加上买入数量
                balanceOut = bigNumberSum(balanceOut, amountOut, tokenOut);
                const denormOut = await contract.getDenormalizedWeight(tokenOut);
                const res = await contract.calcSpotPrice(balanceIn, denormIn, balanceOut, denormOut, swapFee);
                if (res) {
                    const maxPrice = bigNumberMul(res, 1 + rate, tokenIn);
                    return resolve(maxPrice.toString());
                }
                reject(false);
            } catch (error) {
                reject(error);
            }
        });
    }
    /**
     * 使用B置换A
     * @param {Number} value 买入数量
     * @param {Number} minNum 获得最小数量
     * @param {Number} nonce 区块链请求顺序
     * @param {Number} rate 收益率
     * @param {BigNumber} maxPrice 交易最大单价
     */
    inBToA(value = 0, minNum = 0, nonce, rate, gas, maxPrice) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!value || !nonce || !rate) return reject(false);
                value = parseFloat(value);
                if (!maxPrice) maxPrice = await this.maxPrice(this.bToken, this.aToken, value, 0, this.aPoolContract, rate);
                const num = parseTokenEther(value, this.bToken).toString();
                if (minNum) minNum = parseTokenEther(minNum, this.aToken).toString();
                const res = await this.aPoolContract.swapExactAmountInWTokenOut(this.bToken, num, minNum, maxPrice, {
                    gasPrice: gas,
                    nonce,
                }); // 进行交易
                if (res) return resolve(res);
                reject(false);
            } catch (error) {
                reject(error);
            }
        });
    }
    /**
     * 使用A置换b
     * @param {Number} value 买入数量
     * @param {Number} minNum 获得最小数量
     * @param {Number} nonce 区块链请求顺序
     * @param {Number} rate 收益率
     * @param {BigNumber} maxPrice 交易最大单价
     */
    inAToB(value = 0, minNum = 0, nonce, rate, gas, maxPrice) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!value || !nonce || !rate) return reject(false);
                value = parseFloat(value).toString();
                if (!maxPrice) maxPrice = await this.maxPrice(this.aToken, this.bToken, 0, value, this.aPoolContract, rate); // 交易能接受的最大价格
                const num = parseTokenEther(value, this.aToken).toString(); // 购买数量
                if (minNum) minNum = parseTokenEther(minNum.toString(), this.bToken).toString(); // 最小数量
                const res = await this.aPoolContract.swapWTokenAmountIn(this.bToken, minNum, maxPrice, {
                    value: num,
                    gasPrice: gas,
                    nonce,
                });
                if (res) return resolve(res);
                reject(false);
            } catch (error) {
                reject(error);
            }
        });
    }
    /**
     * 使用C置换B
     * @param {Number} value 买入数量
     * @param {Number} minNum 获得最小数量
     * @param {Number} nonce 区块链请求顺序
     * @param {Number} rate 收益率
     * @param {BigNumber} maxPrice 交易最大单价
     */
    inCToB(value = 0, minNum = 0, nonce, rate, gas, maxPrice) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!value || !nonce || !rate) return reject(false);
                value = parseFloat(value).toString();
                if (!maxPrice) maxPrice = await this.maxPrice(this.cToken, this.bToken, value, 0, this.bPoolContract, rate); // 交易能接受的最大价格
                const num = parseTokenEther(value, this.cToken).toString(); // 卖出数量
                if (minNum) minNum = parseTokenEther(minNum.toString(), this.bToken).toString(); // 最小数量
                const res = await this.bPoolContract.swapExactAmountIn(this.cToken, num, this.bToken, minNum, maxPrice, {
                    gasPrice: gas,
                    nonce,
                }); // 进行交易
                if (res) return resolve(res);
                reject(false);
            } catch (error) {
                reject(error);
            }
        });
    }
    /**
     * 使用B置换C
     * @param {Number} value 买入数量
     * @param {Number} minNum 获得最小数量
     * @param {Number} nonce 区块链请求顺序
     * @param {Number} rate 收益率
     * @param {BigNumber} maxPrice 交易最大单价
     */
    inBToC(value = 0, minNum = 0, nonce, rate, gas, maxPrice) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!value || !nonce || !rate) return reject(false);
                value = parseFloat(value).toString();
                if (!maxPrice) maxPrice = await this.maxPrice(this.bToken, this.cToken, value, 0, this.bPoolContract, rate); // 交易能接受的最大价格
                const num = parseTokenEther(value, this.bToken).toString(); // 卖出数量
                if (minNum) minNum = parseTokenEther(minNum.toString(), this.cToken).toString(); // 最小数量
                const res = await this.bPoolContract.swapExactAmountIn(this.bToken, num, this.cToken, minNum, maxPrice, {
                    gasPrice: gas,
                    nonce,
                }); // 进行交易
                if (res) return resolve(res);
                reject(false);
            } catch (error) {
                reject(error);
            }
        });
    }
    /**
     * 使用A置换C
     * @param {Number} value 买入数量
     * @param {Number} minNum 获得最小数量
     * @param {Number} nonce 区块链请求顺序
     * @param {Number} rate 收益率
     * @param {BigNumber} maxPrice 交易最大单价
     */
    inAToC(value = 0, minNum, nonce, rate, gas, maxPrice) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!value || !nonce || !rate) return reject(false);
                value = parseFloat(value).toString();
                if (!maxPrice) maxPrice = await this.maxPrice(this.aToken, this.cToken, value, 0, this.cPoolContract, rate); // 交易能接受的最大价格
                const num = parseTokenEther(value, this.aToken).toString(); // 卖出数量
                if (minNum) minNum = parseTokenEther(minNum, this.cToken).toString(); // 最小数量
                const res = await this.cPoolContract.swapWTokenAmountIn(this.cToken, minNum, maxPrice, {
                    value: num,
                    nonce,
                    gasPrice: gas,
                }); // 进行交易
                if (res) return resolve(res);
                reject(false);
            } catch (error) {
                reject(error);
            }
        });
    }
    /**
     * 使用C置换A
     * @param {Number} value 买入数量
     * @param {Number} minNum 获得最小数量
     * @param {Number} nonce 区块链请求顺序
     * @param {Number} rate 收益率
     * @param {BigNumber} maxPrice 交易最大单价
     */
    inCToA(value = 0, minNum = 0, nonce, rate, gas, maxPrice) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!value || !nonce || !rate) return reject(false);
                if (!maxPrice) maxPrice = await this.maxPrice(this.cToken, this.aToken, value, 0, this.cPoolContract, rate); // 交易能接受的最大价格
                const num = parseTokenEther(value, this.cToken).toString(); // 卖出数量
                if (minNum) minNum = parseTokenEther(minNum, this.aToken).toString(); // 最小数量
                const res = await this.cPoolContract.swapExactAmountInWTokenOut(this.cToken, num, minNum, maxPrice, {
                    gasPrice: gas,
                    nonce,
                }); // 进行交易
                if (res) return resolve(res);
                reject(false);
            } catch (error) {
                reject(error);
            }
        });
    }
    // 获取A交易池A/B总额
    getAPoolTotal() {
        return new Promise(async (resolve, reject) => {
            try {
                const a = await this.aContract.balanceOf(this.aAddr);
                const b = await this.bContract.balanceOf(this.aAddr);
                if (a && b) resolve({a, b});
                reject(false);
            } catch (error) {
                reject(error);
            }
        });
    }
    // 获取B交易池B/C总额
    getBPoolTotal() {
        return new Promise(async (resolve, reject) => {
            try {
                const b = await this.bContract.balanceOf(this.bAddr);
                const c = await this.cContract.balanceOf(this.bAddr);
                if (c && b) resolve({c, b});
                reject(false);
            } catch (error) {
                reject(error);
            }
        });
    }
    // 获取C交易池C/A总额
    getCPoolTotal() {
        return new Promise(async (resolve, reject) => {
            try {
                const a = await this.aContract.balanceOf(this.cAddr);
                const c = await this.cContract.balanceOf(this.cAddr);
                if (c && a) resolve({c, a});
                reject(false);
            } catch (error) {
                reject(error);
            }
        });
    }
    // 获取各池子单价
    poolPrice() {
        return new Promise(async (resolve, reject) => {
            try {
                const Aa = await this.aPoolContract.getSpotPrice(this.bToken, this.aToken);
                const Ab = await this.aPoolContract.getSpotPrice(this.aToken, this.bToken);
                const Bb = await this.bPoolContract.getSpotPrice(this.cToken, this.bToken);
                const Bc = await this.bPoolContract.getSpotPrice(this.bToken, this.cToken);
                const Cc = await this.cPoolContract.getSpotPrice(this.aToken, this.cToken);
                const Ca = await this.cPoolContract.getSpotPrice(this.cToken, this.aToken);
                if (Aa && Ab && Bb && Bc && Cc && Ca) {
                    return resolve({
                        Aa: parseFloat(formatTokenEther(Aa, this.bToken)),
                        Ab: parseFloat(formatTokenEther(Ab, this.aToken)),
                        Bb: parseFloat(formatTokenEther(Bb, this.cToken)),
                        Bc: parseFloat(formatTokenEther(Bc, this.bToken)),
                        Cc: parseFloat(formatTokenEther(Cc, this.aToken)),
                        Ca: parseFloat(formatTokenEther(Ca, this.cToken)),
                    });
                }
                reject(false);
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = Contract;
