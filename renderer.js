/**
 * L-CAM Doctor - 렌더러 프로세스
 * 검색, 솔루션 상세, 로그 리포트 기능 구현
 */

// ========================================
// 상태 관리
// ========================================
const state = {
  errors: [],
  currentError: null,
  selectedFile: null,
  recentLogs: [],
  currentAnalysisResult: null
};

// ========================================
// DOM 요소 참조
// ========================================
const elements = {
  // Views
  mainView: document.getElementById('main-view'),
  detailView: document.getElementById('detail-view'),
  analyzeView: document.getElementById('analyze-view'),

  // 탭 네비게이션
  tabSearch: document.getElementById('tab-search'),
  tabAnalyze: document.getElementById('tab-analyze'),

  // 로그 분석 - 하이브리드 UI
  hybridSection: document.getElementById('hybrid-section'),
  logListSection: document.getElementById('log-list-section'),
  logEmptySection: document.getElementById('log-empty-section'),
  logGuideSection: document.getElementById('log-guide-section'),
  logFileList: document.getElementById('log-file-list'),
  refreshLogsBtn: document.getElementById('refresh-logs-btn'),
  toggleGuideBtn: document.getElementById('toggle-guide-btn'),
  guideContent: document.getElementById('guide-content'),
  analysisResultSection: document.getElementById('analysis-result-section'),
  analysisStats: document.getElementById('analysis-stats'),
  analysisSummary: document.getElementById('analysis-summary'),
  analysisErrors: document.getElementById('analysis-errors'),
  backToListBtn: document.getElementById('back-to-list-btn'),
  analyzeLoading: document.getElementById('analyze-loading'),

  // 수동 업로드
  logDropZone: document.getElementById('log-drop-zone'),
  logFileInput: document.getElementById('log-file-input'),

  // 메인 화면 - 로그 분석
  mainLogSection: document.getElementById('main-log-section'),
  mainLogListSection: document.getElementById('main-log-list-section'),
  mainLogEmptySection: document.getElementById('main-log-empty-section'),
  mainLogFileList: document.getElementById('main-log-file-list'),
  mainRefreshLogsBtn: document.getElementById('main-refresh-logs-btn'),
  mainLogDropZone: document.getElementById('main-log-drop-zone'),
  mainLogFileInput: document.getElementById('main-log-file-input'),
  mainAnalysisResultSection: document.getElementById('main-analysis-result-section'),
  mainAnalysisStats: document.getElementById('main-analysis-stats'),
  mainAnalysisSummary: document.getElementById('main-analysis-summary'),
  mainBackToListBtn: document.getElementById('main-back-to-list-btn'),
  mainAnalyzeLoading: document.getElementById('main-analyze-loading'),
  mainToggleGuideBtn: document.getElementById('main-toggle-guide-btn'),
  mainGuideContent: document.getElementById('main-guide-content'),

  // 검색
  searchInput: document.getElementById('search-input'),
  clearBtn: document.getElementById('clear-btn'),
  searchResults: document.getElementById('search-results'),
  resultsCount: document.getElementById('results-count'),
  resultsList: document.getElementById('results-list'),

  // 상세
  backBtn: document.getElementById('back-btn'),
  errorBadge: document.getElementById('error-badge'),
  errorId: document.getElementById('error-id'),
  errorTitle: document.getElementById('error-title'),
  errorCode: document.getElementById('error-code'),
  errorDescription: document.getElementById('error-description'),
  stepsList: document.getElementById('steps-list'),
  resolvedBtn: document.getElementById('resolved-btn'),
  notResolvedBtn: document.getElementById('not-resolved-btn'),

  // 모달
  reportModal: document.getElementById('report-modal'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  customerName: document.getElementById('customer-name'),
  companyName: document.getElementById('company-name'),
  contactNumber: document.getElementById('contact-number'),
  dropZone: document.getElementById('drop-zone'),
  fileInput: document.getElementById('file-input'),
  fileInfo: document.getElementById('file-info'),
  fileName: document.getElementById('file-name'),
  fileSize: document.getElementById('file-size'),
  removeFileBtn: document.getElementById('remove-file-btn'),
  submitReportBtn: document.getElementById('submit-report-btn'),
  reportResult: document.getElementById('report-result'),
  resultMessage: document.getElementById('result-message'),

  // 개발자 설정 모달
  devSettingsModal: document.getElementById('dev-settings-modal'),
  devModalCloseBtn: document.getElementById('dev-modal-close-btn'),
  analysisDaysInput: document.getElementById('analysis-days-input'),
  devSettingsSaveBtn: document.getElementById('dev-settings-save-btn'),
  devSettingsCancelBtn: document.getElementById('dev-settings-cancel-btn'),

  // EULA 모달
  eulaModal: document.getElementById('eula-modal'),
  eulaAgreeCheckbox: document.getElementById('eula-agree-checkbox'),
  eulaAgreeBtn: document.getElementById('eula-agree-btn'),
  eulaExitBtn: document.getElementById('eula-exit-btn'),

  // 토스트 컨테이너
  toastContainer: document.getElementById('toast-container')
};

// ========================================
// 초기화
// ========================================
async function init() {
  try {
    console.log('[renderer.js] Initializing L-CAM Doctor...');

    // EULA 동의 확인
    if (!checkEulaAgreement()) {
      showEulaModal();
      setupEulaEventListeners();
      return; // EULA 동의 전까지 앱 초기화 중단
    }

    // 앱 초기화 진행
    await initializeApp();
  } catch (error) {
    console.error('[renderer.js] Failed to initialize:', error);
  }
}

/**
 * EULA 동의 여부 확인
 */
function checkEulaAgreement() {
  return localStorage.getItem('eula_agreed') === 'true';
}

/**
 * EULA 모달 표시
 */
function showEulaModal() {
  elements.eulaModal.classList.remove('hidden');
}

/**
 * EULA 모달 숨기기
 */
function hideEulaModal() {
  elements.eulaModal.classList.add('hidden');
}

/**
 * EULA 이벤트 리스너 설정
 */
function setupEulaEventListeners() {
  // 체크박스 상태에 따라 동의 버튼 활성화/비활성화
  elements.eulaAgreeCheckbox.addEventListener('change', () => {
    elements.eulaAgreeBtn.disabled = !elements.eulaAgreeCheckbox.checked;
  });

  // 동의 버튼 클릭
  elements.eulaAgreeBtn.addEventListener('click', async () => {
    // EULA 동의 저장
    localStorage.setItem('eula_agreed', 'true');
    console.log('[renderer.js] EULA agreement saved');

    // 모달 숨기기
    hideEulaModal();

    // 앱 초기화 진행
    await initializeApp();
  });

  // 종료 버튼 클릭
  elements.eulaExitBtn.addEventListener('click', () => {
    // 프로그램 종료
    if (window.electronAPI && window.electronAPI.quitApp) {
      window.electronAPI.quitApp();
    } else {
      window.close();
    }
  });
}

/**
 * 앱 초기화 (EULA 동의 후 실행)
 */
async function initializeApp() {
  // IPC를 통해 에러 데이터 로드 (get-error-data 핸들러 호출)
  const response = await window.electronAPI.getErrorData();

  if (response.success) {
    state.errors = response.data;
    console.log(`[renderer.js] Loaded ${state.errors.length} error entries`);
  } else {
    console.error('[renderer.js] Failed to load errors:', response.error);
    state.errors = [];
  }

  // 메인 화면 로그 파일 로드
  loadMainRecentLogs();

  // 이벤트 리스너 등록
  setupEventListeners();

  // 기본 탭 활성화 (에러 검색)
  activateTab('main-view');

  console.log('[renderer.js] Initialization complete');
}

// ========================================
// 이벤트 리스너 설정
// ========================================
function setupEventListeners() {
  // 탭 네비게이션
  elements.tabSearch.addEventListener('click', () => activateTab('main-view'));
  elements.tabAnalyze.addEventListener('click', () => {
    activateTab('analyze-view');
    loadRecentLogs();
  });

  // 로그 분석 탭
  elements.refreshLogsBtn.addEventListener('click', loadRecentLogs);
  elements.backToListBtn.addEventListener('click', showLogList);

  // 가이드 토글
  elements.toggleGuideBtn.addEventListener('click', toggleGuide);

  // 수동 업로드 (Drag & Drop) - 분석 탭
  elements.logDropZone.addEventListener('click', handleDropZoneClick);
  elements.logDropZone.addEventListener('dragover', handleLogDragOver);
  elements.logDropZone.addEventListener('dragleave', handleLogDragLeave);
  elements.logDropZone.addEventListener('drop', handleLogDrop);
  elements.logFileInput.addEventListener('change', handleLogFileSelect);

  // 메인 화면 로그 분석
  elements.mainRefreshLogsBtn.addEventListener('click', loadMainRecentLogs);
  elements.mainBackToListBtn.addEventListener('click', showMainLogList);
  elements.mainLogDropZone.addEventListener('click', handleMainDropZoneClick);
  elements.mainLogDropZone.addEventListener('dragover', handleMainLogDragOver);
  elements.mainLogDropZone.addEventListener('dragleave', handleMainLogDragLeave);
  elements.mainLogDropZone.addEventListener('drop', handleMainLogDrop);
  elements.mainLogFileInput.addEventListener('change', handleMainLogFileSelect);
  elements.mainToggleGuideBtn.addEventListener('click', toggleMainGuide);

  // 검색
  elements.searchInput.addEventListener('input', handleSearchInput);
  elements.clearBtn.addEventListener('click', handleClearSearch);

  // 상세 화면
  elements.backBtn.addEventListener('click', showMainView);
  elements.resolvedBtn.addEventListener('click', handleResolved);
  elements.notResolvedBtn.addEventListener('click', handleNotResolved);

  // 모달
  elements.modalCloseBtn.addEventListener('click', closeModal);
  document.querySelector('.modal-overlay').addEventListener('click', closeModal);

  // 고객 정보 입력 필드
  elements.customerName.addEventListener('input', checkSubmitEnabled);
  elements.companyName.addEventListener('input', checkSubmitEnabled);
  elements.contactNumber.addEventListener('input', checkSubmitEnabled);

  // 파일 드래그 앤 드롭
  elements.dropZone.addEventListener('click', () => elements.fileInput.click());
  elements.dropZone.addEventListener('dragover', handleDragOver);
  elements.dropZone.addEventListener('dragleave', handleDragLeave);
  elements.dropZone.addEventListener('drop', handleDrop);
  elements.fileInput.addEventListener('change', handleFileSelect);
  elements.removeFileBtn.addEventListener('click', handleRemoveFile);
  elements.submitReportBtn.addEventListener('click', handleSubmitReport);

  // 키보드 이벤트
  document.addEventListener('keydown', handleKeyDown);
}

// ========================================
// 검색 기능
// error_code, display_title, keywords 필드를 모두 검색
// ========================================
function handleSearchInput(e) {
  const query = e.target.value.trim();

  // 클리어 버튼 표시/숨김
  elements.clearBtn.classList.toggle('hidden', !query);

  if (!query) {
    elements.searchResults.classList.add('hidden');
    elements.mainLogSection.classList.remove('hidden');
    return;
  }

  const results = searchErrors(query);
  renderSearchResults(results, query);
}

/**
 * 에러 검색
 * @param {string} query - 검색어
 * @returns {Array} 매칭된 에러 목록
 */
function searchErrors(query) {
  const lowerQuery = query.toLowerCase();

  return state.errors.filter(error => {
    // 1. error_code 검색
    if (error.error_code.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // 2. display_title 검색
    if (error.display_title.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // 3. keywords 배열 검색
    if (error.keywords.some(keyword =>
      keyword.toLowerCase().includes(lowerQuery)
    )) {
      return true;
    }

    return false;
  });
}

/**
 * 검색 결과 렌더링
 * 검색 결과가 없으면 자동으로 ID 9999번 (Unknown Error) 화면을 표시
 */
function renderSearchResults(results, searchQuery) {
  elements.mainLogSection.classList.add('hidden');
  elements.searchResults.classList.remove('hidden');
  elements.resultsCount.textContent = results.length;

  // 검색 결과가 없을 경우 → "검색 결과 없음" 메시지와 Unknown Error 버튼 표시
  if (results.length === 0) {
    const unknownError = getUnknownError();
    elements.resultsList.innerHTML = `
      <li class="no-results">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="margin-bottom: 12px; opacity: 0.5;">
          <circle cx="22" cy="22" r="14" stroke="#6b7280" stroke-width="2"/>
          <path d="M32 32 L42 42" stroke="#6b7280" stroke-width="2" stroke-linecap="round"/>
          <path d="M16 22 H28" stroke="#6b7280" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <p>"${escapeHtml(searchQuery)}" 검색 결과가 없습니다</p>
        <p style="font-size: 12px; margin-top: 4px; color: #9ca3af;">다른 키워드로 검색하거나, 아래 버튼을 눌러주세요</p>
        ${unknownError ? `
          <button id="unknown-error-btn" class="unknown-error-btn" style="
            margin-top: 16px;
            padding: 12px 24px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background 0.2s;
          ">
            등록되지 않은 에러로 처리하기
          </button>
        ` : ''}
      </li>
    `;

    // Unknown Error 버튼 클릭 이벤트
    const unknownBtn = document.getElementById('unknown-error-btn');
    if (unknownBtn && unknownError) {
      unknownBtn.addEventListener('click', () => {
        showDetailView(unknownError, searchQuery);
      });
      // 호버 효과
      unknownBtn.addEventListener('mouseenter', () => {
        unknownBtn.style.background = '#2563eb';
      });
      unknownBtn.addEventListener('mouseleave', () => {
        unknownBtn.style.background = '#3b82f6';
      });
    }
    return;
  }

  // 검색 결과 목록 렌더링
  elements.resultsList.innerHTML = results.map(error => `
    <li class="result-item" data-id="${error.id}">
      <div class="result-badge">
        <span class="severity-badge ${error.severity.toLowerCase()}">${getSeverityLabel(error.severity)}</span>
      </div>
      <div class="result-content">
        <p class="result-title">${escapeHtml(error.display_title)}</p>
        <p class="result-code">${escapeHtml(error.error_code)} (ID: ${error.id})</p>
      </div>
      <div class="result-arrow">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M7 4 L13 10 L7 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </li>
  `).join('');

  // 결과 항목 클릭 이벤트
  elements.resultsList.querySelectorAll('.result-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.dataset.id, 10);
      const error = state.errors.find(e => e.id === id);
      if (error) {
        showDetailView(error);
      }
    });
  });
}

