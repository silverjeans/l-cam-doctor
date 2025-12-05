/**
 * logAnalyzer.js
 * 장비 로그 파일을 스트림 방식으로 분석하여 최근 7일간 에러를 추출
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

/**
 * 로그 파일 분석 메인 함수
 * @param {string} filePath - 로그 파일 경로
 * @param {Array} errorDatabase - db.json에서 로드한 에러 데이터베이스
 * @param {number} analysisDays - 분석 기간 (일 수, 기본값 7)
 * @returns {Promise<Object>} 분석 결과
 */
async function analyzeLogFile(filePath, errorDatabase, analysisDays = 7) {
  // 1. 파일명 검증: .2.txt로 끝나는 파일만 분석
  const fileName = path.basename(filePath);
  if (!fileName.endsWith('.2.txt')) {
    return {
      success: false,
      error: '분석 가능한 로그 파일(.2.txt)이 아닙니다.',
      fileName: fileName
    };
  }

  // 2. 파일 존재 확인
  if (!fs.existsSync(filePath)) {
    return {
      success: false,
      error: '파일을 찾을 수 없습니다.',
      fileName: fileName
    };
  }

  // 3. 분석 기간 날짜 계산
  const now = new Date();
  const periodStartDate = new Date(now.getTime() - analysisDays * 24 * 60 * 60 * 1000);

  // 4. 에러 데이터베이스를 ID로 빠르게 조회할 수 있는 Map 생성
  const errorMap = new Map();
  errorDatabase.forEach(error => {
    errorMap.set(error.id, error);
  });

  // 5. 분석 결과 저장
  const detectedErrors = [];
  const errorCounts = new Map(); // 에러 코드별 발생 횟수

  // 6. 정규표현식 패턴
  // 타임스탬프: YYYY-MM-DDTHH:mm:ss 형식
  const timestampRegex = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/;
  // 에러 코드: MY Error Code: 숫자
  const errorCodeRegex = /MY Error Code:\s*(\d+)/;

  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({
      input: readStream,
      crlfDelay: Infinity
    });

    let lineCount = 0;
    let processedLines = 0;

    rl.on('line', (line) => {
      lineCount++;

      // A. 타임스탬프 추출
      const timestampMatch = line.match(timestampRegex);
      if (!timestampMatch) {
        return; // 타임스탬프가 없는 라인은 스킵
      }

      const dateStr = timestampMatch[1];
      const timeStr = timestampMatch[2];
      const logDate = new Date(`${dateStr}T${timeStr}`);

      // B. 분석 기간 이내 로그만 처리
      if (logDate < periodStartDate) {
        return; // 분석 기간보다 오래된 로그는 스킵
      }

      processedLines++;

      // C. 에러 코드 패턴 매칭 (MY Error Code: 숫자)
      const errorMatch = line.match(errorCodeRegex);
      if (!errorMatch) {
        return; // 에러 코드가 없는 라인은 스킵
      }

      const errorCode = parseInt(errorMatch[1], 10);

      // D. 에러 코드 0은 정상 상태이므로 스킵
      if (errorCode === 0) {
        return;
      }

      // E. DB에서 에러 정보 조회
      const dbInfo = errorMap.get(errorCode);

      // F. 결과 저장
      const errorEntry = {
        detected_code: errorCode,
        timestamp: `${dateStr} ${timeStr}`,
        db_info: dbInfo ? {
          id: dbInfo.id,
          error_code: dbInfo.error_code,
          board: dbInfo.board,
          display_title: dbInfo.display_title,
          severity: dbInfo.severity,
          description: dbInfo.description
        } : null,
        raw_log: line.length > 200 ? line.substring(0, 200) + '...' : line
      };

      detectedErrors.push(errorEntry);

      // G. 에러 코드별 카운트
      const currentCount = errorCounts.get(errorCode) || 0;
      errorCounts.set(errorCode, currentCount + 1);
    });

    rl.on('close', () => {
      // 최신 순으로 정렬
      detectedErrors.sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

      // 에러 요약 생성
      const summary = [];
      errorCounts.forEach((count, code) => {
        const dbInfo = errorMap.get(code);
        summary.push({
          error_code: code,
          count: count,
          display_title: dbInfo?.display_title || 'Unknown Error',
          severity: dbInfo?.severity || 'UNKNOWN',
          board: dbInfo?.board || 'UNKNOWN'
        });
      });

      // 발생 횟수 내림차순 정렬
      summary.sort((a, b) => b.count - a.count);

      resolve({
        success: true,
        fileName: fileName,
        analysisDays: analysisDays,
        analyzedPeriod: {
          from: periodStartDate.toISOString().split('T')[0],
          to: now.toISOString().split('T')[0]
        },
        statistics: {
          totalLines: lineCount,
          processedLines: processedLines,
          totalErrors: detectedErrors.length,
          uniqueErrors: errorCounts.size
        },
        summary: summary,
        errors: detectedErrors
      });
    });

    rl.on('error', (err) => {
      reject({
        success: false,
        error: `파일 읽기 오류: ${err.message}`,
        fileName: fileName
      });
    });

    readStream.on('error', (err) => {
      reject({
        success: false,
        error: `스트림 오류: ${err.message}`,
        fileName: fileName
      });
    });
  });
}

/**
 * 여러 파일에서 .2.txt 파일만 필터링하여 분석
 * @param {string[]} filePaths - 파일 경로 배열
 * @param {Array} errorDatabase - 에러 데이터베이스
 * @param {number} analysisDays - 분석 기간 (일 수, 기본값 7)
 * @returns {Promise<Object>} 분석 결과
 */
async function analyzeMultipleFiles(filePaths, errorDatabase, analysisDays = 7) {
  // .2.txt 파일만 필터링
  const validFiles = filePaths.filter(fp => path.basename(fp).endsWith('.2.txt'));

  if (validFiles.length === 0) {
    return {
      success: false,
      error: '분석 가능한 로그 파일(.2.txt)이 없습니다.',
      providedFiles: filePaths.map(fp => path.basename(fp))
    };
  }

  // 첫 번째 유효한 파일 분석 (보통 1개만 있음)
  const result = await analyzeLogFile(validFiles[0], errorDatabase, analysisDays);
  return result;
}

module.exports = {
  analyzeLogFile,
  analyzeMultipleFiles
};
