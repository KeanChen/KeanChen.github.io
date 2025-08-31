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
        const script = document.createElement('script');
        const timestamp = Date.now();
        const scriptId = `stock-script-${stock.idPrefix}-${timestamp}`;
        script.id = scriptId;

        // 使用新浪财经API
        script.src = `https://hq.sinajs.cn/list=${stock.market}${stock.code}&_=${timestamp}`;

        script.onload = () => {
            this.parseStockData(stock);
            this.removeScript(scriptId);
        };

        script.onerror = () => {
            this.showError(stock.idPrefix);
            this.removeScript(scriptId);
        };

        // 设置超时
        setTimeout(() => {
            this.showError(stock.idPrefix);
            this.removeScript(scriptId);
        }, 10000);

        document.head.appendChild(script);
    }

    // 移除脚本元素
    removeScript(scriptId) {
        const script = document.getElementById(scriptId);
        if (script && document.head.contains(script)) {
            document.head.removeChild(script);
        }
    }

    // 解析股票数据
    parseStockData(stock) {
        try {
            // 构建全局变量名
            const globalVarName = `hq_str_${stock.market}${stock.code}`;
            const dataString = window[globalVarName];

            if (!dataString || typeof dataString !== 'string') {
                this.showError(stock.idPrefix);
                return;
            }

            // 提取引号内的数据
            const match = dataString.match(/"([^"]+)"/);
            if (!match) {
                this.showError(stock.idPrefix);
                return;
            }

            const stockInfo = match[1].split(',');

            if (stockInfo.length < 10) {
                this.showError(stock.idPrefix);
                return;
            }

            const stockName = stockInfo[0];
            let currentPrice, previousClose;

            // 根据市场类型解析价格数据
            if (stock.market === 'hk') {
                // 港股数据格式
                currentPrice = parseFloat(stockInfo[6]);
                previousClose = parseFloat(stockInfo[3]);
            } else {
                // A股数据格式
                currentPrice = parseFloat(stockInfo[3]);
                previousClose = parseFloat(stockInfo[2]);
            }

            const change = currentPrice - previousClose;
            const changePercent = previousClose > 0 ? ((change / previousClose) * 100).toFixed(2) : '0.00';

            this.displayStockData(stock.idPrefix, {
                name: stockName,
                price: currentPrice.toFixed(2),
                change: change.toFixed(2),
                changePercent: changePercent,
                updateTime: new Date().toLocaleTimeString('zh-CN')
            });

        } catch (error) {
            console.error('解析股票数据失败:', error);
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