/**
 * 검색 초기화
 */
function handleClearSearch() {
  elements.searchInput.value = '';
  elements.clearBtn.classList.add('hidden');
  elements.searchResults.classList.add('hidden');
  elements.mainLogSection.classList.remove('hidden');
  elements.searchInput.focus();
}

// ========================================
// 메인 화면 로그 분석 기능
// ========================================

/**
 * 메인 화면 최근 로그 파일 목록 로드
 */
async function loadMainRecentLogs() {
  try {
    console.log('[renderer.js] Loading main screen recent log files...');

    // 하이브리드 섹션 표시, 결과 섹션 숨김
    elements.mainAnalysisResultSection.classList.add('hidden');

    const response = await window.electronAPI.getRecentLogs();

    if (response.success && response.files.length > 0) {
      state.recentLogs = response.files;
      renderMainLogList();
      elements.mainLogListSection.classList.remove('hidden');
      elements.mainLogEmptySection.classList.add('hidden');
    } else {
      elements.mainLogListSection.classList.add('hidden');
      elements.mainLogEmptySection.classList.remove('hidden');
    }
  } catch (error) {
    console.error('[renderer.js] Failed to load main recent logs:', error);
    elements.mainLogListSection.classList.add('hidden');
    elements.mainLogEmptySection.classList.remove('hidden');
  }
}

