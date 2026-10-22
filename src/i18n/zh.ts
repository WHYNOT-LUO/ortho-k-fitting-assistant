// Simplified Chinese — the default language. Every key here must also exist in en.ts
// (TypeScript checks this). Placeholders in {braces} are filled in by translate().
export const zh = {
  // App shell
  'app.title': '角膜塑形镜验配助手',
  'app.subtitle': 'Ortho-K Fitting Assistant',
  'app.banner':
    '研究与演示原型 —— 仅供学习和演示，不得用于临床决策。所有建议须由验光师判断。',
  'app.privacy': '数据只保存在本设备的浏览器中，不会上传。仅使用匿名病例编号。使用真实病例数据前须获得诊所许可。',
  'nav.cases': '病例',
  'nav.newCase': '新建病例',
  'nav.dashboard': '数据看板',
  'nav.rules': '规则',
  'lang.toggle': 'English',
  'common.save': '保存',
  'common.cancel': '取消',
  'common.delete': '删除',
  'common.edit': '编辑',
  'common.back': '返回',
  'common.yes': '是',
  'common.no': '否',
  'common.notRecorded': '未记录',
  'common.notFound': '找不到这个页面。',
} as const;

export type MessageKey = keyof typeof zh;
