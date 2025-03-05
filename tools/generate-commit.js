#!/usr/bin/env node
import readline from 'readline';
import { execSync } from 'child_process';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const LANGUAGES = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  es: 'Español',
  ru: 'Русский',
  de: 'Deutsch'
};

const COMMIT_TYPES = {
  feat: '功能',
  fix: '修复',
  chore: '维护',
  docs: '文档',
  style: '样式',
  refactor: '重构',
  test: '测试'
};

async function main() {
  console.log('\n生成多语言提交信息\n');

  // 选择提交类型
  const type = await new Promise(resolve => {
    rl.question('选择提交类型 (feat/fix/chore/docs/style/refactor/test): ', answer => {
      resolve(answer.trim());
    });
  });

  // 收集各语言描述
  const messages = {};
  for (const [code, lang] of Object.entries(LANGUAGES)) {
    const message = await new Promise(resolve => {
      rl.question(`${lang} 提交描述: `, answer => resolve(answer.trim()));
    });
    messages[code] = message;
  }

  // 构建提交信息
  let commitMessage = `${type}: ${messages['zh']}\n\n`;
  Object.entries(messages).forEach(([code, msg]) => {
    commitMessage += `${LANGUAGES[code]}: ${msg}\n`;
  });

  // 执行git提交
  try {
    execSync(`git commit -m "${type}: ${messages['zh']}" -m "${commitMessage}"`, { stdio: 'inherit' });
    console.log('\n提交成功！');
  } catch (error) {
    console.error('提交失败:', error.message);
  } finally {
    rl.close();
  }
}

main();