/**
 * 메인 화면 로그 파일 목록 렌더링
 */
function renderMainLogList() {
  elements.mainLogFileList.innerHTML = state.recentLogs.map(file => `
    <li class="main-log-file-item" data-path="${escapeHtml(file.filePath)}">
      <div class="main-log-file-info">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="main-log-file-name">${escapeHtml(file.fileName)}</span>
        <span class="main-log-file-meta">${file.mtimeFormatted}</span>
      </div>
      <button class="main-analyze-btn" data-path="${escapeHtml(file.filePath)}">분석</button>
    </li>
  `).join('');

  // 분석 버튼 클릭 이벤트
  elements.mainLogFileList.querySelectorAll('.main-analyze-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const filePath = btn.dataset.path;
      analyzeMainLogFile(filePath);
    });
  });
}

/**
 * 메인 화면 로그 파일 분석 실행
 */
async function analyzeMainLogFile(filePath) {
  try {
    console.log('[renderer.js] Main screen analyzing log file:', filePath);

    // 하이브리드 섹션 숨기고 로딩 표시
    elements.mainLogSection.querySelector('.main-hybrid-section').classList.add('hidden');
    elements.mainAnalyzeLoading.classList.remove('hidden');

    const result = await window.electronAPI.analyzeLog(filePath);

    elements.mainAnalyzeLoading.classList.add('hidden');

    if (result.success) {
      state.currentAnalysisResult = result;

      // Smart Trigger: 고유 에러가 1개면 바로 상세 화면으로 이동
      if (result.statistics.uniqueErrors === 1 && result.summary.length === 1) {
        const errorCode = result.summary[0].error_code;
        const error = state.errors.find(e => e.id === errorCode);
        if (error) {
          console.log('[renderer.js] Main Smart Trigger: 단일 에러 감지, 상세 화면으로 이동');
          elements.mainLogSection.querySelector('.main-hybrid-section').classList.remove('hidden');
          showDetailView(error);
          return;
        }
      }

      renderMainAnalysisResult(result);
      elements.mainAnalysisResultSection.classList.remove('hidden');
    } else {
      alert(`분석 실패: ${result.error}`);
      elements.mainLogSection.querySelector('.main-hybrid-section').classList.remove('hidden');
    }
  } catch (error) {
    console.error('[renderer.js] Main analysis failed:', error);
    elements.mainAnalyzeLoading.classList.add('hidden');
    elements.mainLogSection.querySelector('.main-hybrid-section').classList.remove('hidden');
    alert('로그 분석 중 오류가 발생했습니다.');
  }
}

/**
 * 메인 화면 분석 결과 렌더링
 * - 타임라인 리스트 형태로 모든 에러를 시간 역순(최신순)으로 나열
 * - 각 에러에 "해결 방법 보기" 버튼
 */
