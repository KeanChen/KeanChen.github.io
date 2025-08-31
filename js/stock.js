/**
 * 股票价格获取和显示功能
 * 获取贵州茅台(600519.SH)和腾讯控股(00700.HK)的实时股票数据
 */

class StockWidget {
    constructor() {
        this.stocks = [
            {
                code: '600519',
                market: 'sh',
                name: '贵州茅台',
                idPrefix: 'moutai'
            },
            {
                code: '00700',
                market: 'hk',
                name: '腾讯控股',
                idPrefix: 'tencent'
            }
        ];
        this.updateInterval = 30000; // 30秒更新一次
        this.init();
    }

    init() {
        this.updateAllStocks();
        // 检查是否有任何市场在交易时间内，如果有则自动更新
        if (this.isAnyMarketOpen()) {
            setInterval(() => {
                this.updateAllStocks();
            }, this.updateInterval);
        }
    }

    // 检查是否有任何市场在交易时间内
    isAnyMarketOpen() {
        return this.isAStockMarketOpen() || this.isHKStockMarketOpen();
    }

    // 检查A股是否在交易时间内
    isAStockMarketOpen() {
        const now = new Date();
        const day = now.getDay(); // 0=周日, 1=周一, ..., 6=周六
        const hour = now.getHours();
        const minute = now.getMinutes();
        const currentTime = hour * 100 + minute;

        // 周末不交易
        if (day === 0 || day === 6) {
            return false;
        }

        // A股交易时间: 9:30-11:30, 13:00-15:00
        const morningStart = 930;
        const morningEnd = 1130;
        const afternoonStart = 1300;
        const afternoonEnd = 1500;

        return (currentTime >= morningStart && currentTime <= morningEnd) ||
               (currentTime >= afternoonStart && currentTime <= afternoonEnd);
    }

    // 检查港股是否在交易时间内
    isHKStockMarketOpen() {
        const now = new Date();
        const day = now.getDay(); // 0=周日, 1=周一, ..., 6=周六
        const hour = now.getHours();
        const minute = now.getMinutes();
        const currentTime = hour * 100 + minute;

        // 周末不交易
        if (day === 0 || day === 6) {
            return false;
        }

        // 港股交易时间: 9:30-12:00, 13:00-16:00
        const morningStart = 930;
        const morningEnd = 1200;
        const afternoonStart = 1300;
        const afternoonEnd = 1600;

        return (currentTime >= morningStart && currentTime <= morningEnd) ||
               (currentTime >= afternoonStart && currentTime <= afternoonEnd);
    }

    // 更新所有股票数据
    updateAllStocks() {
        this.stocks.forEach(stock => {
            // 根据股票所在市场判断是否在交易时间内
            const isMarketOpen = stock.market === 'hk' ? this.isHKStockMarketOpen() : this.isAStockMarketOpen();

            if (isMarketOpen) {
                this.fetchStockData(stock);
            } else {
                // 如果不在交易时间内，仍然尝试获取数据（可能是收盘价）
                this.fetchStockData(stock);
            }
        });
    }

    // 获取单只股票数据
    fetchStockData(stock) {
        // 使用Yahoo Finance API (免费且支持CORS)
        this.fetchFromYahoo(stock);
    }

    // 使用Yahoo Finance API获取数据
    async fetchFromYahoo(stock) {
        try {
            // Yahoo Finance符号转换
            let symbol;
            if (stock.idPrefix === 'moutai') {
                symbol = '600519.SS'; // 上海证券交易所
            } else if (stock.idPrefix === 'tencent') {
                symbol = '0700.HK'; // 香港交易所
            }

            // 使用Yahoo Finance API的免费端点
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.parseYahooData(stock, data);

        } catch (error) {
            console.error(`获取${stock.name}数据失败:`, error);
            // 如果Yahoo API失败，尝试备用方案
            this.fetchFromBackup(stock);
        }
    }

