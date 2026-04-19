// 常量
const NO_TAB_GROUP_ID = -1;
const NEW_TAB_GROUP_ID = -2;
const NO_CONTAINER_ID = "NO_CONTAINER_ID";
const NEW_CONTAINER_ID = "NEW_CONTAINER_ID";

// 检测浏览器语言
function getBrowserLanguage() {
  const lang = navigator.language || navigator.userLanguage || 'en';
  return lang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

// 本地化消息
const MESSAGES = {
  zh: {
    'optionsTitle': '快捷打开链接 - 设置',
    'welcomeText': '修改以下选项，然后使用快捷键 ⌘+Shift+E (Mac) 或 Ctrl+Shift+E (Win) 即可从选中文本中批量打开链接。',
    'sectionBehavior': '📋 打开行为',
    'lazyLoadLabel': '懒加载模式 (标签被选中时才加载)',
    'randomLabel': '随机顺序打开',
    'reverseLabel': '逆序打开',
    'deduplicateLabel': '忽略重复URL',
    'searchQueryLabel': '将非URL文本作为搜索引擎查询',
    'sectionTabGroup': '📂 标签组 (Tab Group)',
    'tabGroupInfo': '选择"新建标签组"会将所有新标签归入一个新组；无分组则不进行分组。',
    'sectionContainer': '🍃 容器 (Containers)',
    'containerInfo': '需要浏览器启用容器功能。选择"新建容器"会自动创建临时容器。',
    'sectionShortcuts': '⌨️ 快捷键修改',
    'manageShortcutsButton': '管理扩展快捷键',
    'shortcutsInfo': '点击按钮跳转到浏览器扩展快捷键设置页面，可自定义按键。',
    'saveButton': '💾 保存设置',
    'saveSuccess': '✓ 已保存',
    'noSelectionText': '无标签组',
    'newSelectionText': '新建标签组',
    'unnamedGroup': '未命名组',
    'noContainerText': '无容器',
    'newContainerText': '新建容器'
  },
  en: {
    'optionsTitle': 'Quick-Open-URLs - Settings',
    'welcomeText': 'Modify the options below, then use ⌘+Shift+E (Mac) or Ctrl+Shift+E (Win) to batch open links from selected text. You can set a custom shortcut key combination in the "Keyboard Shortcuts" section.',
    'sectionBehavior': '📋 Opening Behavior',
    'lazyLoadLabel': 'Lazy Loading Mode (load when tab is selected)',
    'randomLabel': 'Open in Random Order',
    'reverseLabel': 'Open in Reverse Order',
    'deduplicateLabel': 'Ignore Duplicate URLs',
    'searchQueryLabel': 'Treat non-URL text as search engine query',
    'sectionTabGroup': '📂 Tab Group',
    'tabGroupInfo': 'Select "New Tab Group" to put all new tabs into a new group; no grouping means no grouping.',
    'sectionContainer': '🍃 Container',
    'containerInfo': 'Container feature needs to be enabled in browser. Select "New Container" to automatically create temporary containers.',
    'sectionShortcuts': '⌨️ Keyboard Shortcuts',
    'manageShortcutsButton': 'Manage Extension Shortcuts',
    'shortcutsInfo': 'Click the button to jump to browser extension shortcut settings where you can customize keys.',
    'saveButton': '💾 Save Settings',
    'saveSuccess': '✓ Saved',
    'noSelectionText': 'No Tab Group',
    'newSelectionText': 'New Tab Group',
    'unnamedGroup': 'Unnamed Group',
    'noContainerText': 'No Container',
    'newContainerText': 'New Container'
  }
};

// 获取当前语言的消息
function getLocalizedMessage(key) {
  const lang = getBrowserLanguage();
  return MESSAGES[lang][key] || MESSAGES['en'][key] || key;
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, function(m) {
    if (m === "&") return "&amp;";
    if (m === "<") return "&lt;";
    if (m === ">") return "&gt;";
    return m;
  });
}

