/**
 * L-CAM Doctor Mobile - 검색 및 렌더링 스크립트
 * 순수 HTML/CSS/JS로만 동작 (Node.js/Electron 코드 제거)
 */

// ========================================
// 상태 관리
// ========================================
const state = {
  errors: [],
  lcamErrors: [],
  currentError: null,
  currentLcamError: null,
  currentTab: 'main-view',
  isLoading: false
};

// ========================================
// DOM 요소 참조
// ========================================
const elements = {
  // Views
  mainView: document.getElementById('main-view'),
  detailView: document.getElementById('detail-view'),

  // 검색
  searchInput: document.getElementById('search-input'),
  clearBtn: document.getElementById('clear-btn'),
  searchResults: document.getElementById('search-results'),
  resultsCount: document.getElementById('results-count'),
  resultsList: document.getElementById('results-list'),

  // 로딩 & 에러
  loading: document.getElementById('loading'),
  errorState: document.getElementById('error-state'),
  retryBtn: document.getElementById('retry-btn'),

  // 상세
  backBtn: document.getElementById('back-btn'),
  errorBadge: document.getElementById('error-badge'),
  errorId: document.getElementById('error-id'),
  errorTitle: document.getElementById('error-title'),
  errorCode: document.getElementById('error-code'),
  errorDescription: document.getElementById('error-description'),
  stepsList: document.getElementById('steps-list'),

  // EULA
  eulaModal: document.getElementById('eula-modal'),
  eulaCheckbox: document.getElementById('eula-checkbox'),
  eulaAgreeBtn: document.getElementById('eula-agree-btn'),

  // 자료실
  docsBtn: document.getElementById('docs-btn'),
  docsDropdown: document.getElementById('docs-dropdown'),
  docsCloseBtn: document.getElementById('docs-close-btn'),

  // 탭 네비게이션
  tabLm100: document.getElementById('tab-lm100'),
  tabLcam: document.getElementById('tab-lcam'),

  // L-CAM 에러 화면
  lcamView: document.getElementById('lcam-view'),
  lcamDetailView: document.getElementById('lcam-detail-view'),
  lcamSearchInput: document.getElementById('lcam-search-input'),
  lcamClearBtn: document.getElementById('lcam-clear-btn'),
  lcamErrorList: document.getElementById('lcam-error-list'),
  lcamLoading: document.getElementById('lcam-loading'),
  lcamBackBtn: document.getElementById('lcam-back-btn'),
  lcamErrorName: document.getElementById('lcam-error-name'),
  lcamErrorMessage: document.getElementById('lcam-error-message'),
  lcamErrorCause: document.getElementById('lcam-error-cause'),
  lcamErrorSolution: document.getElementById('lcam-error-solution')
};

// ========================================
// 초기화
// ========================================
async function init() {
  console.log('[Mobile] Initializing L-CAM Doctor Mobile...');

  // EULA 동의 확인
  if (!checkEulaAgreement()) {
    showEulaModal();
    setupEulaEventListeners();
    return; // EULA 동의 전까지 앱 초기화 중단
  }

  // 앱 초기화 진행
  initializeApp();
}

async function initializeApp() {
  // 이벤트 리스너 등록
  setupEventListeners();

  // 데이터 로드
  await loadErrorData();
  await loadLcamErrorData();

  console.log('[Mobile] Initialization complete');
}

// ========================================
// EULA 관련 함수
// ========================================
function checkEulaAgreement() {
  return localStorage.getItem('eula_agreed') === 'true';
}

function showEulaModal() {
  elements.eulaModal.classList.remove('hidden');
}

function hideEulaModal() {
  elements.eulaModal.classList.add('hidden');
}

function setupEulaEventListeners() {
  // 체크박스 변경 시 버튼 활성화/비활성화
  elements.eulaCheckbox.addEventListener('change', () => {
    elements.eulaAgreeBtn.disabled = !elements.eulaCheckbox.checked;
  });

  // 동의 버튼 클릭
  elements.eulaAgreeBtn.addEventListener('click', () => {
    localStorage.setItem('eula_agreed', 'true');
    hideEulaModal();
    initializeApp();
  });
}

// ========================================
// 데이터 로드 (fetch로 db.json 로드)
// ========================================
async function loadErrorData() {
  showLoading(true);
  hideError();

  try {
    const response = await fetch('db.json');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // db.json이 배열 형태인 경우와 { errors: [] } 형태인 경우 모두 지원
    state.errors = Array.isArray(data) ? data : (data.errors || []);

    console.log(`[Mobile] Loaded ${state.errors.length} error entries`);
    showLoading(false);

  } catch (error) {
    console.error('[Mobile] Failed to load error data:', error);
    showLoading(false);
    showError();
  }
}

