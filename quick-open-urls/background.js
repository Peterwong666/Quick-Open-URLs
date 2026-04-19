// 默认设置
const DEFAULTS = {
  lazyLoading: false,
  random: false,
  reverse: false,
  deduplicate: true,
  handleAsSearchQuery: false,
  selectedTabGroupId: -1,      // -1 = 无分组, -2 = 新建分组
  selectedContainerId: "NO_CONTAINER_ID"
};

// 常量（与 load 模块保持一致）
const NO_TAB_GROUP_ID = -1;
const NEW_TAB_GROUP_ID = -2;
const NO_CONTAINER_ID = "NO_CONTAINER_ID";
const NEW_CONTAINER_ID = "NEW_CONTAINER_ID";
const CONTAINER_COLORS = ["blue", "turquoise", "green", "yellow", "orange", "red", "pink", "purple"];

// 不支持懒加载的协议
const NO_LAZY_LOAD_SCHEMES = ["file", "view-source", "moz-extension", "chrome", "chrome-extension", "edge", "extension"];

// 工具函数 ----------------------------------------------------------------
function hasValidSchema(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function getSchema(url) {
  return hasValidSchema(url) ? new URL(url).protocol.replace(":", "") : "";
}

function canLazyLoad(url) {
  return NO_LAZY_LOAD_SCHEMES.indexOf(getSchema(url)) === -1;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function splitInputLines(text, deduplicate) {
  const lines = text.split(/\r\n?|\n/).filter(line => line.trim() !== "");
  return deduplicate ? [...new Set(lines)] : lines;
}

// 提取文本中的所有 URL（使用正则，同原插件）
function extractURLsFromText(text) {
  const urlregex = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()[\]{};:'".,<>?«»“”‘’]))/gi;
  const matches = [];
  let match;
  while ((match = urlregex.exec(text)) !== null) {
    matches.push(match[0]);
  }
  return matches;
}

// 核心打开逻辑 ------------------------------------------------------------
async function openUrlsFromText(selectedText, settings) {
  // 1. 提取 URL（如果文本本身是 URL 列表则每行一个，否则用正则提取）
  let lines = [];
  if (selectedText.includes("\n")) {
    lines = splitInputLines(selectedText, settings.deduplicate);
  } else {
    // 单行或无换行，先用正则提取
    const extracted = extractURLsFromText(selectedText);
    lines = settings.deduplicate ? [...new Set(extracted)] : extracted;
  }

  if (lines.length === 0) return;

  if (settings.reverse) lines.reverse();
  if (settings.random) lines = shuffleArray(lines);

  // 处理容器：若选择新建容器则先创建
  let containerId = settings.selectedContainerId;
  if (containerId === NEW_CONTAINER_ID) {
    try {
      const container = await chrome.contextualIdentities.create({
        name: "QOURLs " + new Date().toLocaleString(),
        color: CONTAINER_COLORS[Math.floor(Math.random() * CONTAINER_COLORS.length)],
        icon: "circle"
      });
      containerId = container.cookieStoreId;
    } catch (err) {
      console.error("创建容器失败", err);
      containerId = NO_CONTAINER_ID;
    }
  }

  const createdTabs = [];
  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (line === "") continue;

    const hasSchema = hasValidSchema(line);
    const isSearchQuery = !hasSchema && settings.handleAsSearchQuery;
    let url = line;

    if (!hasSchema && !isSearchQuery) {
      url = "http://" + url;
    }

    // 懒加载处理
    if (settings.lazyLoading && canLazyLoad(url) && !isSearchQuery) {
      url = chrome.runtime.getURL("lazyloading.html#") + url;
    }

    const createProps = {
      url: isSearchQuery ? "about:blank" : url,
      active: false
    };
    if (containerId && containerId !== NO_CONTAINER_ID) {
      createProps.cookieStoreId = containerId;
    }

    try {
      const tab = await chrome.tabs.create(createProps);
      createdTabs.push(tab);
      if (isSearchQuery) {
        // 对于搜索查询，在标签页打开后执行搜索
        await chrome.search.query({ text: url, tabId: tab.id });
      }
    } catch (err) {
      console.error("创建标签失败", createProps, err);
    }
  }

  // 标签组分组建
  if (settings.selectedTabGroupId != null && settings.selectedTabGroupId !== NO_TAB_GROUP_ID) {
    const tabIds = createdTabs.map(t => t.id).filter(id => id !== undefined);
    if (tabIds.length > 0) {
      try {
        if (settings.selectedTabGroupId === NEW_TAB_GROUP_ID) {
          // 新建组
          const groupId = await chrome.tabs.group({ tabIds });
          // 可选：给组起个名字
          await chrome.tabGroups.update(groupId, { title: getLocalizedMessage('groupTitle') });
        } else {
          await chrome.tabs.group({ tabIds, groupId: settings.selectedTabGroupId });
        }
      } catch (err) {
        console.error("分组失败", err);
      }
    }
  }
}

// Get selected text from current tab
async function getSelectedText() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return null;

  // Inject script to get selected text
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection().toString()
  });
  return results[0]?.result || null;
}

