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
        // 首先尝试新浪财经API
        this.fetchFromSina(stock).catch(() => {
            // 如果失败，尝试腾讯财经API
            console.log(`新浪API失败，尝试腾讯API获取${stock.name}数据`);
            this.fetchFromTencent(stock);
        });
    }

    // 从新浪财经获取数据
    fetchFromSina(stock) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            const timestamp = Date.now();
            const scriptId = `sina-script-${stock.idPrefix}-${timestamp}`;
            script.id = scriptId;

            script.src = `https://hq.sinajs.cn/list=${stock.market}${stock.code}`;

            script.onload = () => {
                setTimeout(() => {
                    const success = this.parseSinaData(stock);
                    this.removeScript(scriptId);
                    if (success) {
                        resolve();
                    } else {
                        reject(new Error('解析新浪数据失败'));
                    }
                }, 200);
            };

            script.onerror = () => {
                this.removeScript(scriptId);
                reject(new Error('新浪API加载失败'));
            };

            setTimeout(() => {
                this.removeScript(scriptId);
                reject(new Error('新浪API超时'));
            }, 8000);

            document.head.appendChild(script);
        });
    }

    // 从腾讯财经获取数据
    fetchFromTencent(stock) {
        const script = document.createElement('script');
        const timestamp = Date.now();
        const scriptId = `tencent-script-${stock.idPrefix}-${timestamp}`;
        script.id = scriptId;

        // 腾讯API格式
        const tencentCode = stock.market === 'hk' ? `r_hk${stock.code}` : `s_${stock.market}${stock.code}`;
        script.src = `https://qt.gtimg.cn/q=${tencentCode}`;

        script.onload = () => {
            setTimeout(() => {
                this.parseTencentData(stock);
                this.removeScript(scriptId);
            }, 200);
        };

        script.onerror = () => {
            console.error(`腾讯API也失败了，${stock.name}数据获取失败`);
            this.showError(stock.idPrefix);
            this.removeScript(scriptId);
        };

        setTimeout(() => {
            console.warn(`腾讯API超时，${stock.name}数据获取失败`);
            this.showError(stock.idPrefix);
            this.removeScript(scriptId);
        }, 8000);

        document.head.appendChild(script);
    }

    // 移除脚本元素
    removeScript(scriptId) {
        const script = document.getElementById(scriptId);
        if (script && document.head.contains(script)) {
            document.head.removeChild(script);
        }
    }

    // 解析新浪财经数据
    parseSinaData(stock) {
        try {
            // 构建全局变量名
            const globalVarName = `hq_str_${stock.market}${stock.code}`;
            let dataString = window[globalVarName];

            console.log(`尝试获取${stock.name}数据:`, globalVarName, dataString);

            if (!dataString || typeof dataString !== 'string' || dataString.trim() === '') {
                console.warn(`${stock.name}数据为空或无效:`, dataString);
                return false;
            }

            // 提取引号内的数据
            const match = dataString.match(/"([^"]+)"/);
            if (!match || !match[1]) {
                console.warn(`${stock.name}数据格式错误:`, dataString);
                return false;
            }

            const stockInfo = match[1].split(',');
            console.log(`${stock.name}解析后的数据:`, stockInfo);

            if (stockInfo.length < 6) {
                console.warn(`${stock.name}数据字段不足:`, stockInfo.length);
                return false;
            }

            const stockName = stockInfo[0] || stock.name;
            let currentPrice, previousClose;

            // 根据市场类型解析价格数据
            if (stock.market === 'hk') {
                // 港股数据格式: 名称,代码,当前价格,今日开盘价,昨日收盘价,最高价,最低价...
                currentPrice = parseFloat(stockInfo[6]) || parseFloat(stockInfo[2]);
                previousClose = parseFloat(stockInfo[3]) || parseFloat(stockInfo[4]);
            } else {
                // A股数据格式: 名称,今日开盘价,昨日收盘价,当前价格,最高价,最低价...
                currentPrice = parseFloat(stockInfo[3]);
                previousClose = parseFloat(stockInfo[2]);
            }

            // 验证价格数据
            if (isNaN(currentPrice) || isNaN(previousClose) || currentPrice <= 0 || previousClose <= 0) {
                console.warn(`${stock.name}价格数据无效:`, { currentPrice, previousClose });
                return false;
            }

            const change = currentPrice - previousClose;
            const changePercent = previousClose > 0 ? ((change / previousClose) * 100).toFixed(2) : '0.00';

            console.log(`${stock.name}最终数据:`, { currentPrice, previousClose, change, changePercent });

            this.displayStockData(stock.idPrefix, {
                name: stockName,
                price: currentPrice.toFixed(2),
                change: change.toFixed(2),
                changePercent: changePercent,
                updateTime: new Date().toLocaleTimeString('zh-CN')
            });

            return true;

        } catch (error) {
            console.error(`解析${stock.name}数据失败:`, error);
            return false;
        }
    }

    // 解析腾讯财经数据
    parseTencentData(stock) {
        try {
            // 腾讯API返回格式: v_s_sh600519="51~贵州茅台~600519~1756.00~1780.00~1780.00~..."
            const tencentCode = stock.market === 'hk' ? `r_hk${stock.code}` : `s_${stock.market}${stock.code}`;
            const globalVarName = `v_${tencentCode}`;
            const dataString = window[globalVarName];

            console.log(`尝试获取${stock.name}腾讯数据:`, globalVarName, dataString);

            if (!dataString || typeof dataString !== 'string') {
                console.warn(`${stock.name}腾讯数据为空或无效:`, dataString);
                this.showError(stock.idPrefix);
                return;
            }

            // 提取引号内的数据
            const match = dataString.match(/"([^"]+)"/);
            if (!match || !match[1]) {
                console.warn(`${stock.name}腾讯数据格式错误:`, dataString);
                this.showError(stock.idPrefix);
                return;
            }

            const stockInfo = match[1].split('~');
            console.log(`${stock.name}腾讯解析后的数据:`, stockInfo);

            if (stockInfo.length < 6) {
                console.warn(`${stock.name}腾讯数据字段不足:`, stockInfo.length);
                this.showError(stock.idPrefix);
                return;
            }

            const stockName = stockInfo[1] || stock.name;
            const currentPrice = parseFloat(stockInfo[3]);
            const previousClose = parseFloat(stockInfo[4]);

            // 验证价格数据
            if (isNaN(currentPrice) || isNaN(previousClose) || currentPrice <= 0 || previousClose <= 0) {
                console.warn(`${stock.name}腾讯价格数据无效:`, { currentPrice, previousClose });
                this.showError(stock.idPrefix);
                return;
            }

            const change = currentPrice - previousClose;
            const changePercent = previousClose > 0 ? ((change / previousClose) * 100).toFixed(2) : '0.00';

            console.log(`${stock.name}腾讯最终数据:`, { currentPrice, previousClose, change, changePercent });

            this.displayStockData(stock.idPrefix, {
                name: stockName,
                price: currentPrice.toFixed(2),
                change: change.toFixed(2),
                changePercent: changePercent,
                updateTime: new Date().toLocaleTimeString('zh-CN')
            });

        } catch (error) {
            console.error(`解析${stock.name}腾讯数据失败:`, error);
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