function showLoading(show) {
  if (show) {
    elements.loading.classList.remove('hidden');
  } else {
    elements.loading.classList.add('hidden');
  }
}

function showError() {
  elements.errorState.classList.remove('hidden');
}

function hideError() {
  elements.errorState.classList.add('hidden');
}

// ========================================
// L-CAM 에러 데이터 로드
// ========================================
async function loadLcamErrorData() {
  try {
    const response = await fetch('lcam_errors.json');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    state.lcamErrors = data.lcam_software_errors || [];

    console.log(`[Mobile] Loaded ${state.lcamErrors.length} L-CAM error entries`);

    // 초기 목록 렌더링
    renderLcamErrorList(state.lcamErrors);

  } catch (error) {
    console.error('[Mobile] Failed to load L-CAM error data:', error);
  }
}

// ========================================
// 이벤트 리스너 설정
// ========================================
function setupEventListeners() {
  // 검색 입력
  elements.searchInput.addEventListener('input', handleSearch);
  elements.searchInput.addEventListener('focus', handleSearchFocus);

  // 지우기 버튼
  elements.clearBtn.addEventListener('click', clearSearch);

  // 뒤로가기 버튼
  elements.backBtn.addEventListener('click', showMainView);

  // 재시도 버튼
  elements.retryBtn.addEventListener('click', loadErrorData);

  // 뒤로가기 (하드웨어 버튼/제스처)
  window.addEventListener('popstate', handlePopState);

  // 자료실 버튼
  elements.docsBtn.addEventListener('click', openDocsDropdown);
  elements.docsCloseBtn.addEventListener('click', closeDocsDropdown);

  // 탭 네비게이션
  elements.tabLm100.addEventListener('click', () => switchTab('main-view'));
  elements.tabLcam.addEventListener('click', () => switchTab('lcam-view'));

  // L-CAM 검색
  elements.lcamSearchInput.addEventListener('input', handleLcamSearch);
  elements.lcamClearBtn.addEventListener('click', clearLcamSearch);

  // L-CAM 뒤로가기
  elements.lcamBackBtn.addEventListener('click', showLcamListView);
}

// ========================================
// 검색 기능
// ========================================
function handleSearch(e) {
  const query = e.target.value.trim();

  // 지우기 버튼 표시/숨김
  if (query.length > 0) {
    elements.clearBtn.classList.remove('hidden');
  } else {
    elements.clearBtn.classList.add('hidden');
    hideSearchResults();
    return;
  }

  // 검색 실행
  const results = searchErrors(query);
  displaySearchResults(results);
}

function handleSearchFocus() {
  const query = elements.searchInput.value.trim();
  if (query.length > 0) {
    const results = searchErrors(query);
    displaySearchResults(results);
  }
}

function searchErrors(query) {
  if (!query || query.length === 0) return [];

  const lowerQuery = query.toLowerCase();

  return state.errors.filter(error => {
    // ID (에러 코드) 검색
    if (error.id.toString() === query) return true;

    // 제목 검색 (display_title 또는 title)
    const title = error.display_title || error.title;
    if (title && title.toLowerCase().includes(lowerQuery)) return true;

    // 에러 코드명 검색 (error_code)
    if (error.error_code && error.error_code.toLowerCase().includes(lowerQuery)) return true;

    // 설명 검색
    if (error.description && error.description.toLowerCase().includes(lowerQuery)) return true;

    // 키워드 검색
    if (error.keywords && error.keywords.some(kw => kw.toLowerCase().includes(lowerQuery))) return true;

    // 보드 검색
    if (error.board && error.board.toLowerCase().includes(lowerQuery)) return true;

    return false;
  });
}

function displaySearchResults(results) {
  // 검색 결과가 없고, 숫자로 검색한 경우 Unknown Error(9999) 표시
  if (results.length === 0) {
    const query = elements.searchInput.value.trim();
    const unknownError = state.errors.find(e => e.id === 9999);

    if (/^\d+$/.test(query) && unknownError) {
      // 숫자로 검색했는데 결과가 없으면 Unknown Error 표시
      results = [unknownError];
    }
  }

  elements.resultsCount.textContent = results.length;

  if (results.length === 0) {
    elements.resultsList.innerHTML = `
      <li class="no-results">
        검색 결과가 없습니다.<br>
        다른 키워드로 검색해보세요.
      </li>
    `;
  } else {
    elements.resultsList.innerHTML = results.map(error => `
      <li class="result-item" data-id="${error.id}">
        <span class="result-badge">
          <span class="severity-badge ${error.severity.toLowerCase()}">${getSeverityLabel(error.severity)}</span>
        </span>
        <div class="result-content">
          <div class="result-title">${escapeHtml(error.display_title || error.title)}</div>
          <div class="result-code">Error Code: ${error.id}</div>
        </div>
        <span class="result-arrow">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4 L10 8 L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </li>
    `).join('');

    // 결과 항목 클릭 이벤트
    elements.resultsList.querySelectorAll('.result-item').forEach(item => {
      item.addEventListener('click', () => {
        const errorId = parseInt(item.dataset.id, 10);
        const error = state.errors.find(e => e.id === errorId);
        if (error) {
          showDetailView(error);
        }
      });
    });
  }

  showSearchResults();
}