// 检测浏览器语言
function getBrowserLanguage() {
  const lang = navigator.language || navigator.userLanguage || 'en';
  return lang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

// Localization function
function getLocalizedMessage(key) {
  const lang = getBrowserLanguage();
  const messages = {
    zh: {
      'noSelectionText': '无标签组',
      'newSelectionText': '新建标签组',
      'unnamedGroup': '未命名组',
      'noContainerText': '无容器',
      'newContainerText': '新建容器',
      'groupTitle': '快速打开组'
    },
    en: {
      'noSelectionText': 'No Tab Group',
      'newSelectionText': 'New Tab Group',
      'unnamedGroup': 'Unnamed Group',
      'noContainerText': 'No Container',
      'newContainerText': 'New Container',
      'groupTitle': 'Quick Open Group'
    }
  };
  return messages[lang][key] || messages['en'][key] || key;
}

// 加载设置并打开选中链接
async function handleOpenSelectedUrls() {
  const settings = await chrome.storage.local.get(DEFAULTS);
  const finalSettings = { ...DEFAULTS, ...settings };

  const selectedText = await getSelectedText();
  if (!selectedText || selectedText.trim() === "") {
    console.log("没有选中任何文本");
    // 可以提示用户，但为了体验不弹窗
    return;
  }

  await openUrlsFromText(selectedText, finalSettings);
}

// 监听快捷键命令
chrome.commands.onCommand.addListener((command) => {
  if (command === "open-selected-urls") {
    handleOpenSelectedUrls().catch(console.error);
  }
});

// 初始化：确保 storage 有默认值（可选）
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(Object.keys(DEFAULTS));
  const toSet = {};
  for (const [key, def] of Object.entries(DEFAULTS)) {
    if (existing[key] === undefined) toSet[key] = def;
  }
  if (Object.keys(toSet).length) await chrome.storage.local.set(toSet);

  // 创建上下文菜单项
  createContextMenu();
});

// 当扩展加载时创建上下文菜单
chrome.runtime.onStartup.addListener(() => {
  createContextMenu();
});

// 创建上下文菜单
function createContextMenu() {
  // 先清除现有菜单项（避免重复创建）
  chrome.contextMenus.removeAll(() => {
    console.log("Creating context menus...");

    // 创建第一个菜单项 - GitHub 链接 (点击扩展图标右键菜单)
    chrome.contextMenus.create({
      id: "github-repo",
      title: "Quick-Open-URLs on GitHub",
      contexts: ["action"]
    });

    // 创建第二个菜单项 - 打开选中URLs
    chrome.contextMenus.create({
      id: "open-selected-urls-menu",
      title: "Open Selected URLs",
      contexts: ["action"]
    });

    console.log("Context menus created successfully");
  });
}

// 处理上下文菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("Context menu clicked:", info.menuItemId, info);

  if (info.menuItemId === "github-repo") {
    // 打开GitHub仓库
    chrome.tabs.create({ url: "https://github.com/Peterwong666/Quick-Open-URLs" });
  } else if (info.menuItemId === "open-selected-urls-menu") {
    // 执行打开选中URLs的功能
    handleOpenSelectedUrls().catch(console.error);
  }
});