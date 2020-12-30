const schedule = require('node-schedule');
const {logger} = require('../middleware/logger');
const IncomeService = require('../service/income');
const moment = require('moment');
const EmailMessage = require('../email/index');

/**
 * 收益统计任务
 */
class IncomeTask {
    constructor(context) {
        this.cxt = context;

        this.service = new IncomeService(context);

        this.subscribe();

        this.emailMessage = new EmailMessage();

        // 当前账号本金
        this.principal = {
            eth: 0,
            syx: 190,
            vlx: 20000,
            usdt: 200,
        };
    }
    // 任务执行
    subscribe() {
        // 定时任务开启
        const task = schedule.scheduleJob('0 59 23 * * *', () => this.getIncomeData());
    }
    // 获取今日数据
    getTodayData() {
        return new Promise(async (resolve, reject) => {
            try {
                // 获取我的代币余额
                const usdtbalance = await this.cxt.usdtContract.balance();
                const ethbalance = await this.cxt.ethContract.balance();
                if (!ethbalance || !usdtbalance) throw '获取账户余额失败';
                // 获取当前代币单价
                const usdtPoolPrice = await this.cxt.usdtContract.poolPrice();
                const ethPoolPrice = await this.cxt.ethContract.poolPrice();
                if (!ethPoolPrice || !usdtPoolPrice) throw '获取代币单价失败';
                // 当前账户余额
                const userBalance = {totalVlx: usdtbalance.a, totalSyx: usdtbalance.b, totalUsdt: usdtbalance.c, totalEth: ethbalance.c};
                const tokenPrice = {vlx: usdtPoolPrice.Ca, syx: usdtPoolPrice.Bb, usdt: 1, eth: usdtPoolPrice.Ca * (1 / ethPoolPrice.Ca)};
                const balance = {vlx: usdtbalance.a, syx: usdtbalance.b, usdt: usdtbalance.c, eth: ethbalance.c};
                resolve({
                    userBalance,
                    balance,
                    tokenPrice,
                });
            } catch (error) {
                reject(false);
                logger.error(error);
            }
        });
    }
    // 获取相关数据
    async getIncomeData() {
        try {
            // 获取今日数据
            const todayData = await this.getTodayData();
            if (!todayData) throw '获取今日数据失败';
            const yesterdayJson = await this.service.getYesterday();
            if (!yesterdayJson) throw '获取昨日数据失败';
            const {userBalance, tokenPrice, balance} = todayData;
            const {data, count} = yesterdayJson;
            const today = {...userBalance};
            // 今日盈利数据
            today.syx = userBalance.totalSyx - data.totalSyx;
            today.vlx = userBalance.totalVlx - data.totalVlx;
            today.eth = userBalance.totalEth - data.totalEth;
            today.usdt = userBalance.totalUsdt - data.totalUsdt;
            // 日收益率
            today.dayRate = ((this.getTokenUsdt(today, tokenPrice) / this.getTokenUsdt(this.principal, tokenPrice)) * 100).toFixed(2);
            // 年收益率
            today.yearRate = ((this.getTokenUsdt(balance, tokenPrice) / this.getTokenUsdt(this.principal, tokenPrice) / count) * 365 * 100).toFixed(
                2
            );
            // 设置日期
            today.date = moment().format('YYYY-MM-DD');
            const res = await this.service.setIncome(today);
            if (res) logger.info(`--- ${today.date} 收益保存成功 ---`);
            // 发送今日收益邮件
            this.emailMessage.setTodayMessage(today, this.principal);
        } catch (error) {
            logger.error(error);
        }
    }
    // 计算代币转化成usdt的价值
    getTokenUsdt(token, price) {
        return token.vlx * price.vlx + token.syx * price.syx + token.usdt + token.eth * price.eth;
    }
}

module.exports = IncomeTask;
