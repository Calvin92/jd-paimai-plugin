/**
  * @author:jiawei.ruan
  * E-mail:276807334@qq.com
  * QQ:276807334
  * wechat:kiss_276807334
*/

var JDAuction = function () {
	this.bodyWrap = $("body");
	this.originPrice = $(".cost:eq(0)").html();
	this.myUserName = $("#loginbar .link-user").text();
	this.handleTime = 0;
	this.addNum = null;
	this.autoFlag = false;
	this.timer = null;
	this.priceLimit = 0;
	this.currentPrice = 1000000;
	this.sendTime = new Date().getTime();
	this.lastBidUser = "";
	this.paimaiId = /[\d]{8,}/.exec(document.location.href)[0];
	this.skuId = $("#sku").val();
	this.t = Date.parse(new Date());
	this.queryAPI = "/json/current/englishquery?start=0&end=9&";
	this.bidAPI = "/services/bid.action?proxyFlag=0&bidSource=0&";
	this.aboutme = "----京东夺宝神器第一个免费版本,具体操作见界面即可---\n" +
		"--加价幅度为最后出价时在原有的最高价上加的价格，最小为1，默认是3\n" +
		"动态调节时间可根据自己的网速进行调整，如果默认的时间导致最后出价过晚，没能出价的话，请调大一点这个时间，0-500毫秒，默认是0 \n" +
		"      如有疑问，可以加 QQ:276807334 咨询!!";
	this.pannelCode = "<div id='qp_div'>"
		+ "7折参考价：<input type='text' id='qp_price_limit' readonly />&nbsp;&nbsp;&nbsp;&nbsp;"
		+ "你的最高价：<input type='text' id='qp_max_price' />&nbsp;&nbsp;&nbsp;&nbsp;"
		+ "加价幅度:<input type='text' id='qp_add_num' value＝'3'/>&nbsp;&nbsp;&nbsp;&nbsp;"
		+ "动态调节时间:<input placeholder='0-500ms' type='text' id='qp_handle_time' value＝'3'/>&nbsp;&nbsp;&nbsp;&nbsp;"
		+ "<input type='button' value='手动抢拍' id='qp_btn_hand' class='qp_btn'/>&nbsp;&nbsp;&nbsp;&nbsp;"
		+ "<input type='button' value='自动抢拍' id='qp_btn_auto' class='qp_btn' />&nbsp;&nbsp;&nbsp;&nbsp;"
		+ "<span>鼠标右键点击\"审查元素\"在console可查看进程</span></div>";

}

$.extend(JDAuction.prototype, {
	init: function () {
		console.log("%c" + this.aboutme, "color:green");
		console.log("有任何问题 %c 微信 kiss_276807334", "color:blue");
		console.log("个人邮箱：%c 276807334@qq.com", "color:blue");
		this.bodyWrap.prepend(this.pannelCode);
		this.maxPrice = $("#qp_max_price");
		this.addNum = $("#qp_add_num");
		this.handleLimitPrice();
		this.bindEvent();
	},
	bindEvent: function () {
		$("#qp_btn_hand").on("click", $.proxy(this.manualAuction, this));
		$("#qp_btn_auto").on("click", $.proxy(this.autoAuction, this));
	},
	handleLimitPrice: function () {
		try {
			this.priceLimit = parseInt(/\d{1,9}/.exec(/封顶价：¥[\d]{1,9}/.exec(this.originPrice)[0])[0] * 1 * 0.7, 10);
		} catch (e) {
			this.priceLimit = "暂无报价";
		}
		$('#qp_price_limit').val(this.priceLimit);
		this.maxPrice.val(this.priceLimit);
		this.addNum.val("3");
	},
	manualAuction: function () {
		//先查询当前价格等信息
		$.ajax({
			url: this.queryAPI + "paimaiId=" + this.paimaiId + "&skuId=" + this.skuId + "&t=" + this.t,
			type: "GET",
			context: this,
			beforeSend: function () {
				// this.sendTime = new Date().getTime();
			},
			success: this.querySuccess,
			error: this.requestError
		})
	},
	autoAuction: function () {
		//自动依赖于手动的模块
		var _this = this;
		this.autoFlag = true;
		this.handleTime = isNaN(parseInt($('#qp_handle_time'), 10)) ? 0 : parseInt($('#qp_handle_time'), 10);
		if (this.handleTime > 500) this.handleTime = 500;
		window.clearInterval(this.timer); //防止启动多个计时器
		if (this.maxPrice.val().trim() === "" || isNaN(this.maxPrice.val())) {
			alert("最高价输入不合法，请输入数字！");
			return;
		}
		if (isNaN(this.addNum.val()) || this.maxPrice.val().trim() === "") {
			this.addNum.val(3);
		}
		this.maxPrice.attr("disabled", "disabled");
		this.addNum.attr("disabled", "disabled");
		this.timer = window.setInterval(function () {
			_this.manualAuction();
		}, 150);
	},
	querySuccess: function (data) {
		var max_price = this.maxPrice.val();
		this.lastBidUser = data.bidList.length !== 0 ? data.bidList[data.bidList.length - 1].username.substr(4) : "";
		if (this.myUserName.indexOf(this.lastBidUser) !== -1) {
			console.log("%c目前还没有用户跟您抢这个宝贝", "color:orange");
			return window.clearInterval(this.timer);
		}
		this.currentPrice = data.currentPrice;
		if (this.autoFlag) {
			if (max_price < parseInt(this.currentPrice, 10)) {
				console.log("%c超出限制价格，停止抢拍", "color: red");
				window.clearInterval(this.timer)
			} else {
				console.log("%c当前价格:" + this.currentPrice + "--剩余时间：" + data.remainTime.substr(0, data.remainTime.length - 3) + '.' + data.remainTime.substr(data.remainTime.length - 3) + '秒', "color:blue");
				if (data.remainTime < (1200 + this.handleTime)) {
					this.bidIt();
					return window.clearInterval(this.timer);
				}

				// 频繁请求会导致被加入接口黑名单（大约1-2小时？），所请求的当前价将会是100万
				if (data.remainTime > 2200) {
					window.clearInterval(this.timer);
					window.setTimeout(this.manualAuction.bind(this), 1000);
				} else {
					this.autoAuction();
				}
			}
		} else {
			this.bidIt();
		}
	},
	bidIt: function () {
		$.ajax({
			url: this.bidAPI + "paimaiId=" + this.paimaiId + "&price=" + (parseInt(this.currentPrice, 10) + parseInt(this.addNum.val(), 10)) + "&t=" + this.t,
			type: "GET",
			context: this,
			success: this.bidSuccess,
			error: this.requestError
		});
	},
	requestError: function () {
		console.log("%请求出错", "color:red");
	},
	bidSuccess: function (data) {
		if (data.result === 200)
			console.log("%c出价成功，我的出价为:" + (parseInt(this.currentPrice, 10) + parseInt(this.addNum.val(), 10)), "color: green");
		else
			console.log("%c出价失败：" + data.message, "color: red");
	}
});

$(function () {
	new JDAuction().init();
});
