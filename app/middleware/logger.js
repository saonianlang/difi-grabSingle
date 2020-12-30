'use strict';
/**
 * 日志系统
 */

const winston = require('winston');
const {combine, timestamp, printf} = winston.format;
const config = require('../../config');

const customFormat = printf((info) => {
    let {message} = info;
    if (typeof message === 'object') {
        let cache = [];
        message = JSON.stringify(message, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (cache.indexOf(value) !== -1) {
                    // Duplicate reference found
                    try {
                        // If this value does not reference a parent it can be deduped
                        return JSON.parse(JSON.stringify(value));
                    } catch (error) {
                        // discard key if value cannot be deduped
                        return undefined;
                    }
                }
                // Store value in our collection
                cache.push(value);
            }
            return value;
        });
        cache = [];
    }
    return `> ${info.timestamp} ${info.level}: ${message}`;
});

const logger = winston.createLogger({
    level: 'debug',
    format: combine(
        winston.format.colorize(),
        timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        }),
        customFormat
    ),
    transports: [
        new winston.transports.File({filename: config.LOG.error, level: 'error'}),
        new winston.transports.File({filename: config.LOG.combined, level: 'info'}),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console());
}

module.exports = {
    logger,
};
