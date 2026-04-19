// Localization utility for Chrome extensions
// Automatically detects browser language and provides translations

class Localizer {
  constructor() {
    this.currentLang = 'zh_CN'; // default to Chinese
    this.messages = {};
    this.loadMessages();
    this.detectLanguage();
  }

  // Load messages from JSON files
  async loadMessages() {
    try {
      const response = await fetch(chrome.runtime.getURL('_locales/en/messages.json'));
      if (response.ok) {
        this.messages.en = await response.json();
      }
    } catch (error) {
      console.warn('Failed to load English messages:', error);
    }

    try {
      const response = await fetch(chrome.runtime.getURL('_locales/zh_CN/messages.json'));
      if (response.ok) {
        this.messages['zh_CN'] = await response.json();
      }
    } catch (error) {
      console.warn('Failed to load Chinese messages:', error);
    }
  }

  // Detect browser language and set accordingly
  detectLanguage() {
    const navigatorLang = navigator.language || navigator.userLanguage;
    const acceptLanguages = navigator.languages || [navigatorLang];

    // Check if any accepted language starts with 'zh' (Chinese)
    const hasChinese = acceptLanguages.some(lang =>
      lang.toLowerCase().startsWith('zh')
    );

    // If Chinese is preferred or only language, use Chinese
    // Otherwise use English
    this.currentLang = hasChinese ? 'zh_CN' : 'en';
  }

  // Get translated message
  getMessage(key, substitutions = {}) {
    const message = this.messages[this.currentLang]?.[key];
    if (!message) {
      // Fallback to English if translation not found
      const fallback = this.messages.en?.[key];
      if (!fallback) return key; // Return key if no fallback either

      let text = fallback.message;
      Object.entries(substitutions).forEach(([placeholder, value]) => {
        text = text.replace(`{{${placeholder}}}`, value);
      });
      return text;
    }

    let text = message.message;
    Object.entries(substitutions).forEach(([placeholder, value]) => {
      text = text.replace(new RegExp(`{{${placeholder}}}`), value);
    });
    return text;
  }

  // Update document title
  updateTitle() {
    const titleKey = 'optionsTitle';
    const title = this.getMessage(titleKey);
    if (document.title !== title) {
      document.title = title;
    }
  }

  // Update all elements with data-i18n attribute
  updateElements() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const text = this.getMessage(key);
      element.textContent = text;

      // Handle HTML content (like welcomeText which contains <strong> tags)
      if (element.innerHTML && key === 'welcomeText') {
        element.innerHTML = text;
      }
    });
  }

  // Initialize localization on page load
  initialize() {
    this.updateTitle();
    this.updateElements();

    // Log current language for debugging
    console.log(`Localization initialized with language: ${this.currentLang}`);

    // Listen for storage changes (in case user manually changes language preference)
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.language) {
        this.currentLang = changes.language.newValue;
        this.updateTitle();
        this.updateElements();
      }
    });
  }

  // Set custom language (for testing or user preference)
  setLanguage(lang) {
    if (this.messages[lang]) {
      this.currentLang = lang;
      chrome.storage.local.set({ language: lang });
      this.updateTitle();
      this.updateElements();
    }
  }
}

// Create global localizer instance
window.localizer = new Localizer();