// 加载标签组列表
async function loadTabGroups(tabGroupSelect) {
  if (!tabGroupSelect) return;
  try {
    const groups = await chrome.tabGroups.query({});
    const options = [
      { id: NO_TAB_GROUP_ID, title: getLocalizedMessage('noSelectionText') },
      { id: NEW_TAB_GROUP_ID, title: getLocalizedMessage('newSelectionText') },
      ...groups.map(g => ({ id: g.id, title: `${g.title || getLocalizedMessage('unnamedGroup')} (${g.color})` }))
    ];
    tabGroupSelect.innerHTML = options.map(opt => `<option value="${opt.id}">${escapeHtml(opt.title)}</option>`).join("");
    return options;
  } catch (e) {
    console.warn("无法获取标签组", e);
    tabGroupSelect.innerHTML = `<option value="${NO_TAB_GROUP_ID}">${getLocalizedMessage('noSelectionText')}</option><option value="${NEW_TAB_GROUP_ID}">${getLocalizedMessage('newSelectionText')}</option>`;
  }
}

// 加载容器列表
async function loadContainers(containerSelect) {
  if (!containerSelect) return;
  try {
    if (!chrome.contextualIdentities) {
      console.warn("contextualIdentities API not available - containers disabled");
      containerSelect.innerHTML = `<option value="${NO_CONTAINER_ID}">${getLocalizedMessage('noContainerText')}</option><option value="${NEW_CONTAINER_ID}">${getLocalizedMessage('newContainerText')}</option>`;
      return;
    }

    const containers = await chrome.contextualIdentities.query({});
    const options = [
      { id: NO_CONTAINER_ID, title: getLocalizedMessage('noContainerText') },
      { id: NEW_CONTAINER_ID, title: getLocalizedMessage('newContainerText') },
      ...containers.map(c => ({ id: c.cookieStoreId, title: `${c.name} (${c.color})` }))
    ];
    containerSelect.innerHTML = options.map(opt => `<option value="${opt.id}">${escapeHtml(opt.title)}</option>`).join("");
  } catch (e) {
    console.warn("无法获取容器", e);
    containerSelect.innerHTML = `<option value="${NO_CONTAINER_ID}">${getLocalizedMessage('noContainerText')}</option><option value="${NEW_CONTAINER_ID}">${getLocalizedMessage('newContainerText')}</option>`;
  }
}

// 更新页面所有文本
function updatePageText() {
  // 更新标题
  document.title = getLocalizedMessage('optionsTitle');
  
  // 更新 h1
  const h1 = document.querySelector('h1');
  if (h1) {
    h1.textContent = getBrowserLanguage() === 'zh' ? '⚙️ 快捷打开链接 - 设置' : '⚙️ Quick-Open-URLs - Settings';
  }
  
  // 更新欢迎文本
  const welcomeP = document.querySelector('p');
  if (welcomeP) {
    welcomeP.innerHTML = getLocalizedMessage('welcomeText');
  }
  
  // 更新所有 section h2
  const sectionTitles = {
    'sectionBehavior': 0,
    'sectionTabGroup': 1,
    'sectionContainer': 2,
    'sectionShortcuts': 3
  };
  const h2s = document.querySelectorAll('h2');
  for (const [key, index] of Object.entries(sectionTitles)) {
    if (h2s[index]) {
      h2s[index].textContent = getLocalizedMessage(key);
    }
  }
  
  // 更新复选框标签
  const checkboxLabels = {
    'lazyLoad': 'lazyLoadLabel',
    'random': 'randomLabel',
    'reverse': 'reverseLabel',
    'deduplicate': 'deduplicateLabel',
    'searchQuery': 'searchQueryLabel'
  };
  for (const [id, msgKey] of Object.entries(checkboxLabels)) {
    const el = document.getElementById(id);
    if (el) {
      el.title = getLocalizedMessage(msgKey);
      const label = el.nextElementSibling;
      if (label && label.tagName === 'LABEL') {
        label.textContent = getLocalizedMessage(msgKey);
      }
    }
  }
  
  // 更新 info 文本
  const infoDivs = document.querySelectorAll('.info');
  if (infoDivs[0]) infoDivs[0].textContent = getLocalizedMessage('tabGroupInfo');
  if (infoDivs[1]) infoDivs[1].textContent = getLocalizedMessage('containerInfo');
  if (infoDivs[2]) infoDivs[2].textContent = getLocalizedMessage('shortcutsInfo');
  
  // 更新按钮
  const saveBtn = document.getElementById('save');
  if (saveBtn) saveBtn.textContent = getLocalizedMessage('saveButton');
  
  const manageShortcutsBtn = document.getElementById('manageShortcuts');
  if (manageShortcutsBtn) manageShortcutsBtn.textContent = getLocalizedMessage('manageShortcutsButton');
}

