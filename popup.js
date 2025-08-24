// 存储当前提取的内容
let currentContent = null;

// DOM元素
const extractBtn = document.getElementById('extractBtn');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const statusDiv = document.getElementById('status');
const loadingDiv = document.getElementById('loading');
const contentInfo = document.getElementById('contentInfo');
const preview = document.getElementById('preview');
const previewText = document.getElementById('previewText');
const titleText = document.getElementById('titleText');
const wordCount = document.getElementById('wordCount');
const imageCount = document.getElementById('imageCount');

// 更新状态消息
function updateStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
}

// 显示内容信息
function displayContentInfo(content) {
  titleText.textContent = content.title || '未找到标题';
  wordCount.textContent = content.content.length + '字';
  imageCount.textContent = content.images.length + '张';
  
  // 显示预览
  const previewLength = 500;
  previewText.textContent = content.content.length > previewLength 
    ? content.content.substring(0, previewLength) + '...' 
    : content.content;
  
  // 显示相关元素
  contentInfo.style.display = 'block';
  preview.style.display = 'block';
  copyBtn.style.display = 'block';
  downloadBtn.style.display = 'block';
}

// 提取内容
extractBtn.addEventListener('click', async () => {
  try {
    updateStatus('正在提取内容...', 'info');
    loadingDiv.style.display = 'block';
    extractBtn.disabled = true;
    
    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 首先尝试直接发送消息
    chrome.tabs.sendMessage(tab.id, { action: 'extractContent' }, async (response) => {
      if (chrome.runtime.lastError) {
        // 如果失败，尝试注入content script
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          
          // 等待一下让脚本加载
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: 'extractContent' }, (response) => {
              loadingDiv.style.display = 'none';
              extractBtn.disabled = false;
              
              if (response && response.content) {
                currentContent = response;
                displayContentInfo(response);
                updateStatus('内容提取成功！', 'success');
              } else {
                updateStatus('未能提取到内容', 'error');
              }
            });
          }, 500);
        } catch (err) {
          loadingDiv.style.display = 'none';
          extractBtn.disabled = false;
          updateStatus('无法在此页面提取内容', 'error');
        }
      } else {
        loadingDiv.style.display = 'none';
        extractBtn.disabled = false;
        
        if (response && response.content) {
          currentContent = response;
          displayContentInfo(response);
          updateStatus('内容提取成功！', 'success');
        } else {
          updateStatus('未能提取到内容', 'error');
        }
      }
    });
  } catch (error) {
    loadingDiv.style.display = 'none';
    extractBtn.disabled = false;
    updateStatus('提取失败：' + error.message, 'error');
  }
});

// 复制到剪贴板
copyBtn.addEventListener('click', async () => {
  if (!currentContent) return;
  
  try {
    const textToCopy = `标题: ${currentContent.title}\n\n${currentContent.content}`;
    await navigator.clipboard.writeText(textToCopy);
    updateStatus('内容已复制到剪贴板！', 'success');
  } catch (error) {
    updateStatus('复制失败：' + error.message, 'error');
  }
});

// 下载为文本文件
downloadBtn.addEventListener('click', () => {
  if (!currentContent) return;
  
  try {
    // 准备文本内容
    const textContent = `标题: ${currentContent.title}
URL: ${currentContent.url}
提取时间: ${new Date(currentContent.timestamp).toLocaleString()}
图片数量: ${currentContent.images.length}

===== 正文内容 =====

${currentContent.content}

===== 图片列表 =====

${currentContent.images.map((img, index) => 
  `图片${index + 1}: ${img.src}\n说明: ${img.alt || '无'}`
).join('\n\n')}`;
    
    // 创建Blob并下载
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const filename = `${currentContent.title || '未命名'}_${new Date().getTime()}.txt`;
    
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    }, () => {
      URL.revokeObjectURL(url);
      updateStatus('文件下载成功！', 'success');
    });
  } catch (error) {
    updateStatus('下载失败：' + error.message, 'error');
  }
});

// 页面加载时检查是否有缓存的内容
chrome.storage.local.get(['lastExtractedContent'], (result) => {
  if (result.lastExtractedContent) {
    currentContent = result.lastExtractedContent;
    displayContentInfo(currentContent);
    updateStatus('显示上次提取的内容', 'info');
  }
});