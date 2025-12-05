const { contextBridge, ipcRenderer } = require('electron');

// 렌더러 프로세스에 안전하게 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // 에러 데이터 로드 (get-error-data IPC 핸들러 호출)
  getErrorData: () => ipcRenderer.invoke('get-error-data'),

  // 로그 파일 처리 (ZIP 압축 후 저장)
  processLogFile: (filePath, errorInfo, customerInfo) =>
    ipcRenderer.invoke('process-log-file', filePath, errorInfo, customerInfo),

  // 로그 파일 자동 분석 (최근 7일간 에러 추출)
  analyzeLog: (filePaths) => ipcRenderer.invoke('analyze-log', filePaths),

  // 최근 로그 파일 목록 가져오기
  getRecentLogs: () => ipcRenderer.invoke('get-recent-logs'),

  // 설정 가져오기
  getConfig: () => ipcRenderer.invoke('get-config'),

  // 설정 저장하기
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),

  // 앱 종료
  quitApp: () => ipcRenderer.invoke('quit-app')
});
