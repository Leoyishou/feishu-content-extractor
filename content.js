// 内容提取脚本
(function() {
  'use strict';

  // 提取页面内容的主函数
  function extractContent() {
    const contentData = {
      title: '',
      content: '',
      images: [],
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    // 飞书特定的内容提取
    function extractFeishuContent() {
      let allText = [];
      
      // 查找所有可能包含内容的元素
      const possibleSelectors = [
        // 飞书文档特定选择器
        '[class*="doc-content"]',
        '[class*="docx-content"]',
        '[class*="reader-content"]',
        '[class*="editor-content"]',
        '[class*="sheet-content"]',
        '[class*="slate-content"]',
        '[class*="ProseMirror"]',
        '[class*="doc-body"]',
        '[class*="wiki-content"]',
        '[class*="knowledge"]',
        // 通用内容选择器
        '[contenteditable="true"]',
        '[role="textbox"]',
        '[role="article"]',
        '[role="main"]',
        'article',
        'main',
        '.content',
        '#content',
        // 段落和文本块
        'p',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'li',
        'td',
        'blockquote',
        'pre',
        'code',
        'span',
        'div'
      ];

      // 使用Set去重
      const processedTexts = new Set();
      
      possibleSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          // 跳过脚本和样式
          if (element.closest('script, style, noscript')) return;
          
          // 获取元素的文本
          let text = '';
          
          // 优先使用innerText（保留格式）
          if (element.innerText) {
            text = element.innerText.trim();
          } else if (element.textContent) {
            text = element.textContent.trim();
          }
          
          // 过滤太短的文本
          if (text && text.length > 10) {
            // 检查是否为有效内容（非UI元素）
            const lowerText = text.toLowerCase();
            const isUIElement = ['button', 'click', 'loading', 'share', 'copy', 'menu'].some(ui => 
              lowerText.includes(ui) && text.length < 50
            );
            
            if (!isUIElement && !processedTexts.has(text)) {
              processedTexts.add(text);
              allText.push(text);
            }
          }
        });
      });

      // 尝试获取标题
      const titleSelectors = [
        'h1',
        '[class*="title"]',
        '[class*="header"]',
        'title'
      ];

      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          contentData.title = element.textContent.trim();
          break;
        }
      }

      // 组合所有文本，按长度排序（较长的文本可能是主要内容）
      allText.sort((a, b) => b.length - a.length);
      
      // 智能合并文本
      const mergedContent = [];
      const addedTexts = new Set();
      
      allText.forEach(text => {
        // 检查是否已经包含在其他文本中
        let isSubstring = false;
        for (const added of addedTexts) {
          if (added.includes(text) || text.includes(added)) {
            isSubstring = true;
            break;
          }
        }
        
        if (!isSubstring) {
          mergedContent.push(text);
          addedTexts.add(text);
        }
      });

      // 获取所有图片
      document.querySelectorAll('img').forEach(img => {
        if (img.src && !img.src.includes('data:')) {
          contentData.images.push({
            src: img.src,
            alt: img.alt || '',
            width: img.width || 0,
            height: img.height || 0
          });
        }
      });

      return mergedContent.join('\n\n');
    }

    // 执行飞书内容提取
    contentData.content = extractFeishuContent();

    // 如果还没有标题，使用页面标题
    if (!contentData.title) {
      contentData.title = document.title || '未命名文档';
    }

    // 如果内容太少，尝试更激进的方法
    if (contentData.content.length < 100) {
      // 获取整个body的文本
      const bodyText = document.body.innerText || document.body.textContent || '';
      if (bodyText.length > contentData.content.length) {
        contentData.content = bodyText;
      }
    }

    return contentData;
  }

  // 监听来自popup的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractContent') {
      const content = extractContent();
      sendResponse(content);
    }
  });

  // 页面加载完成后自动提取一次
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        const content = extractContent();
        chrome.runtime.sendMessage({
          action: 'contentExtracted',
          data: content
        });
      }, 1000); // 延迟1秒确保动态内容加载
    });
  } else {
    setTimeout(() => {
      const content = extractContent();
      chrome.runtime.sendMessage({
        action: 'contentExtracted',
        data: content
      });
    }, 1000);
  }

  // 监听DOM变化，重新提取内容
  const observer = new MutationObserver((mutations) => {
    // 防抖处理
    clearTimeout(window.extractTimeout);
    window.extractTimeout = setTimeout(() => {
      const content = extractContent();
      chrome.runtime.sendMessage({
        action: 'contentExtracted',
        data: content
      });
    }, 500);
  });

  // 开始观察
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
})();