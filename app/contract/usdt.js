/**
 * Usdt智能合约
 * @description 链接智能合约
 */

const ethers = require('ethers');
const {formatTokenEther, parseTokenEther} = require('../utils/index');
const Contract = require('./index');
const config = require('../../config');

class UsdtContract extends Contract {
    constructor(aAddr, bAddr, cAddr, aToken, bToken, cToken, abis, wallet) {
        super(aAddr, bAddr, cAddr, aToken, bToken, cToken, abis, wallet);

        this.alias = {
            a: 'vlx',
            b: 'syx',
            c: 'usdt',
        };
    }
    // 获取代币余额
    balance() {
        return new Promise(async (resolve, reject) => {
            try {
                const userAddr = this.wallet.wallet.address;
                const vlx = await this.wallet.wallet.getBalance();
                const syx = await this.bContract.balanceOf(userAddr);
                const usdt = await this.cContract.balanceOf(userAddr);
                if (vlx && syx && usdt)
                    return resolve({
                        a: parseFloat(formatTokenEther(vlx, this.aToken)),
                        b: parseFloat(formatTokenEther(syx, this.bToken)),
                        c: parseFloat(formatTokenEther(usdt, this.cToken)),
                    });
                reject(false);
            } catch (error) {
                reject(error);
            }
        });
    }
    // 交易合约代币授权
    approve() {
        return new Promise(async (resolve, reject) => {
            try {
                const authorizedNum = parseTokenEther(config.AUTHORIZED_NUM).toString();
                const userAddr = this.wallet.wallet.address;
                // vlx交易池授权
                let vsSyx = await this.bContract.allowance(userAddr, this.aAddr);
                if (vsSyx <= 0) vsSyx = await this.bContract.approve(this.aAddr, authorizedNum);
                // usdt交易池授权
                let usSyx = await this.bContract.allowance(userAddr, this.bAddr);
                if (usSyx <= 0) usSyx = await this.bContract.approve(this.bAddr, authorizedNum);
                let usUsdt = await this.cContract.allowance(userAddr, this.bAddr);
                if (usUsdt <= 0) usUsdt = await this.cContract.approve(this.bAddr, authorizedNum);
                // VU交易池授权
                let vuUsdt = await this.cContract.allowance(userAddr, this.cAddr);
                if (vuUsdt <= 0) vuUsdt = await this.cContract.approve(this.cAddr, authorizedNum);
                if (vsSyx && usSyx && usUsdt && vuUsdt) return resolve([vsSyx.toString(), usSyx.toString(), usUsdt.toString(), vuUsdt.toString()]);
                reject(false);
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = UsdtContract;