function renderMainAnalysisResult(result) {
  // 통계 정보 - 총 에러 건수만 표시
  elements.mainAnalysisStats.innerHTML = `
    <div class="main-stat-item">
      <span class="main-stat-value">${result.statistics.totalErrors}</span>
      <span class="main-stat-label">Total Errors <span class="main-stat-period">(최근 7일 이내 데이터 기준)</span></span>
    </div>
  `;

  // 에러 목록 (타임라인 - 최신순으로 모두 나열)
  if (result.errors && result.errors.length > 0) {
    elements.mainAnalysisSummary.innerHTML = `
      <div class="main-errors-header">
        <p class="main-errors-total-count">총 <strong>${result.statistics.totalErrors}</strong>건의 에러가 발견되었습니다.</p>
      </div>
      <div class="main-errors-scroll-container">
        <ul class="main-errors-list timeline-list">
          ${result.errors.map(errorItem => {
            const dbInfo = errorItem.db_info;
            const severity = dbInfo?.severity || 'UNKNOWN';
            const title = dbInfo?.display_title || `Unknown Error`;
            const errorCode = errorItem.detected_code;

            return `
              <li class="main-error-item timeline-item ${severity.toLowerCase()}">
                <div class="timeline-timestamp">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                  <span class="timestamp-text">${errorItem.timestamp}</span>
                </div>
                <div class="timeline-content">
                  <div class="timeline-error-info">
                    <span class="severity-badge ${severity.toLowerCase()}">${getSeverityLabel(severity)}</span>
                    <span class="timeline-error-code">[${errorCode}]</span>
                    <span class="timeline-error-title">${escapeHtml(title)}</span>
                  </div>
                  <button class="timeline-solve-btn" data-code="${errorCode}">
                    해결 방법 보기 &gt;
                  </button>
                </div>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    `;

    // [해결 방법 보기] 버튼 클릭 이벤트
    elements.mainAnalysisSummary.querySelectorAll('.timeline-solve-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const code = parseInt(btn.dataset.code, 10);
        const error = state.errors.find(e => e.id === code);
        if (error) {
          showDetailView(error);
        } else {
          // DB에 없는 에러인 경우 Unknown Error로 이동
          const unknownError = getUnknownError();
          if (unknownError) {
            showDetailView(unknownError);
          }
        }
      });
    });
  } else {
    elements.mainAnalysisSummary.innerHTML = `
      <div class="main-no-errors">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="12" stroke="#10b981" stroke-width="2"/>
          <path d="M11 16 L14 19 L21 12" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>최근 7일간 발생한 에러가 없습니다.</p>
      </div>
    `;
  }
}

/**
 * 메인 화면 로그 목록으로 돌아가기
 */
function showMainLogList() {
  elements.mainAnalysisResultSection.classList.add('hidden');
  elements.mainLogSection.querySelector('.main-hybrid-section').classList.remove('hidden');
  state.currentAnalysisResult = null;
  loadMainRecentLogs();
}

// 메인 화면 수동 업로드 핸들러
function handleMainDropZoneClick(e) {
  if (e.target.classList.contains('main-browse-btn') || e.target.closest('.main-browse-btn')) {
    elements.mainLogFileInput.click();
  } else if (!e.target.closest('button')) {
    elements.mainLogFileInput.click();
  }
}

function handleMainLogDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  elements.mainLogDropZone.classList.add('drag-over');
}

function handleMainLogDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  elements.mainLogDropZone.classList.remove('drag-over');
}

function handleMainLogDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  elements.mainLogDropZone.classList.remove('drag-over');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    validateAndAnalyzeMainFile(files[0]);
  }
}

function handleMainLogFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    validateAndAnalyzeMainFile(files[0]);
  }
  e.target.value = '';
}

function validateAndAnalyzeMainFile(file) {
  const fileName = file.name;
  if (!fileName.endsWith('.2.txt')) {
    alert('올바른 에러 로그 파일(.2.txt)이 아닙니다.\n\n장비 로그 파일은 ".2.txt"로 끝나야 합니다.\n예: log_10.82.79.2.txt');
    return;
  }
  console.log('[renderer.js] Main manual upload - valid file:', fileName);
  analyzeMainLogFile(file.path);
}

// ========================================
// 상세 화면
// steps 배열을 순회하며 동적으로 HTML 생성
// searchQuery: 검색 결과가 없어서 Unknown Error로 이동한 경우 사용자가 입력한 검색어
// ========================================
function showDetailView(error, searchQuery = null) {
  state.currentError = error;

  // 헤더 정보 설정
  elements.errorBadge.textContent = getSeverityLabel(error.severity);
  elements.errorBadge.className = `severity-badge ${error.severity.toLowerCase()}`;
  elements.errorId.textContent = `ID: ${error.id}`;
  elements.errorTitle.textContent = error.display_title;
  elements.errorCode.textContent = error.error_code;

  // Unknown Error(9999)인 경우 검색어를 description에 포함
  if (error.id === 9999 && searchQuery) {
    elements.errorDescription.textContent =
      `검색어 "${searchQuery}"에 해당하는 에러를 찾을 수 없습니다.\n\n${error.description}`;
  } else {
    elements.errorDescription.textContent = error.description;
  }

  // steps 배열을 순회하며 동적으로 HTML 생성
  elements.stepsList.innerHTML = error.steps.map(step => `
    <div class="step-item">
      <div class="step-number">${step.order}</div>
      <div class="step-content">
        <p class="step-text">[STEP ${step.order}] ${escapeHtml(step.text)}</p>
        <div class="step-image">
          ${renderStepImage(step.image, step.order)}
        </div>
      </div>
    </div>
  `).join('');

  // 이미지 onerror 핸들러 설정
  setupImageErrorHandlers();

  // 화면 전환
  elements.mainView.classList.remove('active');
  elements.detailView.classList.add('active');

  // 상단으로 스크롤
  window.scrollTo(0, 0);
}

/**
 * 단계별 이미지 렌더링
 * 이미지가 없거나 로드 실패 시 placeholder 표시
 */
function renderStepImage(imagePath, stepOrder) {
  if (imagePath) {
    return `
      <img
        src="${escapeHtml(imagePath)}"
        alt="Step ${stepOrder} 이미지"
        data-step="${stepOrder}"
        onerror="handleImageError(this)"
      >
    `;
  }

  // 이미지 경로가 없는 경우 placeholder
  return `
    <div class="image-placeholder">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="4" y="8" width="40" height="32" rx="4" stroke="#4b5563" stroke-width="2" fill="none"/>
        <circle cx="16" cy="20" r="4" stroke="#4b5563" stroke-width="2" fill="none"/>
        <path d="M4 32 L16 24 L24 30 L36 20 L44 26" stroke="#4b5563" stroke-width="2" fill="none"/>
      </svg>
      <p>이미지 준비중</p>
    </div>
  `;
}

/**
 * 이미지 로드 실패 시 처리 (onerror 핸들러)
 * 엑박 대신 '이미지 준비중' 텍스트 표시
 */
function handleImageError(imgElement) {
  const stepOrder = imgElement.dataset.step;
  const container = imgElement.parentElement;

  console.log(`[renderer.js] Image load failed for step ${stepOrder}`);

  // 이미지 요소를 placeholder로 교체
  container.innerHTML = `
    <div class="image-placeholder">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="4" y="8" width="40" height="32" rx="4" stroke="#4b5563" stroke-width="2" fill="none"/>
        <circle cx="16" cy="20" r="4" stroke="#4b5563" stroke-width="2" fill="none"/>
        <path d="M4 32 L16 24 L24 30 L36 20 L44 26" stroke="#4b5563" stroke-width="2" fill="none"/>
      </svg>
      <p>이미지 준비중</p>
    </div>
  `;
}

// 전역 함수로 노출 (onerror 속성에서 호출)
window.handleImageError = handleImageError;

/**
 * 이미지 에러 핸들러 설정
 */
function setupImageErrorHandlers() {
  const images = elements.stepsList.querySelectorAll('img');
  images.forEach(img => {
    img.addEventListener('error', function() {
      handleImageError(this);
    });
  });
}

/**
 * 메인 화면으로 돌아가기
 */
function showMainView() {
  elements.detailView.classList.remove('active');
  elements.mainView.classList.add('active');
  state.currentError = null;
}

/**
 * "해결됨" 버튼 클릭 처리
 */
function handleResolved() {
  showMainView();
  handleClearSearch();
}

/**
 * "해결 안 됨" 버튼 클릭 처리
 */
function handleNotResolved() {
  openModal();
}

// ========================================
// 모달 (로그 리포트)
// ========================================
function openModal() {
  elements.reportModal.classList.remove('hidden');
  resetModal();
}

function closeModal() {
  elements.reportModal.classList.add('hidden');
  resetModal();
}

function resetModal() {
  state.selectedFile = null;
  elements.dropZone.style.display = '';
  elements.fileInfo.classList.add('hidden');
  elements.reportResult.classList.add('hidden');
  elements.submitReportBtn.disabled = true;
  elements.submitReportBtn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 10 L8 14 L16 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    리포트 생성 및 저장
  `;
  elements.fileInput.value = '';
  // 고객 정보 입력 필드 초기화
  elements.customerName.value = '';
  elements.companyName.value = '';
  elements.contactNumber.value = '';
}

/**
 * 제출 버튼 활성화 여부 체크
 * 파일이 선택되고, 모든 필수 입력 필드가 채워졌을 때 활성화
 */
function checkSubmitEnabled() {
  const hasFile = state.selectedFile !== null;
  const hasName = elements.customerName.value.trim() !== '';
  const hasCompany = elements.companyName.value.trim() !== '';
  const hasContact = elements.contactNumber.value.trim() !== '';

  elements.submitReportBtn.disabled = !(hasFile && hasName && hasCompany && hasContact);
}

// ========================================
// 파일 드래그 앤 드롭
// ========================================
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  elements.dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  elements.dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  elements.dropZone.classList.remove('drag-over');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

/**
 * 파일 처리 (더미 함수 포함)
 * 파일의 경로, 이름, 사이즈를 콘솔에 출력
 */
function handleFile(file) {
  state.selectedFile = file;

  // ==========================================
  // 더미(Dummy) 함수: 콘솔에 파일 정보 출력
  // ==========================================
  console.log('==========================================');
  console.log('[Log Report] 파일 정보:');
  console.log(`  - 파일명: ${file.name}`);
  console.log(`  - 파일 경로: ${file.path}`);
  console.log(`  - 파일 크기: ${formatFileSize(file.size)}`);
  console.log(`  - 파일 타입: ${file.type || 'unknown'}`);
  console.log(`  - 마지막 수정: ${new Date(file.lastModified).toLocaleString('ko-KR')}`);
  console.log('==========================================');

  // 파일 정보 UI 표시
  elements.fileName.textContent = file.name;
  elements.fileSize.textContent = formatFileSize(file.size);

  elements.dropZone.style.display = 'none';
  elements.fileInfo.classList.remove('hidden');
  checkSubmitEnabled();
}

function handleRemoveFile() {
  state.selectedFile = null;
  elements.dropZone.style.display = '';
  elements.fileInfo.classList.add('hidden');
  elements.fileInput.value = '';
  checkSubmitEnabled();
}

// ========================================
// 리포트 제출
// ========================================
async function handleSubmitReport() {
  if (!state.selectedFile) return;

  elements.submitReportBtn.disabled = true;
  elements.submitReportBtn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="animation: spin 1s linear infinite;">
      <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="40" stroke-dashoffset="10"/>
    </svg>
    처리 중...
  `;

  // 고객 정보 수집
  const customerInfo = {
    name: elements.customerName.value.trim(),
    company: elements.companyName.value.trim(),
    contact: elements.contactNumber.value.trim()
  };

  try {
    // ==========================================
    // 콘솔에 접수 메시지 출력
    // ==========================================
    console.log('==========================================');
    console.log('[Log Report] 접수되었습니다!');
    console.log(`  - 성함: ${customerInfo.name}`);
    console.log(`  - 업체명: ${customerInfo.company}`);
    console.log(`  - 연락처: ${customerInfo.contact}`);
    console.log(`  - 에러 ID: ${state.currentError?.id || 'N/A'}`);
    console.log(`  - 에러 코드: ${state.currentError?.error_code || 'N/A'}`);
    console.log(`  - 파일명: ${state.selectedFile.name}`);
    console.log('==========================================');

    // IPC를 통해 로그 파일 처리 및 ZIP 압축
    const result = await window.electronAPI.processLogFile(
      state.selectedFile.path,
      state.currentError,
      customerInfo
    );

    elements.reportResult.classList.remove('hidden');

    if (result.success) {
      // 이메일 전송 성공/실패에 따른 메시지 표시
      if (result.emailSent) {
        elements.resultMessage.innerHTML = `
          <div style="text-align: center;">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="margin-bottom: 12px;">
              <circle cx="24" cy="24" r="20" stroke="#10b981" stroke-width="3" fill="none"/>
              <path d="M15 24 L21 30 L33 18" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <p style="margin-bottom: 16px; font-size: 18px; font-weight: bold; color: #10b981;">전송 완료!</p>
            <p style="margin-bottom: 8px; font-size: 14px; color: #a0aec0;">리포트가 이메일로 자동 전송되었습니다.</p>
            <p style="font-size: 13px; color: #718096;">${result.message}</p>
          </div>
        `;
      } else {
        // 이메일 전송 실패 시 수동 전송 안내
        const emailAddress = 'silverjeans@huvitz.com';
        const subject = encodeURIComponent(`[L-CAM Doctor] 에러 리포트 - ${state.currentError?.error_code || 'Unknown'}`);
        const body = encodeURIComponent(`안녕하세요,\n\nL-CAM Doctor에서 생성된 에러 리포트를 첨부하여 보내드립니다.\n\n에러 코드: ${state.currentError?.error_code || 'N/A'}\n에러 제목: ${state.currentError?.display_title || 'N/A'}\n\n첨부된 ZIP 파일을 확인해 주세요.\n\n감사합니다.`);

        elements.resultMessage.innerHTML = `
          <div style="text-align: center;">
            <p style="margin-bottom: 16px;">리포트가 생성되었습니다.</p>
            <p style="margin-bottom: 16px; font-size: 13px; color: #f6ad55;">(자동 이메일 전송 실패 - 수동으로 보내주세요)</p>
            <p style="margin-bottom: 16px; font-size: 13px; color: #9ca3af;">${result.message}</p>
            <div style="background: #2d2d2d; border-radius: 8px; padding: 16px; margin-top: 16px;">
              <p style="margin-bottom: 12px; font-size: 14px;">생성된 리포트 파일을 아래 이메일로 보내주세요:</p>
              <p style="font-size: 16px; font-weight: bold; color: #60a5fa; margin-bottom: 16px;">${emailAddress}</p>
              <button id="send-email-btn" style="
                background: #3b82f6;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                display: inline-flex;
                align-items: center;
                gap: 8px;
              ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                메일 앱 열기
              </button>
            </div>
          </div>
        `;

        // 메일 버튼 클릭 이벤트
        setTimeout(() => {
          const emailBtn = document.getElementById('send-email-btn');
          if (emailBtn) {
            emailBtn.addEventListener('click', () => {
              window.open(`mailto:${emailAddress}?subject=${subject}&body=${body}`);
            });
          }
        }, 0);
      }

      elements.dropZone.style.display = 'none';
      elements.fileInfo.classList.add('hidden');
    } else {
      elements.resultMessage.textContent = result.message;
    }
  } catch (error) {
    console.error('[renderer.js] Report submission failed:', error);
    elements.reportResult.classList.remove('hidden');
    elements.resultMessage.textContent = '처리 중 오류가 발생했습니다.';
  } finally {
    elements.submitReportBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 10 L8 14 L16 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      리포트 생성 및 저장
    `;
  }
}

