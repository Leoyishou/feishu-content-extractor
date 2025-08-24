// 增强版内容提取脚本 - 专门针对飞书优化
(function() {
  'use strict';

  // 等待元素加载
  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  // 深度提取内容
  function deepExtractContent() {
    const contentData = {
      title: '',
      content: '',
      images: [],
      tables: [],
      codeBlocks: [],
      lists: [],
      timestamp: new Date().toISOString(),
      url: window.location.href,
      debug: {}
    };

    // 获取页面标题
    const titleCandidates = [
      document.querySelector('h1'),
      document.querySelector('[class*="title"]'),
      document.querySelector('[class*="header"] h1'),
      document.querySelector('title')
    ];

    for (const candidate of titleCandidates) {
      if (candidate && candidate.textContent) {
        contentData.title = candidate.textContent.trim();
        if (contentData.title) break;
      }
    }

    // 收集所有文本内容
    const contentParts = [];
    const processedNodes = new WeakSet();

    // 递归提取文本内容
    function extractTextFromNode(node, depth = 0) {
      if (!node || processedNodes.has(node) || depth > 10) return '';
      processedNodes.add(node);

      // 跳过脚本和样式
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        if (['script', 'style', 'noscript'].includes(tagName)) return '';
        
        // 跳过隐藏元素
        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') return '';
      }

      let text = '';

      // 处理文本节点
      if (node.nodeType === Node.TEXT_NODE) {
        text = node.textContent.trim();
      } 
      // 处理元素节点
      else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        
        // 特殊处理某些元素
        switch (tagName) {
          case 'br':
            text = '\n';
            break;
          case 'p':
          case 'div':
          case 'section':
          case 'article':
            const childText = Array.from(node.childNodes)
              .map(child => extractTextFromNode(child, depth + 1))
              .join('');
            if (childText) text = childText + '\n\n';
            break;
          case 'h1':
          case 'h2':
          case 'h3':
          case 'h4':
          case 'h5':
          case 'h6':
            const headerText = node.textContent.trim();
            if (headerText) text = '\n' + headerText + '\n\n';
            break;
          case 'li':
            const liText = node.textContent.trim();
            if (liText) text = '• ' + liText + '\n';
            break;
          case 'code':
          case 'pre':
            const codeText = node.textContent.trim();
            if (codeText) {
              contentData.codeBlocks.push(codeText);
              text = '\n[代码块]\n' + codeText + '\n\n';
            }
            break;
          case 'img':
            const src = node.getAttribute('src');
            if (src) {
              contentData.images.push({
                src: src,
                alt: node.getAttribute('alt') || '',
                width: node.width,
                height: node.height
              });
              text = '[图片: ' + (node.getAttribute('alt') || src) + ']\n';
            }
            break;
          case 'table':
            const tableText = extractTableContent(node);
            if (tableText) {
              contentData.tables.push(tableText);
              text = '\n[表格]\n' + tableText + '\n\n';
            }
            break;
          default:
            // 递归处理子节点
            text = Array.from(node.childNodes)
              .map(child => extractTextFromNode(child, depth + 1))
              .join('');
        }
      }

      return text;
    }

    // 提取表格内容
    function extractTableContent(table) {
      const rows = [];
      table.querySelectorAll('tr').forEach(tr => {
        const cells = [];
        tr.querySelectorAll('td, th').forEach(cell => {
          cells.push(cell.textContent.trim());
        });
        if (cells.length > 0) {
          rows.push(cells.join(' | '));
        }
      });
      return rows.join('\n');
    }

    // 查找主要内容区域
    const contentSelectors = [
      // 飞书特定选择器
      '.wiki-content',
      '.doc-content',
      '.docx-content',
      '.reader-content',
      '.editor-content',
      '[class*="ProseMirror"]',
      '[class*="slate-content"]',
      '[class*="doc-container"]',
      '[class*="wiki-container"]',
      '[class*="knowledge"]',
      // 通用选择器
      'main',
      'article',
      '[role="main"]',
      '[role="article"]',
      '.content',
      '#content',
      'body'
    ];

    let mainContent = '';
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const extracted = extractTextFromNode(element);
        if (extracted && extracted.length > mainContent.length) {
          mainContent = extracted;
        }
      }
    }

    // 如果主要内容太少，使用更激进的方法
    if (mainContent.length < 200) {
      // 获取所有可见文本
      const allText = document.body.innerText || document.body.textContent || '';
      if (allText.length > mainContent.length) {
        mainContent = allText;
      }
    }

    contentData.content = mainContent.trim();

    // 添加调试信息
    contentData.debug = {
      contentLength: contentData.content.length,
      imageCount: contentData.images.length,
      tableCount: contentData.tables.length,
      codeBlockCount: contentData.codeBlocks.length
    };

    return contentData;
  }

  // 监听消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractContent') {
      // 延迟一下确保页面加载完成
      setTimeout(() => {
        const content = deepExtractContent();
        sendResponse(content);
      }, 1000);
      return true; // 保持消息通道开放
    }
    
    if (request.action === 'debug') {
      // 在控制台运行调试脚本
      const script = document.createElement('script');
      script.textContent = `(${debug.toString()})()`;
      document.head.appendChild(script);
      script.remove();
      sendResponse({ status: 'debug script executed' });
    }
  });

  // 页面加载完成后自动提取
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        const content = deepExtractContent();
        chrome.runtime.sendMessage({
          action: 'contentExtracted',
          data: content
        });
      }, 2000);
    });
  } else {
    setTimeout(() => {
      const content = deepExtractContent();
      chrome.runtime.sendMessage({
        action: 'contentExtracted',
        data: content
      });
    }, 2000);
  }

  // 监控动态内容加载
  const observer = new MutationObserver(() => {
    clearTimeout(window.extractTimeout);
    window.extractTimeout = setTimeout(() => {
      const content = deepExtractContent();
      chrome.runtime.sendMessage({
        action: 'contentExtracted',
        data: content
      });
    }, 1000);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
})();