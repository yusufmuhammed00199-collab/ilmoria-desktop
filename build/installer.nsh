; Ilmoria's setup, in the brand's colours: night blue welcome and finish pages beside the
; Ilmoria panel, night blue page headers, and the setup's words in English and Arabic.
; (Included before the installer's pages, so these settings apply to all of them.)

!define MUI_BGCOLOR "0F1B33"
!define MUI_TEXTCOLOR "FFFFFF"
!define MUI_WELCOMEPAGE_TITLE_3LINES
!define MUI_FINISHPAGE_TITLE_3LINES

; 1033: English, 1025: Arabic
LangString ilmWelcomeTitle 1033 "Welcome to Ilmoria"
LangString ilmWelcomeTitle 1025 "مرحبًا بك في إلموريا"
LangString ilmWelcomeText 1033 "Your school's lessons, grades, messages and calls, in a window of its own on this computer.$\r$\n$\r$\nIt works with the same account and the same information as the Ilmoria website.$\r$\n$\r$\nClick Next to continue."
LangString ilmWelcomeText 1025 "دروس مدرستك ودرجاتك ورسائلك ومكالماتك في نافذة خاصة بها على هذا الجهاز.$\r$\n$\r$\nيعمل بالحساب نفسه والمعلومات نفسها التي على موقع إلموريا.$\r$\n$\r$\nانقر «التالي» للمتابعة."
LangString ilmFinishTitle 1033 "Ilmoria is ready"
LangString ilmFinishTitle 1025 "إلموريا جاهز"
LangString ilmFinishText 1033 "Sign in with the email or username and password your school gave you.$\r$\n$\r$\nIlmoria keeps running in the tray when you close its window, so messages and calls still reach you."
LangString ilmFinishText 1025 "سجّل الدخول بالبريد الإلكتروني أو اسم المستخدم وكلمة المرور التي أعطتك إياها مدرستك.$\r$\n$\r$\nيبقى إلموريا يعمل في علبة النظام عند إغلاق نافذته، لتصلك الرسائل والمكالمات."
LangString ilmRun 1033 "Open Ilmoria now"
LangString ilmRun 1025 "افتح إلموريا الآن"


!ifndef BUILD_UNINSTALLER
  !define MUI_FINISHPAGE_TITLE "$(ilmFinishTitle)"
  !define MUI_FINISHPAGE_TEXT "$(ilmFinishText)"
  !define MUI_FINISHPAGE_RUN_TEXT "$(ilmRun)"
!endif

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "$(ilmWelcomeTitle)"
  !define MUI_WELCOMEPAGE_TEXT "$(ilmWelcomeText)"
  !insertmacro MUI_PAGE_WELCOME
!macroend

; The setup's own steps (who it is installed for, removing it) in Arabic too. They replace the
; English the setup uses for Arabic, so they come after its own words (customHeader comes last).
!macro customHeader
  LangString chooseInstallationOptions 1025 "خيارات التثبيت"
  LangString chooseUninstallationOptions 1025 "خيارات الإزالة"
  LangString whoShouldThisApplicationBeInstalledFor 1025 "لمن تريد تثبيت إلموريا؟"
  LangString selectUserMode 1025 "اختر إن كان إلموريا لكل من يستخدم هذا الجهاز أو لك وحدك."
  LangString onlyForMe 1025 "لي &وحدي"
  LangString forAll 1025 "لكل من يستخدم هذا الجهاز (&كل المستخدمين)"
  LangString freshInstallForAll 1025 "تثبيت جديد لكل المستخدمين (يحتاج صلاحيات المسؤول)."
  LangString freshInstallForCurrent 1025 "تثبيت جديد لك وحدك."
  LangString whichInstallationShouldBeRemoved 1025 "أي تثبيت تريد إزالته؟"
  LangString whichInstallationRemove 1025 "إلموريا مثبّت لكل المستخدمين ولك وحدك أيضًا.$\r$\nأيهما تريد إزالته؟"
  LangString loginWithAdminAccount 1025 "سجّل الدخول بحساب المسؤول لتثبيته لكل المستخدمين."
  LangString perUserInstallExists 1025 "إلموريا مثبّت لك وحدك من قبل."
  LangString perUserInstall 1025 "إلموريا مثبّت لك وحدك."
  LangString perMachineInstallExists 1025 "إلموريا مثبّت لكل المستخدمين من قبل."
  LangString perMachineInstall 1025 "إلموريا مثبّت لكل المستخدمين."
  LangString reinstallUpgrade 1025 "إعادة التثبيت أو التحديث"
  LangString uninstall 1025 "إزالة"
  LangString installing 1025 "جارٍ تثبيت إلموريا…"
  LangString areYouSureToUninstall 1025 "هل تريد إزالة إلموريا؟"
!macroend