// 加载已保存设置
async function loadSettings(elements) {
  const { lazyLoadChk, randomChk, reverseChk, deduplicateChk, searchQueryChk, tabGroupSelect, containerSelect } = elements;
  const result = await chrome.storage.local.get([
    "lazyLoading", "random", "reverse", "deduplicate",
    "handleAsSearchQuery", "selectedTabGroupId", "selectedContainerId"
  ]);
  
  if (lazyLoadChk) lazyLoadChk.checked = result.lazyLoading || false;
  if (randomChk) randomChk.checked = result.random || false;
  if (reverseChk) reverseChk.checked = result.reverse || false;
  if (deduplicateChk) deduplicateChk.checked = result.deduplicate !== undefined ? result.deduplicate : true;
  if (searchQueryChk) searchQueryChk.checked = result.handleAsSearchQuery || false;

  if (tabGroupSelect) {
    if (result.selectedTabGroupId !== undefined) {
      tabGroupSelect.value = String(result.selectedTabGroupId);
    } else {
      tabGroupSelect.value = String(NO_TAB_GROUP_ID);
    }
  }
  if (containerSelect) {
    if (result.selectedContainerId !== undefined) {
      containerSelect.value = result.selectedContainerId;
    } else {
      containerSelect.value = NO_CONTAINER_ID;
    }
  }
}

// 保存设置
async function saveSettings(elements) {
  const { lazyLoadChk, randomChk, reverseChk, deduplicateChk, searchQueryChk, tabGroupSelect, containerSelect, saveStatus } = elements;
  const settings = {
    lazyLoading: lazyLoadChk ? lazyLoadChk.checked : false,
    random: randomChk ? randomChk.checked : false,
    reverse: reverseChk ? reverseChk.checked : false,
    deduplicate: deduplicateChk ? deduplicateChk.checked : true,
    handleAsSearchQuery: searchQueryChk ? searchQueryChk.checked : false,
    selectedTabGroupId: tabGroupSelect ? parseInt(tabGroupSelect.value, 10) : NO_TAB_GROUP_ID,
    selectedContainerId: containerSelect ? containerSelect.value : NO_CONTAINER_ID
  };
  await chrome.storage.local.set(settings);
  if (saveStatus) {
    saveStatus.textContent = getLocalizedMessage('saveSuccess');
    setTimeout(() => { saveStatus.textContent = ""; }, 2000);
  }
}

// 打开快捷键管理页面
function openShortcutsPage() {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
}

// 初始化
document.addEventListener('DOMContentLoaded', async function() {
  // 获取 DOM 元素
  const elements = {
    lazyLoadChk: document.getElementById("lazyLoad"),
    randomChk: document.getElementById("random"),
    reverseChk: document.getElementById("reverse"),
    deduplicateChk: document.getElementById("deduplicate"),
    searchQueryChk: document.getElementById("searchQuery"),
    tabGroupSelect: document.getElementById("tabGroupSelect"),
    containerSelect: document.getElementById("containerSelect"),
    saveBtn: document.getElementById("save"),
    saveStatus: document.getElementById("saveStatus"),
    manageShortcutsBtn: document.getElementById("manageShortcuts")
  };

  // 先更新页面文本
  updatePageText();
  
  await Promise.all([
    loadTabGroups(elements.tabGroupSelect), 
    loadContainers(elements.containerSelect)
  ]);
  await loadSettings(elements);

  if (elements.saveBtn) {
    elements.saveBtn.addEventListener("click", () => saveSettings(elements));
  }
  if (elements.manageShortcutsBtn) {
    elements.manageShortcutsBtn.addEventListener("click", openShortcutsPage);
  }
});
