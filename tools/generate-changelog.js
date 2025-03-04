#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 支持的语言
const LANGUAGES = {
  en: {
    name: 'English 🇬🇧',
    feature: 'Feature',
    fix: 'Fix',
    improvement: 'Improvement'
  },
  zh: {
    name: '中文 🇨🇳',
    feature: '功能',
    fix: '修复',
    improvement: '改进'
  },
  ja: {
    name: '日本語 🇯🇵',
    feature: '機能',
    fix: '修正',
    improvement: '改善'
  },
  ko: {
    name: '한국어 🇰🇷',
    feature: '기능',
    fix: '수정',
    improvement: '개선'
  },
  es: {
    name: 'Español 🇪🇸',
    feature: 'Característica',
    fix: 'Corrección',
    improvement: 'Mejora'
  },
  ru: {
    name: 'Русский 🇷🇺',
    feature: 'Функция',
    fix: 'Исправление',
    improvement: 'Улучшение'
  },
  de: {
    name: 'Deutsch 🇩🇪',
    feature: 'Funktion',
    fix: 'Fehlerbehebung',
    improvement: 'Verbesserung'
  }
};

// 每种语言的翻译映射
const TRANSLATIONS = {
  features: {
    en: (text) => `${LANGUAGES.en.feature}: ${text}`,
    zh: (text) => `${LANGUAGES.zh.feature}：${text}`,
    ja: (text) => `${LANGUAGES.ja.feature}：${text}`,
    ko: (text) => `${LANGUAGES.ko.feature}: ${text}`,
    es: (text) => `${LANGUAGES.es.feature}: ${text}`,
    ru: (text) => `${LANGUAGES.ru.feature}: ${text}`,
    de: (text) => `${LANGUAGES.de.feature}: ${text}`
  },
  fixes: {
    en: (text) => `${LANGUAGES.en.fix}: ${text}`,
    zh: (text) => `${LANGUAGES.zh.fix}：${text}`,
    ja: (text) => `${LANGUAGES.ja.fix}：${text}`,
    ko: (text) => `${LANGUAGES.ko.fix}: ${text}`,
    es: (text) => `${LANGUAGES.es.fix}: ${text}`,
    ru: (text) => `${LANGUAGES.ru.fix}: ${text}`,
    de: (text) => `${LANGUAGES.de.fix}: ${text}`
  },
  improvements: {
    en: (text) => `${LANGUAGES.en.improvement}: ${text}`,
    zh: (text) => `${LANGUAGES.zh.improvement}：${text}`,
    ja: (text) => `${LANGUAGES.ja.improvement}：${text}`,
    ko: (text) => `${LANGUAGES.ko.improvement}: ${text}`,
    es: (text) => `${LANGUAGES.es.improvement}: ${text}`,
    ru: (text) => `${LANGUAGES.ru.improvement}: ${text}`,
    de: (text) => `${LANGUAGES.de.improvement}: ${text}`
  }
};

// 获取今天的日期 YYYY-MM-DD 格式
function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 收集用户输入的更新内容
async function collectChanges() {
  const changes = {
    features: [],
    fixes: [],
    improvements: []
  };

  // 版本号
  const version = await new Promise(resolve => {
    rl.question('输入版本号 (例如: 1.0.2): ', answer => {
      resolve(answer.trim());
    });
  });

  console.log('\n添加新功能 (每行一个，输入空行结束):');
  while (true) {
    const feature = await new Promise(resolve => {
      rl.question('- ', answer => {
        resolve(answer.trim());
      });
    });
    if (!feature) break;
    changes.features.push(feature);
  }

  console.log('\n添加修复 (每行一个，输入空行结束):');
  while (true) {
    const fix = await new Promise(resolve => {
      rl.question('- ', answer => {
        resolve(answer.trim());
      });
    });
    if (!fix) break;
    changes.fixes.push(fix);
  }

  console.log('\n添加改进 (每行一个，输入空行结束):');
  while (true) {
    const improvement = await new Promise(resolve => {
      rl.question('- ', answer => {
        resolve(answer.trim());
      });
    });
    if (!improvement) break;
    changes.improvements.push(improvement);
  }

  return { version, changes };
}

// 生成更新日志条目
function generateChangelogEntry(version, changes) {
  const date = getTodayDate();
  let entry = `## [${version}] - ${date}\n\n`;

  // 为每种语言生成内容
  Object.keys(LANGUAGES).forEach(lang => {
    entry += `### ${LANGUAGES[lang].name}\n`;
    
    changes.features.forEach(feature => {
      entry += `- ${TRANSLATIONS.features[lang](feature)}\n`;
    });
    
    changes.fixes.forEach(fix => {
      entry += `- ${TRANSLATIONS.fixes[lang](fix)}\n`;
    });
    
    changes.improvements.forEach(improvement => {
      entry += `- ${TRANSLATIONS.improvements[lang](improvement)}\n`;
    });
    
    entry += '\n';
  });

  return entry;
}

// 更新CHANGELOG.md文件
function updateChangelog(entry) {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  let content = '';
  
  if (fs.existsSync(changelogPath)) {
    content = fs.readFileSync(changelogPath, 'utf8');
    
    // 找到标题行之后的位置
    const titleEndPos = content.indexOf('\n', content.indexOf('# HistoryHeat Changelog'));
    
    if (titleEndPos !== -1) {
      content = content.slice(0, titleEndPos + 1) + '\n' + entry + content.slice(titleEndPos + 1);
    } else {
      content = '# HistoryHeat Changelog\n\n' + entry + content;
    }
  } else {
    content = '# HistoryHeat Changelog\n\n' + entry;
  }
  
  fs.writeFileSync(changelogPath, content);
  console.log(`\n更新日志已更新，请查看 CHANGELOG.md 文件。`);
}

// 主函数
async function main() {
  console.log('HistoryHeat 更新日志生成器\n');
  
  try {
    const { version, changes } = await collectChanges();
    const entry = generateChangelogEntry(version, changes);
    updateChangelog(entry);
  } catch (error) {
    console.error('生成更新日志时出错:', error);
  } finally {
    rl.close();
  }
}

main(); 