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

; ---------------------------------------------------------------------------
; Variables for custom options
; ---------------------------------------------------------------------------
!ifndef BUILD_UNINSTALLER
Var DesktopShortcut
Var StartMenuShortcut
Var LaunchAfterInstall
!endif

; ---------------------------------------------------------------------------
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
  Page custom optionsPageCreate optionsPageLeave
!macroend

!ifndef BUILD_UNINSTALLER
Function optionsPageCreate
  !insertmacro MUI_HEADER_TEXT "Installation Options" "Choose additional options for the installation."
  
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  
  ; Desktop shortcut checkbox
  ${NSD_CreateCheckBox} 20u 20u 280u 12u "Create desktop shortcut"
  Pop $DesktopShortcut
  ${NSD_SetState} $DesktopShortcut ${BST_CHECKED}
  
  ; Start menu shortcut checkbox
  ${NSD_CreateCheckBox} 20u 40u 280u 12u "Create Start Menu shortcut"
  Pop $StartMenuShortcut
  ${NSD_SetState} $StartMenuShortcut ${BST_CHECKED}
  
  ; Launch after install checkbox
  ${NSD_CreateCheckBox} 20u 60u 280u 12u "Launch Libraryxxx after installation"
  Pop $LaunchAfterInstall
  ${NSD_SetState} $LaunchAfterInstall ${BST_CHECKED}
  
  ; Info label
  ${NSD_CreateLabel} 20u 90u 280u 24u "The application will be installed in:$\r$\n$INSTDIR"
  Pop $0
  
  ; Disk space info
  ${GetSize} "$INSTDIR" "/M=*.*" $1 $2 $3
  ${NSD_CreateLabel} 20u 120u 280u 12u "Estimated space required: ~200 MB"
  Pop $0
  
  nsDialogs::Show
FunctionEnd

Function optionsPageLeave
  ; Read checkbox states - we store results in variables
  ${NSD_GetState} $DesktopShortcut $DesktopShortcut
  ${NSD_GetState} $StartMenuShortcut $StartMenuShortcut
  ${NSD_GetState} $LaunchAfterInstall $LaunchAfterInstall
FunctionEnd
!endif

; ---------------------------------------------------------------------------
; Custom Finish page (electron-builder hook)
; ---------------------------------------------------------------------------
!macro customFinishPage
  !insertmacro MUI_PAGE_FINISH
!macroend

; ---------------------------------------------------------------------------
; Post-installation: create shortcuts based on user choices
; ---------------------------------------------------------------------------
!macro customInstall
  ; Create desktop shortcut if selected
  ${If} $DesktopShortcut == ${BST_CHECKED}
    CreateShortCut "$DESKTOP\Libraryxxx.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
  ${EndIf}
  
  ; Create Start Menu shortcut if selected
  ${If} $StartMenuShortcut == ${BST_CHECKED}
    CreateDirectory "$SMPROGRAMS\Libraryxxx"
    CreateShortCut "$SMPROGRAMS\Libraryxxx\Libraryxxx.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
    CreateShortCut "$SMPROGRAMS\Libraryxxx\Uninstall.lnk" "$INSTDIR\${UNINSTALL_FILENAME}" "" "$INSTDIR\${UNINSTALL_FILENAME}" 0
  ${EndIf}
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
  
  ; Ask if user wants to remove app data
  MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to remove Libraryxxx configuration and data?$\r$\n$\r$\nThis will delete your settings and database." IDYES removeData IDNO skipRemoveData
  
  removeData:
    RMDir /r "$APPDATA\Libraryxxx"
    RMDir /r "$LOCALAPPDATA\Libraryxxx"
    Goto doneRemoveData
    
  skipRemoveData:
  doneRemoveData:
!macroend