// ========================================
// 키보드 이벤트
// ========================================
function handleKeyDown(e) {
  // ESC 키로 모달 닫기 또는 상세 화면에서 돌아가기
  if (e.key === 'Escape') {
    if (!elements.reportModal.classList.contains('hidden')) {
      closeModal();
    } else if (elements.detailView.classList.contains('active')) {
      showMainView();
    }
  }

  // Ctrl+F로 검색 포커스
  if (e.ctrlKey && e.key === 'f') {
    e.preventDefault();
    showMainView();
    elements.searchInput.focus();
    elements.searchInput.select();
  }
}

// ========================================
// 유틸리티 함수
// ========================================

/**
 * Unknown Error (ID 9999) 가져오기
 * 검색 결과가 없을 때 자동으로 표시할 에러
 */
function getUnknownError() {
  return state.errors.find(error => error.id === 9999);
}

/**
 * Severity 레이블 변환
 * WARNING: 노란색/주황색 계열
 * CRITICAL: 빨간색 계열
 * SYSTEM/INFO: 회색 또는 파란색 계열
 */
function getSeverityLabel(severity) {
  const labels = {
    CRITICAL: '심각',
    WARNING: '경고',
    INFO: '정보',
    SYSTEM: '시스템'
  };
  return labels[severity] || severity;
}

