/**
 * 工具方法
 */
const ethers = require('ethers');

module.exports = {
    /**
     * 根据token格式化BigNumber值
     * @param {BigNumber} value 需要格式化的值
     * @param {String} token token地址
     * @return {String}
     */
    formatTokenEther(value, token) {
        let ether = 'ether';
        if (token === process.env.USDT_CONTRACT_ADDRESSE.toLowerCase()) ether = 'mwei'; //  usdt使用mwei
        return ethers.utils.formatUnits(value.toString(), ether);
    },
    /**
     * 根据token将数字转化为BigNumber
     * @param {BigNumber} value 需要序列化的数字
     * @param {String} token token地址
     * @return {String}
     */
    parseTokenEther(value, token) {
        let ether = 'ether';
        if (token === process.env.USDT_CONTRACT_ADDRESSE.toLowerCase()) ether = 'mwei'; //  usdt使用mwei
        return ethers.utils.parseUnits(value.toString(), ether);
    },
    /**
     * BigNumber数字求和
     * @param {BigNumber} addend 加数
     * @param {String} summand 被加数
     * @param {String} token token地址
     * @return {BigNumber}
     */
    bigNumberSum(addend, summand, token) {
        let ether = 'ether';
        if (summand === 0) return addend;
        if (token === process.env.USDT_CONTRACT_ADDRESSE.toLowerCase()) ether = 'mwei'; //  usdt使用mwei
        summand = ethers.utils.parseUnits(summand.toString(), ether);
        addend = addend.add(summand);
        return addend;
    },
    /**
     * BigNumber乘积
     * @param {BigNumber} multiplier 乘数
     * @param {String} multiplicand 被乘数
     * @param {String} token token地址
     * @return {BigNumber}
     */
    bigNumberMul(multiplier, multiplicand = 1.1, token) {
        let ether = 'ether';
        multiplicand = Math.floor(multiplicand * 1000) / 1000; // 保留三位小数
        if (token === process.env.USDT_CONTRACT_ADDRESSE.toLowerCase()) ether = 'mwei'; //  usdt使用mwei
        multiplicand = ethers.utils.parseUnits(multiplicand.toString(), ether);
        multiplier = multiplier.mul(multiplicand);
        return multiplier;
    },
};
