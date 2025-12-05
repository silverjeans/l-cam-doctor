const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const os = require('os');
const https = require('https');
const { analyzeLogFile, analyzeMultipleFiles } = require('./logAnalyzer');

// Google Apps Script 웹 앱 URL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwV5PP0v_jMah1cqoyXLiGCEJkd3d1TIIHL2jlmzbmNKQYfFnhJhMxCqAMffu5NmIk3yA/exec';

let mainWindow;

// ========================================
// Configuration Management
// ========================================
const DEFAULT_CONFIG = {
  analysisDays: 7
};

let appConfig = { ...DEFAULT_CONFIG };

function getConfigPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'config.json');
}

function loadConfig() {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      const loadedConfig = JSON.parse(data);
      appConfig = { ...DEFAULT_CONFIG, ...loadedConfig };
      console.log('[main.js] Config loaded:', appConfig);
    } else {
      saveConfig(DEFAULT_CONFIG);
      console.log('[main.js] Default config created:', appConfig);
    }
  } catch (error) {
    console.error('[main.js] Error loading config:', error);
    appConfig = { ...DEFAULT_CONFIG };
  }
}

function saveConfig(config) {
  try {
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    appConfig = { ...appConfig, ...config };
    console.log('[main.js] Config saved:', appConfig);
    return true;
  } catch (error) {
    console.error('[main.js] Error saving config:', error);
    return false;
  }
}