/**
 * 텍스트 자르기
 */
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * 파일 크기 포맷
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * HTML 이스케이프 (XSS 방지)
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========================================
// 탭 네비게이션
// ========================================

/**
 * 탭 활성화
 * @param {string} viewId - 활성화할 view ID ('main-view' 또는 'analyze-view')
 */
function activateTab(viewId) {
  // 모든 탭 비활성화
  elements.tabSearch.classList.remove('active');
  elements.tabAnalyze.classList.remove('active');

  // 모든 뷰 숨김
  elements.mainView.classList.remove('active');
  elements.detailView.classList.remove('active');
  elements.analyzeView.classList.remove('active');

  // 선택된 탭과 뷰 활성화
  if (viewId === 'main-view') {
    elements.tabSearch.classList.add('active');
    elements.mainView.classList.add('active');
  } else if (viewId === 'analyze-view') {
    elements.tabAnalyze.classList.add('active');
    elements.analyzeView.classList.add('active');
  }
}

// ========================================
// 로그 분석 기능
// ========================================

/**
 * 최근 로그 파일 목록 로드
 */
async function loadRecentLogs() {
  try {
    console.log('[renderer.js] Loading recent log files...');

    // 하이브리드 섹션 표시, 결과 섹션 숨김
    elements.hybridSection.classList.remove('hidden');
    elements.analysisResultSection.classList.add('hidden');

    const response = await window.electronAPI.getRecentLogs();

    if (response.success && response.files.length > 0) {
      // 파일 목록 표시
      state.recentLogs = response.files;
      renderLogList();
      elements.logListSection.classList.remove('hidden');
      elements.logEmptySection.classList.add('hidden');
    } else {
      // 로그 없음 상태 표시
      elements.logListSection.classList.add('hidden');
      elements.logEmptySection.classList.remove('hidden');
    }
  } catch (error) {
    console.error('[renderer.js] Failed to load recent logs:', error);
    elements.logListSection.classList.add('hidden');
    elements.logEmptySection.classList.remove('hidden');
  }
}

