; ===========================================================================
; Libraryxxx — Custom NSIS Installer Script
; ===========================================================================
; This file is included by electron-builder's NSIS pipeline.
; It uses MUI2 macros to define a custom Welcome page, Options page,
; and Finish page with branded visuals.
; ===========================================================================

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "nsDialogs.nsh"
!include "FileFunc.nsh"

; Variables removed since oneClick: true skips the options page
; MUI Settings — Colors & Branding
; ---------------------------------------------------------------------------

; Welcome / Finish page sidebar text
!define MUI_WELCOMEPAGE_TITLE "Welcome to Libraryxxx Setup"
!define MUI_WELCOMEPAGE_TEXT "This wizard will guide you through the installation of Libraryxxx — your personal gaming library.$\r$\n$\r$\nFeatures:$\r$\n    • Organize and browse your game collection$\r$\n    • Track playtime and achievements$\r$\n    • Beautiful, modern interface$\r$\n$\r$\nClick Next to continue."

; Directory page
!define MUI_DIRECTORYPAGE_TEXT_TOP "Choose the folder in which to install Libraryxxx.$\r$\nThe installer requires approximately 200 MB of free disk space."

; Instfiles page
!define MUI_INSTFILESPAGE_FINISHHEADER_TEXT "Installation Complete"
!define MUI_INSTFILESPAGE_FINISHHEADER_SUBTEXT "Libraryxxx has been successfully installed on your computer."

; Finish page
!define MUI_FINISHPAGE_TITLE "Libraryxxx Setup Complete"
!define MUI_FINISHPAGE_TEXT "Libraryxxx has been installed on your computer.$\r$\n$\r$\nClick Finish to close this wizard."
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
!define MUI_FINISHPAGE_RUN_TEXT "Launch Libraryxxx"
!define MUI_FINISHPAGE_RUN_NOTCHECKED

; Uninstaller
!define MUI_UNCONFIRMPAGE_TEXT_TOP "Libraryxxx will be uninstalled from the following folder. Click Uninstall to continue."

; ---------------------------------------------------------------------------
; Custom Welcome Page macro (electron-builder hook)
; ---------------------------------------------------------------------------
!macro customWelcomePage
  ; This replaces the default welcome page
  !insertmacro MUI_PAGE_WELCOME
!macroend

; ---------------------------------------------------------------------------
; Custom page shown after directory selection (electron-builder hook)
; ---------------------------------------------------------------------------
!macro customPageAfterChangeDir
  ; Removed Page custom optionsPageCreate optionsPageLeave
!macroend

!ifndef BUILD_UNINSTALLER
; Function optionsPageCreate and optionsPageLeave removed
; because oneClick: true skips custom pages and
; causes warning 6010 (treated as error by electron-builder).
!endif

; ---------------------------------------------------------------------------
; Custom Finish page (electron-builder hook)
; ---------------------------------------------------------------------------
!macro customFinishPage
  !insertmacro MUI_PAGE_FINISH
!macroend



; ---------------------------------------------------------------------------
; Custom uninstaller pages (electron-builder hooks)
; ---------------------------------------------------------------------------
!macro customUnWelcomePage
  !insertmacro MUI_UNPAGE_WELCOME
!macroend

!macro customUninstallPage
  ; No extra custom uninstall pages needed
!macroend

; ---------------------------------------------------------------------------
; Custom uninstall actions
; ---------------------------------------------------------------------------
!macro customUnInstall
  ; Remove desktop shortcut
  Delete "$DESKTOP\Libraryxxx.lnk"
  
  ; Remove Start Menu folder
  RMDir /r "$SMPROGRAMS\Libraryxxx"
  
  ; In a silent auto-update scenario, we NEVER want to delete user data
  ; or block the uninstaller with a prompt.
!macroend
