// 调试脚本 - 分析页面结构
(function() {
  'use strict';

  console.log('=== 开始分析页面结构 ===');
  
  // 分析所有包含文本的元素
  const textElements = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    null,
    false
  );

  let node;
  while (node = walker.nextNode()) {
    const text = (node.innerText || node.textContent || '').trim();
    if (text.length > 20) {
      textElements.push({
        tagName: node.tagName,
        className: node.className,
        id: node.id,
        textLength: text.length,
        textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        element: node
      });
    }
  }

  // 按文本长度排序
  textElements.sort((a, b) => b.textLength - a.textLength);

  // 输出前20个最长的文本元素
  console.log('找到的主要文本元素:');
  textElements.slice(0, 20).forEach((item, index) => {
    console.log(`${index + 1}. ${item.tagName} (${item.textLength}字符)`);
    console.log(`   class: ${item.className}`);
    console.log(`   id: ${item.id}`);
    console.log(`   预览: ${item.textPreview}`);
    console.log('---');
  });

  // 查找飞书特定的容器
  const feishuSelectors = [
    '[class*="doc"]',
    '[class*="editor"]',
    '[class*="content"]',
    '[class*="reader"]',
    '[class*="wiki"]',
    '[class*="knowledge"]',
    '[class*="sheet"]',
    '[class*="slate"]',
    '[class*="prose"]',
    '[class*="text"]',
    '[class*="paragraph"]',
    '[class*="block"]'
  ];

  console.log('\n=== 查找飞书相关元素 ===');
  feishuSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`${selector}: 找到 ${elements.length} 个元素`);
      elements.forEach((el, i) => {
        if (i < 3) { // 只显示前3个
          const text = (el.innerText || el.textContent || '').trim();
          if (text.length > 20) {
            console.log(`  - ${el.tagName}.${el.className} (${text.length}字符)`);
          }
        }
      });
    }
  });

  // 查找iframe
  const iframes = document.querySelectorAll('iframe');
  if (iframes.length > 0) {
    console.log(`\n找到 ${iframes.length} 个iframe`);
    iframes.forEach((iframe, i) => {
      console.log(`iframe ${i + 1}: ${iframe.src}`);
    });
  }

  // 查找Shadow DOM
  const shadowHosts = [];
  document.querySelectorAll('*').forEach(el => {
    if (el.shadowRoot) {
      shadowHosts.push(el);
    }
  });
  if (shadowHosts.length > 0) {
    console.log(`\n找到 ${shadowHosts.length} 个Shadow DOM宿主`);
  }

  // 提取所有可见文本
  console.log('\n=== 提取所有可见文本 ===');
  const allVisibleText = document.body.innerText;
  console.log(`总文本长度: ${allVisibleText.length} 字符`);
  console.log('文本预览:');
  console.log(allVisibleText.substring(0, 500) + '...');

  // 返回分析结果
  return {
    textElements: textElements.slice(0, 10),
    totalTextLength: allVisibleText.length,
    iframeCount: iframes.length,
    shadowDOMCount: shadowHosts.length
  };
})();