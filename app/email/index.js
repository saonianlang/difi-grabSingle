/**
 * 每日消息邮件发送
 * @description 发送每日交易数据
 */
const nodemailer = require('nodemailer');
const {logger} = require('../middleware/logger');

class EmailMessage {
    constructor() {
        // QQ邮箱配置
        this.smtpTransport = nodemailer.createTransport({
            host: 'smtp.qq.com', // 主机
            secure: true,
            port: 465, // SMTP 端口
            auth: {
                user: '674622564@qq.com', // 账号
                pass: process.env.EMAIL_KEY, // 授权密码
            },
        });
    }

    /**
     * 发送今日邮件
     * @param {Object} today 今日收益数据
     * @param {Object} principal 本金数据
     */
    setTodayMessage(today, principal) {
        const content = `<!doctype html>
        <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml"
            xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style type="text/css">
                body {
                    margin: 0;
                    padding: 0;
                    -webkit-text-size-adjust: 100%;
                    -ms-text-size-adjust: 100%;
                    font-size: 14px;
                }
                table,
                td {
                    border-collapse: collapse;
                    mso-table-lspace: 0pt;
                    mso-table-rspace: 0pt;
                    border: 1px solid #eee;
                    color: #666;
                }
                table th {
                    color: #333;
                    padding: 10px;
                    font-weight: 600;
                }
                img {
                    border: 0;
                    height: auto;
                    line-height: 100%;
                    outline: none;
                    text-decoration: none;
                    -ms-interpolation-mode: bicubic;
                }
            </style>
        </head>
        <body style="background-color:#e0f2ff;">
            <div style="max-width: 600px;margin: 0 auto;background-color: #2a5cab;padding: 20px;color: #fff;">
                <table style="border: none;">
                    <tr>
                        <td style="border: none;"><img src="https://app.symblox.io/static/media/symblox-logo@2x.c05858ff.png" width="150" /></td>
                        <td style="padding: 0 20px;color: #fff;border: none;">矿池做市收益</td>
                    </tr>
                </table>
            </div>
            <div style="max-width: 600px;margin: 0 auto;padding: 20px;font-size: 16px;background-color: #fff;">
                <table style="width: 100%;">
                    <tr>
                        <th width="20%" align="center">SYX</th>
                        <th width="20%" align="center">VLX</th>
                        <th width="20%" align="center">USDT</th>
                        <th width="20%" align="center">ETH</th>
                        <th width="20%" align="center">年化收益率</th>
                    </tr>
                    <tr style="font-size: 15px;color: #000000;">
                        <td align="center" style="padding: 10px;color: #EC652D;">${(today.totalSyx - principal.syx).toFixed(2)}</td>
                        <td align="center" style="padding: 10px;color: #EC652D;">${(today.totalVlx - principal.vlx).toFixed(2)}</td>
                        <td align="center" style="padding: 10px;color: #EC652D;">${(today.totalUsdt - principal.usdt).toFixed(2)}</td>
                        <td align="center" style="padding: 10px;color: #EC652D;">${(today.totalEth - principal.eth).toFixed(2)}</td>
                        <td align="center" style="padding: 10px;color: #36B685;">${today.yearRate}%</td>
                    </tr>
                </table>
            </div>
            <div
                style="max-width: 600px;margin: 0 auto;padding: 20px;font-size: 18px;background-color: #fff;padding-bottom: 60px;">
                <table style="width: 100%;">
                    <tr>
                        <th width="20%" align="center">日期</th>
                        <th width="20%" align="center">类型</th>
                        <th width="20%" align="center">今日收益</th>
                        <th width="20%" align="center">今日收益</th>
                    </tr>
                    <tr style="font-size: 15px;color: #000000;">
                        <td rowspan="4" align="center" style="padding: 10px;">${today.date}</td>
                        <td align="center" style="padding: 10px;">SYX</td>
                        <td align="center" style="padding: 10px;color: #EC652D;">${today.syx.toFixed(2)}</td>
                        <td rowspan="4" align="center" style="padding: 10px;color: #36B685;">${today.dayRate}%</td>
                        
                    </tr>
                    <tr style="font-size: 15px;color: #000000;">
                        <td align="center" style="padding: 10px;">VLX</td>
                        <td align="center" style="padding: 10px;color: #EC652D;">${today.vlx.toFixed(2)}</td>
                    </tr>
                    <tr style="font-size: 15px;color: #000000;">
                        <td align="center" style="padding: 10px;">USDT</td>
                        <td align="center" style="padding: 10px;color: #EC652D;">${today.usdt.toFixed(2)}</td>
                    </tr>
                    <tr style="font-size: 15px;color: #000000;">
                        <td align="center" style="padding: 10px;">ETH</td>
                        <td align="center" style="padding: 10px;color: #EC652D;">${today.eth.toFixed(2)}</td>
                    </tr>
                </table>
            </div>
        </body>
        </html>`;
        this.sendMail(content);
    }
    // 发送邮件
    async sendMail(content) {
        try {
            const info = await this.smtpTransport.sendMail({
                from: '"Symblox搬运工" <674622564@qq.com>', // 发送者地址
                to: 'zr19911221@gmail.com', // 接收邮箱地址 多个以逗号隔开
                subject: '矿池做市收益',
                html: content, // 这里的html
            });
            if (!info) throw '邮件消息发送失败';
            logger.info(`--- 今日邮件发送成功 ---`);
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = EmailMessage;