function showSearchResults() {
  elements.searchResults.classList.remove('hidden');
}

function hideSearchResults() {
  elements.searchResults.classList.add('hidden');
}

function clearSearch() {
  elements.searchInput.value = '';
  elements.clearBtn.classList.add('hidden');
  hideSearchResults();
  elements.searchInput.focus();
}

// ========================================
// 상세 화면
// ========================================
function showDetailView(error) {
  state.currentError = error;

  // 히스토리에 상태 추가 (뒤로가기 지원)
  history.pushState({ view: 'detail', errorId: error.id }, '', `#error-${error.id}`);

  // 에러 정보 렌더링
  elements.errorBadge.className = `severity-badge ${error.severity.toLowerCase()}`;
  elements.errorBadge.textContent = getSeverityLabel(error.severity);
  elements.errorId.textContent = `#${error.id}`;
  elements.errorTitle.textContent = error.display_title || error.title;
  elements.errorCode.textContent = `Error Code: ${error.id} | Board: ${error.board || 'N/A'}`;
  elements.errorDescription.textContent = error.description || '상세 설명이 없습니다.';

  // 해결 단계 렌더링
  renderSteps(error.steps || []);

  // 화면 전환
  elements.mainView.classList.remove('active');
  elements.detailView.classList.add('active');

  // 스크롤 맨 위로
  window.scrollTo(0, 0);
}

