'use strict';

module.exports = {
    name: 'income',
    schema: {
        uuid: String,
        syx: Number,
        vlx: Number,
        eth: Number,
        usdt: Number,
        dayRate: Number,
        yearRate: Number,
        totalVlx: Number,
        totalSyx: Number,
        totalUsdt: Number,
        totalEth: Number,
        date: String,
        createdTime: {type: Date, default: Date.now},
        updateTime: {type: Date, default: Date.now},
    },
    timestamps: {createdAt: 'createdTime', updatedAt: 'updateTime'},
};