/**
 * 가이드 토글
 */
function toggleGuide() {
  elements.guideContent.classList.toggle('hidden');
  elements.toggleGuideBtn.classList.toggle('expanded');
}

/**
 * 메인 화면 가이드 토글
 */
function toggleMainGuide() {
  elements.mainGuideContent.classList.toggle('hidden');
  elements.mainToggleGuideBtn.classList.toggle('expanded');
}

// ========================================
// 수동 업로드 기능 (Drag & Drop)
// ========================================

/**
 * 드롭 존 클릭 시 파일 선택 대화상자 열기
 */
function handleDropZoneClick(e) {
  // 버튼 클릭이 아닌 경우에만 파일 선택
  if (e.target.classList.contains('browse-btn') || e.target.closest('.browse-btn')) {
    elements.logFileInput.click();
  } else if (!e.target.closest('button')) {
    elements.logFileInput.click();
  }
}

/**
 * 드래그 오버 처리
 */
function handleLogDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  elements.logDropZone.classList.add('drag-over');
}

/**
 * 드래그 리브 처리
 */
function handleLogDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  elements.logDropZone.classList.remove('drag-over');
}

/**
 * 파일 드롭 처리
 */
function handleLogDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  elements.logDropZone.classList.remove('drag-over');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    validateAndAnalyzeFile(files[0]);
  }
}

/**
 * 파일 선택 처리
 */
function handleLogFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    validateAndAnalyzeFile(files[0]);
  }
  // 입력 초기화 (같은 파일 다시 선택 가능하도록)
  e.target.value = '';
}

/**
 * 파일 유효성 검사 및 분석 실행
 * @param {File} file - 선택된 파일
 */
function validateAndAnalyzeFile(file) {
  const fileName = file.name;

  // .2.txt로 끝나는지 검사
  if (!fileName.endsWith('.2.txt')) {
    alert('올바른 에러 로그 파일(.2.txt)이 아닙니다.\n\n장비 로그 파일은 ".2.txt"로 끝나야 합니다.\n예: log_10.82.79.2.txt');
    return;
  }

  // 유효한 파일이면 분석 실행
  console.log('[renderer.js] Manual upload - valid file:', fileName);
  analyzeLogFile(file.path);
}

/**
 * 로그 파일 목록 렌더링 (State A)
 */
function renderLogList() {
  elements.logFileList.innerHTML = state.recentLogs.map(file => `
    <div class="log-file-item" data-path="${escapeHtml(file.filePath)}">
      <div class="log-file-info">
        <div class="log-file-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="log-file-details">
          <p class="log-file-name">${escapeHtml(file.fileName)}</p>
          <p class="log-file-meta">${file.mtimeFormatted} · ${formatFileSize(file.size)}</p>
        </div>
      </div>
      <button class="analyze-file-btn" data-path="${escapeHtml(file.filePath)}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
          <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        분석
      </button>
    </div>
  `).join('');

  // 분석 버튼 클릭 이벤트
  elements.logFileList.querySelectorAll('.analyze-file-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const filePath = btn.dataset.path;
      analyzeLogFile(filePath);
    });
  });
}

/**
 * 로그 파일 분석 실행
 * @param {string} filePath - 분석할 파일 경로
 */
async function analyzeLogFile(filePath) {
  try {
    console.log('[renderer.js] Analyzing log file:', filePath);

    // 로딩 표시 (하이브리드 섹션 숨기고 로딩 표시)
    elements.hybridSection.classList.add('hidden');
    elements.logGuideSection.classList.add('hidden');
    elements.analyzeLoading.classList.remove('hidden');

    const result = await window.electronAPI.analyzeLog(filePath);

    elements.analyzeLoading.classList.add('hidden');

    if (result.success) {
      state.currentAnalysisResult = result;

      // Smart Trigger: 고유 에러가 딱 1개면 바로 상세 화면으로 이동
      if (result.statistics.uniqueErrors === 1 && result.summary.length === 1) {
        const errorCode = result.summary[0].error_code;
        const error = state.errors.find(e => e.id === errorCode);
        if (error) {
          console.log('[renderer.js] Smart Trigger: 단일 에러 감지, 상세 화면으로 이동');
          activateTab('main-view');
          showDetailView(error);
          return;
        }
      }

      renderAnalysisResult(result);
      elements.analysisResultSection.classList.remove('hidden');
    } else {
      alert(`분석 실패: ${result.error}`);
      // 실패 시 하이브리드 섹션 다시 표시
      elements.hybridSection.classList.remove('hidden');
      elements.logGuideSection.classList.remove('hidden');
    }
  } catch (error) {
    console.error('[renderer.js] Analysis failed:', error);
    elements.analyzeLoading.classList.add('hidden');
    // 오류 시 하이브리드 섹션 다시 표시
    elements.hybridSection.classList.remove('hidden');
    elements.logGuideSection.classList.remove('hidden');
    alert('로그 분석 중 오류가 발생했습니다.');
  }
}

/**
 * 분석 결과 렌더링 (로그 분석 탭)
 * - 타임라인 리스트 형태로 모든 에러를 시간 역순(최신순)으로 나열
 * @param {Object} result - 분석 결과 객체
 */
