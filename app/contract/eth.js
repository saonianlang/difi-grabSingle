/**
 * Eth智能合约
 * @description 链接智能合约
 */

const ethers = require('ethers');
const {formatTokenEther, parseTokenEther} = require('../utils/index');
const Contract = require('./index');
const config = require('../../config');

class ContractEth extends Contract {
    constructor(aAddr, bAddr, cAddr, aToken, bToken, cToken, abis, wallet) {
        super(aAddr, bAddr, cAddr, aToken, bToken, cToken, abis, wallet);

        this.alias = {
            a: 'vlx',
            b: 'syx',
            c: 'eth',
        };
    }
    // 获取代币余额
    balance() {
        return new Promise(async (resolve, reject) => {
            try {
                const userAddr = this.wallet.wallet.address;
                const vlx = await this.wallet.wallet.getBalance();
                const syx = await this.bContract.balanceOf(userAddr);
                const eth = await this.cContract.balanceOf(userAddr);
                if (vlx && syx && eth)
                    return resolve({
                        a: parseFloat(formatTokenEther(vlx, this.aToken)),
                        b: parseFloat(formatTokenEther(syx, this.bToken)),
                        c: parseFloat(formatTokenEther(eth, this.cToken)),
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
                // se交易池授权
                let seSyx = await this.bContract.allowance(userAddr, this.bAddr);
                if (seSyx <= 0) seSyx = await this.bContract.approve(this.bAddr, authorizedNum);
                let seEth = await this.cContract.allowance(userAddr, this.bAddr);
                if (seEth <= 0) seEth = await this.cContract.approve(this.bAddr, authorizedNum);
                // ve交易池授权
                let veEth = await this.cContract.allowance(userAddr, this.cAddr);
                if (veEth <= 0) veEth = await this.cContract.approve(this.cAddr, authorizedNum);
                if (veEth && seSyx && seEth) return resolve([veEth.toString(), seSyx.toString(), seEth.toString()]);
                reject(false);
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = ContractEth;
