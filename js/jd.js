/**
  * @author:jiawei.ruan
  * E-mail:276807334@qq.com
  * QQ:276807334
  * wechat:kiss_276807334
*/

function querySelector(node) {
	return document.querySelector(node)
}

class JDAuction {
	constructor() {
		this.bodyWrap = document.body
		this.originPrice = querySelector('.cost').textContent
		this.myUserName = querySelector('#ttbar-login > div.dt.cw-icon.icon-plus-state3 > a').textContent
		this.handleTime = 0
		this.addNum = null	// 最后加价幅度的元素
		this.autoFlag = false
		this.timer = null	// 定时器
		this.priceLimit = 0
		this.currentPrice = 1000000	// 当前价格
		this.sendTime = new Date().getTime()
		this.lastBidUser = ''
		this.paimaiId = /[\d]{8,}/.exec(document.location.href)[0]
		this.skuId = querySelector('#sku').value
		this.t = Date.parse(new Date())
		this.queryAPI = `/json/current/englishquery?start=0&end=9&`
		this.aboutMe = `
			----京东夺宝神器第一个免费版本,具体操作见界面即可---
			--加价幅度为最后出价时在原有的最高价上加的价格，最小为1，默认是3
			动态调节时间可根据自己的网速进行调整，如果默认的时间导致最后出价过晚，没能出价的话，请调大一点这个时间，0-500毫秒，默认是0
			如有疑问，可以加 QQ:276807334 咨询!!
		`
		this.pannelHtmlString = "<div id='qp_div'>"
		+ "7折参考价：<input type='text' id='qp_price_limit' readonly />&nbsp;&nbsp;&nbsp;&nbsp;"
		+ "你的最高价：<input type='text' id='qp_max_price' />&nbsp;&nbsp;&nbsp;&nbsp;"
		+ "加价幅度:<input type='text' id='qp_add_num' value＝'3'/>&nbsp;&nbsp;&nbsp;&nbsp;"
		+ "动态调节时间:<input placeholder='0-500ms' type='text' id='qp_handle_time' value＝'3'/>&nbsp;&nbsp;&nbsp;&nbsp;"
		+ "<input type='button' value='手动抢拍' id='qp_btn_hand' class='qp_btn'/>&nbsp;&nbsp;&nbsp;&nbsp;"
		+ "<input type='button' value='自动抢拍' id='qp_btn_auto' class='qp_btn' />&nbsp;&nbsp;&nbsp;&nbsp;"
		+ "<span>鼠标右键点击\"审查元素\"在console可查看进程</span></div>"
	}

	init() {
		console.log("%c" + this.aboutMe, "color:green")
		console.log("有任何问题 %c 微信 kiss_276807334", "color:blue")
		console.log("个人邮箱：%c 276807334@qq.com", "color:blue")
		this.bodyWrap.innerHTML = this.pannelHtmlString + this.bodyWrap.innerHTML
		this.maxPrice = querySelector('#qp_max_price')
		this.addNum = querySelector('#qp_add_num')
		this.handleLimitPrice()
		this.bindEvent()
	}

	bindEvent() {
		querySelector('#qp_btn_hand').onclick = this.manualAuction.bind(this)
		querySelector('#qp_btn_auto').onclick = this.autoAuction.bind(this)
	}

	handleLimitPrice() {
		try {
			this.priceLimit = parseInt(/\d{1,9}/.exec(/封顶价：¥[\d]{1,9}/.exec(this.originPrice)[0])[0] * 1 * 0.7, 10)
		} catch (e) {
			this.priceLimit = "暂无报价"
		}
		querySelector('#qp_price_limit').value = this.priceLimit
		this.maxPrice.value = this.priceLimit
		this.addNum.value = 3
	}

	manualAuction() {
		//先查询当前价格等信息
		window.fetch(this.queryAPI + "paimaiId=" + this.paimaiId + "&skuId=" + this.skuId + "&t=" + this.t)
		.then(resp => resp.json())
		.then(this.querySuccess.bind(this))
		.catch(this.requestError)
	}

	autoAuction() {
		//自动依赖于手动的模块
		this.autoFlag = true
		const handleTimeValue = querySelector('#qp_handle_time').value
		this.handleTime = isNaN(parseInt(handleTimeValue, 10)) ? 0 : parseInt(handleTimeValue, 10)
		if (this.handleTime > 500) this.handleTime = 500
		window.clearInterval(this.timer) //防止启动多个计时器
		if (this.maxPrice.value.trim() === "" || isNaN(this.maxPrice.value)) {
			return alert("最高价输入不合法，请输入数字！")
		}
		if (isNaN(this.addNum.value) || this.maxPrice.value.trim() === "") {
			this.addNum.value = 3
		}
		this.maxPrice.disabled = true
		this.addNum.disabled = true
		this.timer = window.setInterval(() => {
			this.manualAuction()
		}, 1000)
	}

	querySuccess(data) {
		const max_price = this.maxPrice.value
		this.lastBidUser = data.bidList.length !== 0 ? data.bidList[data.bidList.length - 1].username.substr(4) : ""
		if (this.myUserName.indexOf(this.lastBidUser) !== -1) {
			console.log("%c目前还没有用户跟您抢这个宝贝", "color:orange")
			return window.clearInterval(this.timer)
		}
		this.currentPrice = data.currentPrice
		if (this.autoFlag) {
			if (max_price < parseInt(this.currentPrice, 10)) {
				console.log('%c超出限制价格，停止抢拍', 'color: red')
				window.clearInterval(this.timer)
			} else {
				console.log(`%c当前价格: ${this.currentPrice}--剩余时间：${data.remainTime.substr(0, data.remainTime.length - 3)}.${data.remainTime.substr(data.remainTime.length - 3)}秒`, 'color:blue')
				if (data.remainTime < (1200 + this.handleTime)) {
					this.bidIt()
					return window.clearInterval(this.timer)
				}

				// 频繁请求会导致被加入接口黑名单（大约1-2小时？），所请求的当前价将会是100万
				if (data.remainTime > 2200) {
					window.clearInterval(this.timer)
					window.setTimeout(this.manualAuction.bind(this), 1000)
				} else {
					this.autoAuction()
				}
			}
		} else {
			this.bidIt()
		}
	}

	bidIt() {
		const bidURL = `${this.bidAPI}paimaiId=${this.paimaiId}&price="${(parseInt(this.currentPrice) + parseInt(this.addNum.value))}&t=${this.t}`
		window.fetch(bidURL)
		.then(resp => resp.json())
		.then(this.bidSuccess.bind(this))
		.catch(this.requestError)
	}

	requestError() {
		console.log('%c请求出错', 'color:red')
	}

	bidSuccess(data) {
		if (data.result === 200)
			console.log(`%c出价成功，我的出价为: ${(parseInt(this.currentPrice) + parseInt(this.addNum.value))}`, 'color: green')
		else
			console.log(`%c出价失败：${data.message}`, 'color: red')
	}
}

window.onload = () => {
	new JDAuction().init()
}