function renderAnalysisResult(result) {
  // 통계 정보 - Total Errors + 분석 범위 안내
  elements.analysisStats.innerHTML = `
    <div class="stat-item">
      <span class="stat-value">${result.statistics.totalErrors}</span>
      <span class="stat-label">Total Errors <span class="stat-period">(최근 7일 이내 데이터 기준)</span></span>
    </div>
  `;

  // 타임라인 리스트 (모든 에러를 최신순으로 나열)
  if (result.errors && result.errors.length > 0) {
    elements.analysisSummary.innerHTML = `
      <div class="timeline-header">
        <p class="timeline-total-count">총 <strong>${result.statistics.totalErrors}</strong>건의 에러가 발견되었습니다.</p>
      </div>
      <div class="timeline-scroll-container">
        <ul class="timeline-list">
          ${result.errors.map(errorItem => {
            const dbInfo = errorItem.db_info;
            const severity = dbInfo?.severity || 'UNKNOWN';
            const title = dbInfo?.display_title || 'Unknown Error';
            const errorCode = errorItem.detected_code;

            return `
              <li class="timeline-item ${severity.toLowerCase()}">
                <div class="timeline-timestamp">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                  <span class="timestamp-text">${errorItem.timestamp}</span>
                </div>
                <div class="timeline-content">
                  <div class="timeline-error-info">
                    <span class="severity-badge ${severity.toLowerCase()}">${getSeverityLabel(severity)}</span>
                    <span class="timeline-error-code">[${errorCode}]</span>
                    <span class="timeline-error-title">${escapeHtml(title)}</span>
                  </div>
                  <button class="timeline-solve-btn" data-code="${errorCode}">
                    해결 방법 보기 &gt;
                  </button>
                </div>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    `;

    // [해결 방법 보기] 버튼 클릭 이벤트
    elements.analysisSummary.querySelectorAll('.timeline-solve-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const code = parseInt(btn.dataset.code, 10);
        const error = state.errors.find(e => e.id === code);
        if (error) {
          activateTab('main-view');
          showDetailView(error);
        } else {
          // DB에 없는 에러인 경우 Unknown Error로 이동
          const unknownError = getUnknownError();
          if (unknownError) {
            activateTab('main-view');
            showDetailView(unknownError);
          }
        }
      });
    });
  } else {
    elements.analysisSummary.innerHTML = `
      <div class="no-errors">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="margin-bottom: 12px; opacity: 0.5;">
          <circle cx="24" cy="24" r="20" stroke="#10b981" stroke-width="2"/>
          <path d="M16 24 L22 30 L32 18" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>최근 7일간 발생한 에러가 없습니다.</p>
      </div>
    `;
  }

  // analysisErrors 영역은 더 이상 사용하지 않음 (타임라인으로 통합)
  elements.analysisErrors.innerHTML = '';
}

/**
 * 로그 목록으로 돌아가기
 */
function showLogList() {
  elements.analysisResultSection.classList.add('hidden');
  elements.logGuideSection.classList.remove('hidden');
  state.currentAnalysisResult = null;
  loadRecentLogs();
}

// ========================================
// 앱 시작
// ========================================
document.addEventListener('DOMContentLoaded', init);

// CSS 애니메이션 추가 (스피너용)
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// ========================================
// 시크릿 코드 & 개발자 설정
// ========================================
const SECRET_CODE = '10151015';
let keyBuffer = [];

/**
 * 토스트 알림 표시
 */
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSvg = {
    success: '<svg viewBox="0 0 20 20" fill="none"><path d="M4 10 L8 14 L16 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    info: '<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2"/><path d="M10 6v1M10 9v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    warning: '<svg viewBox="0 0 20 20" fill="none"><path d="M10 2L18 18H2L10 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 8v4M10 14v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    error: '<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2"/><path d="M7 7L13 13M13 7L7 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };

  toast.innerHTML = `
    <div class="toast-icon ${type}">${iconSvg[type]}</div>
    <span class="toast-message">${message}</span>
  `;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}

/**
 * 개발자 설정 모달 열기
 */
async function openDevSettingsModal() {
  try {
    const result = await window.electronAPI.getConfig();
    if (result.success) {
      elements.analysisDaysInput.value = result.config.analysisDays || 7;
    }
  } catch (error) {
    console.error('[renderer.js] Failed to load config:', error);
  }
  elements.devSettingsModal.classList.remove('hidden');
}

/**
 * 개발자 설정 모달 닫기
 */
function closeDevSettingsModal() {
  elements.devSettingsModal.classList.add('hidden');
}

/**
 * 개발자 설정 저장
 */
async function saveDevSettings() {
  const analysisDays = parseInt(elements.analysisDaysInput.value, 10);

  if (isNaN(analysisDays) || analysisDays < 1 || analysisDays > 365) {
    showToast('분석 기간은 1~365일 사이로 입력해주세요.', 'warning');
    return;
  }

  try {
    const result = await window.electronAPI.saveConfig({ analysisDays });
    if (result.success) {
      showToast(`분석 기간이 ${analysisDays}일로 설정되었습니다.`, 'success');
      closeDevSettingsModal();
    } else {
      showToast('설정 저장에 실패했습니다.', 'error');
    }
  } catch (error) {
    console.error('[renderer.js] Failed to save config:', error);
    showToast('설정 저장 중 오류가 발생했습니다.', 'error');
  }
}

/**
 * 시크릿 코드 키 리스너 설정
 */
function setupSecretCodeListener() {
  document.addEventListener('keydown', (e) => {
    // 입력 필드에 포커스가 있으면 무시
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    // 숫자 키만 처리 (0-9)
    if (e.key >= '0' && e.key <= '9') {
      keyBuffer.push(e.key);

      // 버퍼가 시크릿 코드보다 길면 앞에서 제거
      if (keyBuffer.length > SECRET_CODE.length) {
        keyBuffer.shift();
      }

      // 시크릿 코드 매칭 확인
      if (keyBuffer.join('') === SECRET_CODE) {
        keyBuffer = []; // 버퍼 초기화
        showToast('개발자 모드가 활성화되었습니다.', 'info');
        openDevSettingsModal();
      }
    }
  });

  // 개발자 설정 모달 이벤트
  elements.devModalCloseBtn.addEventListener('click', closeDevSettingsModal);
  elements.devSettingsCancelBtn.addEventListener('click', closeDevSettingsModal);
  elements.devSettingsSaveBtn.addEventListener('click', saveDevSettings);

  // 모달 오버레이 클릭 시 닫기
  elements.devSettingsModal.querySelector('.modal-overlay').addEventListener('click', closeDevSettingsModal);

  // ESC 키로 모달 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !elements.devSettingsModal.classList.contains('hidden')) {
      closeDevSettingsModal();
    }
  });
}

// 시크릿 코드 리스너 초기화
setupSecretCodeListener();