    // 备用API方案
    async fetchFromBackup(stock) {
        try {
            // 使用Finnhub免费API
            let symbol;
            if (stock.idPrefix === 'moutai') {
                symbol = '600519.SS';
            } else if (stock.idPrefix === 'tencent') {
                symbol = '0700.HK';
            }

            // 免费API密钥 (公开的演示密钥)
            const apiKey = 'demo';
            const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Finnhub API error! status: ${response.status}`);
            }

            const data = await response.json();
            this.parseFinnhubData(stock, data);

        } catch (error) {
            console.error(`备用API也失败了，${stock.name}:`, error);
            this.showError(stock.idPrefix);
        }
    }





    // 解析Yahoo Finance数据
    parseYahooData(stock, data) {
        try {
            const result = data.chart.result[0];
            const meta = result.meta;
            const quote = result.indicators.quote[0];

            const currentPrice = meta.regularMarketPrice || quote.close[quote.close.length - 1];
            const previousClose = meta.previousClose;

            if (!currentPrice || !previousClose) {
                throw new Error('价格数据不完整');
            }

            const change = currentPrice - previousClose;
            const changePercent = ((change / previousClose) * 100).toFixed(2);

            this.displayStockData(stock.idPrefix, {
                name: stock.name,
                price: currentPrice.toFixed(2),
                change: change.toFixed(2),
                changePercent: changePercent,
                updateTime: new Date().toLocaleTimeString('zh-CN')
            });

        } catch (error) {
            console.error(`解析${stock.name}Yahoo数据失败:`, error);
            this.fetchFromBackup(stock);
        }
    }

    // 解析Finnhub数据
    parseFinnhubData(stock, data) {
        try {
            const currentPrice = data.c; // current price
            const previousClose = data.pc; // previous close

            if (!currentPrice || !previousClose) {
                throw new Error('Finnhub价格数据不完整');
            }

            const change = currentPrice - previousClose;
            const changePercent = ((change / previousClose) * 100).toFixed(2);

            this.displayStockData(stock.idPrefix, {
                name: stock.name,
                price: currentPrice.toFixed(2),
                change: change.toFixed(2),
                changePercent: changePercent,
                updateTime: new Date().toLocaleTimeString('zh-CN')
            });

        } catch (error) {
            console.error(`解析${stock.name}Finnhub数据失败:`, error);
            this.showError(stock.idPrefix);
        }
    }

    // 显示股票数据
    displayStockData(idPrefix, data) {
        const priceElement = document.getElementById(`stock-price-${idPrefix}`);
        const changeElement = document.getElementById(`stock-change-${idPrefix}`);
        const timeElement = document.getElementById(`stock-update-time-${idPrefix}`);

        if (priceElement) {
            // 根据市场显示不同货币符号
            const currency = idPrefix === 'tencent' ? 'HK$' : '¥';
            priceElement.textContent = `${currency}${data.price}`;
        }

        if (changeElement) {
            const changeText = `${data.change >= 0 ? '+' : ''}${data.change} (${data.changePercent}%)`;
            changeElement.textContent = changeText;

            // 根据涨跌设置颜色
            changeElement.className = 'stock-change';
            if (data.change > 0) {
                changeElement.classList.add('positive');
            } else if (data.change < 0) {
                changeElement.classList.add('negative');
            } else {
                changeElement.classList.add('neutral');
            }
        }

        if (timeElement) {
            timeElement.textContent = `更新时间: ${data.updateTime}`;
        }
    }

    // 显示错误信息
    showError(idPrefix) {
        const priceElement = document.getElementById(`stock-price-${idPrefix}`);
        const changeElement = document.getElementById(`stock-change-${idPrefix}`);
        const timeElement = document.getElementById(`stock-update-time-${idPrefix}`);

        if (priceElement) {
            priceElement.textContent = '数据获取失败';
        }
        if (changeElement) {
            changeElement.textContent = '--';
            changeElement.className = 'stock-change neutral';
        }
        if (timeElement) {
            timeElement.textContent = '更新时间: --';
        }
    }
}

// 页面加载完成后初始化股票组件
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否存在股票组件
    if (document.querySelector('.stock-widget')) {
        new StockWidget();
    }
});
