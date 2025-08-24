// 背景脚本 - 处理扩展的后台逻辑

// 存储提取的内容
let extractedContent = null;

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'contentExtracted') {
    // 保存提取的内容
    extractedContent = request.data;
    
    // 存储到本地存储
    chrome.storage.local.set({
      lastExtractedContent: extractedContent,
      lastExtractedTime: new Date().toISOString()
    });
    
    // 更新扩展图标徽章
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    
    // 3秒后清除徽章
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 3000);
  }
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 当页面加载完成时
  if (changeInfo.status === 'complete') {
    // 检查是否是飞书域名
    if (tab.url && (tab.url.includes('feishu.cn') || tab.url.includes('larksuite.com'))) {
      // 可以在这里添加自动提取逻辑
      console.log('检测到飞书页面加载完成:', tab.url);
    }
  }
});

// 监听扩展安装或更新
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('扩展已安装');
    // 可以打开欢迎页面或设置页面
  } else if (details.reason === 'update') {
    console.log('扩展已更新到版本:', chrome.runtime.getManifest().version);
  }
});

// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'extractContent',
    title: '提取页面内容',
    contexts: ['page', 'selection']
  });
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'extractContent') {
    // 向当前标签页发送提取内容的消息
    chrome.tabs.sendMessage(tab.id, { action: 'extractContent' }, (response) => {
      if (response && response.content) {
        // 打开popup显示结果
        chrome.action.openPopup();
      }
    });
  }
});