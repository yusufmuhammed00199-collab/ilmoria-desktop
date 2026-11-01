'use strict';
/** The app's own words (menus, tray, its notices and small windows), in English and Arabic. */
const STRINGS = {
  open: ['Open Ilmoria', 'فتح إلموريا'],
  downloadVersion: ['Download version {v}', 'تنزيل الإصدار {v}'],
  notifications: ['Notifications', 'الإشعارات'],
  notifyAll: ['All new messages', 'كل الرسائل الجديدة'],
  notifyDirect: ['Direct messages and mentions', 'الرسائل المباشرة والإشارات'],
  notifyNone: ['Off (calls still ring)', 'إيقاف (تبقى المكالمات ترنّ)'],
  sound: ['Sound', 'الصوت'],
  openAtLogin: ['Open when the computer starts', 'الفتح عند تشغيل الجهاز'],
  settings: ['Settings…', 'الإعدادات…'],
  schoolAddress: ['School address…', 'عنوان المدرسة…'],
  quit: ['Quit Ilmoria', 'إنهاء إلموريا'],
  closeWindow: ['Close window', 'إغلاق النافذة'],
  file: ['File', 'ملف'],
  view: ['View', 'عرض'],
  openInBrowser: ['Open Ilmoria in your browser', 'فتح إلموريا في المتصفح'],
  checkUpdates: ['Check for updates…', 'البحث عن تحديثات…'],
  about: ['About Ilmoria', 'حول إلموريا'],
  unread: ['{n} unread', '{n} غير مقروءة'],
  stillRunning: ['Ilmoria is still running', 'ما زال إلموريا يعمل'],
  stillRunningBody: ['Messages and calls will still reach you. Open it again from the arrow in the taskbar.', 'ستصلك الرسائل والمكالمات. افتحه مجددًا من السهم في شريط المهام.'],
  downloaded: ['Download complete', 'اكتمل التنزيل'],
  updateReady: ['Ilmoria {v} is ready', 'الإصدار {v} من إلموريا جاهز'],
  updateBody: ['Click to download the new version.', 'انقر لتنزيل الإصدار الجديد.'],
  latest: ['You have the latest version', 'لديك أحدث إصدار'],
  updateFailed: ['Updates could not be checked', 'تعذّر البحث عن تحديثات'],
  updateFailedBody: ['Check your internet connection and try again.', 'تحقّق من اتصالك بالإنترنت وحاول مرة أخرى.'],
  noSuggestions: ['No suggestions', 'لا توجد اقتراحات'],
  addToDictionary: ['Add to dictionary', 'إضافة إلى القاموس'],
  openLink: ['Open link', 'فتح الرابط'],
  copyLink: ['Copy link', 'نسخ الرابط'],
  copyImage: ['Copy image', 'نسخ الصورة'],
  saveImage: ['Save image', 'حفظ الصورة'],
  back: ['Back', 'رجوع'],
  forward: ['Forward', 'تقدّم'],
  shareTitle: ['Share your screen', 'مشاركة الشاشة'],
  schoolTitle: ['School address', 'عنوان المدرسة'],
};

function t(lang, key, vars = {}) {
  const pair = STRINGS[key];
  if (!pair) return key;
  let s = pair[lang === 'ar' ? 1 : 0];
  for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

module.exports = { t };