function createWindow() {
  // 메뉴바 숨김 처리
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    title: 'L-CAM Doctor',
    backgroundColor: '#1e1e1e',
    show: false
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function getDbPath() {
  if (!app.isPackaged) {
    return path.join(__dirname, 'db.json');
  }
  return path.join(process.resourcesPath, 'db.json');
}

function generateReportContent(errorInfo, logFilePath, customerInfo) {
  const timestamp = new Date().toLocaleString('ko-KR');
  return `========================================
L-CAM Doctor 에러 리포트
========================================

생성 일시: ${timestamp}

[고객 정보]
- 성함: ${customerInfo?.name || 'N/A'}
- 업체명: ${customerInfo?.company || 'N/A'}
- 연락처: ${customerInfo?.contact || 'N/A'}

[에러 정보]
- 에러 ID: ${errorInfo?.id || 'N/A'}
- 에러 코드: ${errorInfo?.error_code || 'N/A'}
- 에러 제목: ${errorInfo?.display_title || 'N/A'}
- 심각도: ${errorInfo?.severity || 'N/A'}
- 설명: ${errorInfo?.description || 'N/A'}

[첨부 파일]
- 로그 파일: ${path.basename(logFilePath)}

[사용자 메모]
해결 가이드를 수행했으나 문제가 지속됨.
기술 지원팀에서 로그 파일 분석 요청.

========================================
이 리포트는 L-CAM Doctor에 의해 자동 생성되었습니다.
========================================
`;
}

// GAS를 통해 이메일 전송
function sendEmailViaGAS(subject, body, attachmentBase64, attachmentName) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      subject: subject,
      body: body,
      attachment: attachmentBase64,
      attachmentName: attachmentName
    });

    const url = new URL(GAS_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      rejectUnauthorized: false // 회사 프록시 SSL 인증서 문제 해결
    };

    const req = https.request(options, (res) => {
      let data = '';

      // 리다이렉트 처리 (GAS는 302 리다이렉트를 사용)
      if (res.statusCode === 302 || res.statusCode === 301) {
        const redirectUrl = res.headers.location;
        const redirectUrlObj = new URL(redirectUrl);

        const redirectOptions = {
          hostname: redirectUrlObj.hostname,
          path: redirectUrlObj.pathname + redirectUrlObj.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          },
          rejectUnauthorized: false // 회사 프록시 SSL 인증서 문제 해결
        };

        const redirectReq = https.request(redirectOptions, (redirectRes) => {
          let redirectData = '';
          redirectRes.on('data', chunk => redirectData += chunk);
          redirectRes.on('end', () => {
            try {
              const result = JSON.parse(redirectData);
              resolve(result);
            } catch (e) {
              resolve({ success: true });
            }
          });
        });

        redirectReq.on('error', reject);
        redirectReq.write(postData);
        redirectReq.end();
        return;
      }

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          resolve({ success: true });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function setupIpcHandlers() {
  ipcMain.handle('get-error-data', async () => {
    try {
      const dbPath = getDbPath();
      const data = fs.readFileSync(dbPath, 'utf-8');
      const errors = JSON.parse(data);
      console.log(`[main.js] Loaded ${errors.length} error entries from db.json`);
      return { success: true, data: errors };
    } catch (error) {
      console.error('[main.js] Error reading db.json:', error);
      return { success: false, error: error.message, data: [] };
    }
  });

  ipcMain.handle('process-log-file', async (event, filePath, errorInfo, customerInfo) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, message: '파일을 찾을 수 없습니다.' };
      }

      const desktopPath = path.join(os.homedir(), 'Desktop');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const zipFileName = `LCAM_Report_${timestamp}.zip`;
      const zipFilePath = path.join(desktopPath, zipFileName);

      const zip = new AdmZip();
      const logFileName = path.basename(filePath);
      zip.addLocalFile(filePath, '', logFileName);

      const reportContent = generateReportContent(errorInfo, filePath, customerInfo);
      zip.addFile('report.txt', Buffer.from(reportContent, 'utf-8'));
      zip.writeZip(zipFilePath);

      console.log(`[main.js] Report saved to: ${zipFilePath}`);

      // ZIP 파일을 Base64로 인코딩하여 이메일 전송
      const zipBuffer = fs.readFileSync(zipFilePath);
      const zipBase64 = zipBuffer.toString('base64');

      const emailSubject = `[L-CAM Doctor] 에러 리포트 - ${errorInfo?.error_code || 'Unknown'} (${customerInfo?.company || 'N/A'})`;
      const emailBody = `L-CAM Doctor 에러 리포트

[고객 정보]
- 성함: ${customerInfo?.name || 'N/A'}
- 업체명: ${customerInfo?.company || 'N/A'}
- 연락처: ${customerInfo?.contact || 'N/A'}

[에러 정보]
- 에러 ID: ${errorInfo?.id || 'N/A'}
- 에러 코드: ${errorInfo?.error_code || 'N/A'}
- 에러 제목: ${errorInfo?.display_title || 'N/A'}

첨부된 ZIP 파일을 확인해 주세요.

---
이 메일은 L-CAM Doctor에 의해 자동 발송되었습니다.`;

      try {
        console.log('[main.js] Sending email via GAS...');
        await sendEmailViaGAS(emailSubject, emailBody, zipBase64, zipFileName);
        console.log('[main.js] Email sent successfully');

        return {
          success: true,
          message: `리포트가 생성되고 이메일로 전송되었습니다.\n저장 위치: ${zipFilePath}`,
          filePath: zipFilePath,
          emailSent: true
        };
      } catch (emailError) {
        console.error('[main.js] Email sending failed:', emailError);
        return {
          success: true,
          message: `리포트가 생성되었습니다. (이메일 전송 실패)\n저장 위치: ${zipFilePath}`,
          filePath: zipFilePath,
          emailSent: false
        };
      }
    } catch (error) {
      console.error('[main.js] Error processing log file:', error);
      return {
        success: false,
        message: `처리 중 오류가 발생했습니다: ${error.message}`
      };
    }
  });

  // 최근 로그 파일 스캔 핸들러
  ipcMain.handle('get-recent-logs', async () => {
    try {
      const logDir = 'C:\\Huvitz\\Lilivis\\L-CAM\\log\\machine_logs\\Lilivis Mill';

      // 경로가 존재하지 않으면 빈 배열 반환
      if (!fs.existsSync(logDir)) {
        console.log('[main.js] Log directory not found:', logDir);
        return { success: true, files: [] };
      }

      // 디렉토리 내 파일 목록 읽기
      const files = fs.readdirSync(logDir);

      // .2.txt로 끝나는 파일만 필터링하고 상세 정보 수집
      const logFiles = files
        .filter(fileName => fileName.endsWith('.2.txt'))
        .map(fileName => {
          const filePath = path.join(logDir, fileName);
          const stats = fs.statSync(filePath);
          return {
            fileName: fileName,
            filePath: filePath,
            size: stats.size,
            mtime: stats.mtime.getTime(),
            mtimeFormatted: stats.mtime.toLocaleString('ko-KR')
          };
        })
        // 최신순 정렬
        .sort((a, b) => b.mtime - a.mtime)
        // 최대 5개만 반환
        .slice(0, 5);

      console.log(`[main.js] Found ${logFiles.length} recent log files`);
      return { success: true, files: logFiles };
    } catch (error) {
      console.error('[main.js] Error scanning logs:', error);
      return { success: false, error: error.message, files: [] };
    }
  });

  // 로그 파일 자동 분석 핸들러
  ipcMain.handle('analyze-log', async (event, filePaths) => {
    try {
      console.log('[main.js] Analyzing log files:', filePaths);
      console.log('[main.js] Analysis period:', appConfig.analysisDays, 'days');

      // db.json 로드
      const dbPath = getDbPath();
      const data = fs.readFileSync(dbPath, 'utf-8');
      const errorDatabase = JSON.parse(data);

      // 단일 파일 또는 다중 파일 처리 (분석 기간 전달)
      let result;
      if (Array.isArray(filePaths)) {
        result = await analyzeMultipleFiles(filePaths, errorDatabase, appConfig.analysisDays);
      } else {
        result = await analyzeLogFile(filePaths, errorDatabase, appConfig.analysisDays);
      }

      console.log('[main.js] Analysis complete:', {
        success: result.success,
        totalErrors: result.statistics?.totalErrors || 0,
        uniqueErrors: result.statistics?.uniqueErrors || 0
      });

      return result;
    } catch (error) {
      console.error('[main.js] Error analyzing log:', error);
      return {
        success: false,
        error: `분석 중 오류가 발생했습니다: ${error.message}`
      };
    }
  });

  // 설정 가져오기 핸들러
  ipcMain.handle('get-config', async () => {
    return { success: true, config: appConfig };
  });

  // 설정 저장 핸들러
  ipcMain.handle('save-config', async (event, newConfig) => {
    try {
      const success = saveConfig(newConfig);
      return { success, config: appConfig };
    } catch (error) {
      console.error('[main.js] Error in save-config handler:', error);
      return { success: false, error: error.message };
    }
  });

  // 앱 종료 핸들러
  ipcMain.handle('quit-app', () => {
    app.quit();
  });
}

app.whenReady().then(() => {
  loadConfig(); // 설정 로드
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