function renderSteps(steps) {
  if (steps.length === 0) {
    elements.stepsList.innerHTML = `
      <div class="step-item">
        <div class="step-number">!</div>
        <div class="step-content">
          <p class="step-text">해결 방법 정보가 없습니다. 고객지원팀에 문의해주세요.</p>
        </div>
      </div>
    `;
    return;
  }

  elements.stepsList.innerHTML = steps.map((step, index) => `
    <div class="step-item">
      <div class="step-number">${index + 1}</div>
      <div class="step-content">
        <p class="step-text">${escapeHtml(step.text)}</p>
        ${step.image ? `
          <div class="step-image">
            <img src="${step.image}" alt="Step ${index + 1}"
                 onerror="this.parentElement.innerHTML='<div class=\\'image-placeholder\\'><svg width=\\'40\\' height=\\'40\\' viewBox=\\'0 0 40 40\\' fill=\\'none\\'><rect x=\\'4\\' y=\\'4\\' width=\\'32\\' height=\\'32\\' rx=\\'4\\' stroke=\\'#6b7280\\' stroke-width=\\'2\\'/><circle cx=\\'14\\' cy=\\'14\\' r=\\'3\\' stroke=\\'#6b7280\\' stroke-width=\\'2\\'/><path d=\\'M8 32 L16 24 L24 32\\' stroke=\\'#6b7280\\' stroke-width=\\'2\\'/><path d=\\'M20 28 L28 20 L36 28\\' stroke=\\'#6b7280\\' stroke-width=\\'2\\'/></svg><p>이미지를 불러올 수 없습니다</p></div>'">
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function showMainView() {
  state.currentError = null;

  // 히스토리 뒤로
  if (history.state && history.state.view === 'detail') {
    history.back();
  } else {
    switchToMainView();
  }
}

function switchToMainView() {
  elements.detailView.classList.remove('active');
  elements.mainView.classList.add('active');

  // 검색 입력에 포커스
  elements.searchInput.focus();
}

function handlePopState() {
  if (elements.detailView.classList.contains('active')) {
    switchToMainView();
  } else if (elements.lcamDetailView.classList.contains('active')) {
    switchToLcamListView();
  }
}

// ========================================
// 자료실 기능
// ========================================
function openDocsDropdown() {
  elements.docsDropdown.classList.remove('hidden');
}

function closeDocsDropdown() {
  elements.docsDropdown.classList.add('hidden');
}

// ========================================
// 탭 네비게이션
// ========================================
function switchTab(tabId) {
  state.currentTab = tabId;

  // 모든 탭 버튼 비활성화
  elements.tabLm100.classList.remove('active');
  elements.tabLcam.classList.remove('active');

  // 모든 뷰 숨기기
  elements.mainView.classList.remove('active');
  elements.lcamView.classList.remove('active');
  elements.detailView.classList.remove('active');
  elements.lcamDetailView.classList.remove('active');

  // 선택된 탭 활성화
  if (tabId === 'main-view') {
    elements.tabLm100.classList.add('active');
    elements.mainView.classList.add('active');
  } else if (tabId === 'lcam-view') {
    elements.tabLcam.classList.add('active');
    elements.lcamView.classList.add('active');
  }
}

// ========================================
// L-CAM 에러 검색 기능
// ========================================
function handleLcamSearch(e) {
  const query = e.target.value.trim();

  // 지우기 버튼 표시/숨김
  if (query.length > 0) {
    elements.lcamClearBtn.classList.remove('hidden');
  } else {
    elements.lcamClearBtn.classList.add('hidden');
    renderLcamErrorList(state.lcamErrors);
    return;
  }

  // 검색 실행
  const results = searchLcamErrors(query);
  renderLcamErrorList(results);
}

function searchLcamErrors(query) {
  if (!query || query.length === 0) return state.lcamErrors;

  const lowerQuery = query.toLowerCase();

  return state.lcamErrors.filter(error => {
    // 에러명 검색
    if (error.name && error.name.toLowerCase().includes(lowerQuery)) return true;

    // 한글 메시지 검색
    if (error.ko_message && error.ko_message.toLowerCase().includes(lowerQuery)) return true;

    // 영문 메시지 검색
    if (error.en_message && error.en_message.toLowerCase().includes(lowerQuery)) return true;

    // 원인 검색
    if (error.cause && error.cause.toLowerCase().includes(lowerQuery)) return true;

    // 해결방법 검색
    if (error.solution && error.solution.toLowerCase().includes(lowerQuery)) return true;

    return false;
  });
}

function clearLcamSearch() {
  elements.lcamSearchInput.value = '';
  elements.lcamClearBtn.classList.add('hidden');
  renderLcamErrorList(state.lcamErrors);
  elements.lcamSearchInput.focus();
}

function renderLcamErrorList(errors) {
  if (errors.length === 0) {
    elements.lcamErrorList.innerHTML = `
      <div class="lcam-no-results">
        검색 결과가 없습니다.<br>
        다른 키워드로 검색해보세요.
      </div>
    `;
    return;
  }

  elements.lcamErrorList.innerHTML = errors.map((error, index) => `
    <div class="lcam-error-item" data-index="${index}" data-name="${error.name}">
      <div class="lcam-error-item-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="lcam-error-item-content">
        <div class="lcam-error-item-name">${escapeHtml(error.name)}</div>
        <div class="lcam-error-item-message">${escapeHtml(error.ko_message)}</div>
      </div>
      <div class="lcam-error-item-arrow">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 4 L10 8 L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  `).join('');

  // 클릭 이벤트 등록
  elements.lcamErrorList.querySelectorAll('.lcam-error-item').forEach(item => {
    item.addEventListener('click', () => {
      const errorName = item.dataset.name;
      const error = state.lcamErrors.find(e => e.name === errorName);
      if (error) {
        showLcamDetailView(error);
      }
    });
  });
}

// ========================================
// L-CAM 에러 상세 화면
// ========================================
function showLcamDetailView(error) {
  state.currentLcamError = error;

  // 히스토리에 상태 추가
  history.pushState({ view: 'lcam-detail', errorName: error.name }, '', `#lcam-${error.name}`);

  // 에러 정보 렌더링
  elements.lcamErrorName.textContent = error.name;
  elements.lcamErrorMessage.textContent = error.ko_message;
  elements.lcamErrorCause.textContent = error.cause || '원인 정보가 없습니다.';
  elements.lcamErrorSolution.textContent = error.solution || '해결 방법 정보가 없습니다.';

  // 화면 전환
  elements.lcamView.classList.remove('active');
  elements.lcamDetailView.classList.add('active');

  // 스크롤 맨 위로
  window.scrollTo(0, 0);
}

function showLcamListView() {
  state.currentLcamError = null;

  // 히스토리 뒤로
  if (history.state && history.state.view === 'lcam-detail') {
    history.back();
  } else {
    switchToLcamListView();
  }
}

function switchToLcamListView() {
  elements.lcamDetailView.classList.remove('active');
  elements.lcamView.classList.add('active');
}

// ========================================
// 유틸리티 함수
// ========================================
function getSeverityLabel(severity) {
  const labels = {
    'CRITICAL': '심각',
    'WARNING': '경고',
    'INFO': '정보',
    'SYSTEM': '시스템'
  };
  return labels[severity] || severity;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========================================
// 앱 시작
// ========================================
document.addEventListener('DOMContentLoaded', init);
