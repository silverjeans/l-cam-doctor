/**
 * L-CAM Doctor Mobile - 검색 및 렌더링 스크립트
 * 순수 HTML/CSS/JS로만 동작 (Node.js/Electron 코드 제거)
 */

// ========================================
// 상태 관리
// ========================================
const state = {
  errors: [],
  currentError: null,
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
  stepsList: document.getElementById('steps-list')
};

// ========================================
// 초기화
// ========================================
async function init() {
  console.log('[Mobile] Initializing L-CAM Doctor Mobile...');

  // 이벤트 리스너 등록
  setupEventListeners();

  // 데이터 로드
  await loadErrorData();

  console.log('[Mobile] Initialization complete');
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

    // 제목 검색
    if (error.title && error.title.toLowerCase().includes(lowerQuery)) return true;

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
            <img src="assets/guide/${step.image}" alt="Step ${index + 1}"
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

function handlePopState(event) {
  if (elements.detailView.classList.contains('active')) {
    switchToMainView();
  }
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
