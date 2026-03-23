// js/report.js
// 부모 학습 리포트 대시보드

function renderReport(st) {
  var content = document.getElementById('reportContent');
  if (!content) return;
  content.innerHTML = '';

  var r = st.reports;
  var known = (st.learning.knownConsonants || []).concat(st.learning.knownVowels || []);
  var completed = st.learning.completedWords || [];

  // 요약 카드
  var summary = document.createElement('div');
  summary.className = 'report-summary';
  summary.innerHTML = '<h3>학습 요약</h3>' +
    '<div class="report-stats">' +
    '<div class="report-stat"><span class="report-stat-num">' + r.totalDays + '</span><span class="report-stat-label">총 학습일</span></div>' +
    '<div class="report-stat"><span class="report-stat-num">' + r.totalMinutes + '</span><span class="report-stat-label">총 학습 시간(분)</span></div>' +
    '<div class="report-stat"><span class="report-stat-num">' + completed.length + '</span><span class="report-stat-label">완료 단어</span></div>' +
    '</div>';
  content.appendChild(summary);

  // 현재 학습 단계
  var stageNames = ['알', '자음 학습', '모음 학습', '낱말 학습'];
  var currentStage = st.learning.stage;
  if (currentStage >= 1 && currentStage <= 3) {
    var current = document.createElement('div');
    current.className = 'report-section';
    var progress = '';
    if (currentStage === 1) progress = st.learning.consonantIndex + '/' + CURRICULUM.consonants.length + ' 자음';
    else if (currentStage === 2) progress = st.learning.vowelIndex + '/' + CURRICULUM.vowels.length + ' 모음';
    else if (currentStage === 3) progress = st.learning.wordIndex + '/' + CURRICULUM.words.length + ' 낱말';
    current.innerHTML = '<h3>현재 학습 단계</h3>' +
      '<p class="report-current-word">' + stageNames[currentStage] + '</p>' +
      '<p class="report-current-phase">' + progress + '</p>';
    content.appendChild(current);
  }

  // 자음 진행
  var consonants = ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ'];
  var consonantCount = 0;
  for (var i = 0; i < consonants.length; i++) {
    if (known.indexOf(consonants[i]) !== -1) consonantCount++;
  }

  var consSection = document.createElement('div');
  consSection.className = 'report-section';
  consSection.innerHTML = '<h3>자음 진행</h3>' +
    '<div class="report-bar-container">' +
    '<div class="report-bar" style="width:' + (consonantCount / consonants.length * 100) + '%"></div>' +
    '</div>' +
    '<p class="report-bar-label">' + consonantCount + ' / ' + consonants.length + '</p>' +
    '<div class="report-letter-grid">' + consonants.map(function(c) {
      return '<span class="report-letter' + (known.indexOf(c) !== -1 ? ' learned' : '') + '">' + c + '</span>';
    }).join('') + '</div>';
  content.appendChild(consSection);

  // 모음 진행
  var vowels = ['ㅏ','ㅓ','ㅗ','ㅜ','ㅡ','ㅣ'];
  var vowelCount = 0;
  for (var j = 0; j < vowels.length; j++) {
    if (known.indexOf(vowels[j]) !== -1) vowelCount++;
  }

  var vowSection = document.createElement('div');
  vowSection.className = 'report-section';
  vowSection.innerHTML = '<h3>모음 진행</h3>' +
    '<div class="report-bar-container">' +
    '<div class="report-bar" style="width:' + (vowelCount / vowels.length * 100) + '%"></div>' +
    '</div>' +
    '<p class="report-bar-label">' + vowelCount + ' / ' + vowels.length + '</p>' +
    '<div class="report-letter-grid">' + vowels.map(function(v) {
      return '<span class="report-letter' + (known.indexOf(v) !== -1 ? ' learned' : '') + '">' + v + '</span>';
    }).join('') + '</div>';
  content.appendChild(vowSection);

  // 완료 단어 목록
  if (completed.length > 0) {
    var wordsSection = document.createElement('div');
    wordsSection.className = 'report-section';
    wordsSection.innerHTML = '<h3>배운 단어</h3>' +
      '<div class="report-word-grid">' + completed.map(function(w) {
        return '<span class="report-word-item">' + w + '</span>';
      }).join('') + '</div>';
    content.appendChild(wordsSection);
  }

  // 이번 주 학습 시간
  if (r.weeklyLog.length > 0) {
    var weekSection = document.createElement('div');
    weekSection.className = 'report-section';
    var maxMin = 1;
    for (var k = 0; k < r.weeklyLog.length; k++) {
      if (r.weeklyLog[k].minutes > maxMin) maxMin = r.weeklyLog[k].minutes;
    }
    var bars = '';
    var recent = r.weeklyLog.slice(-7);
    for (var m = 0; m < recent.length; m++) {
      var pct = (recent[m].minutes / maxMin * 100);
      var day = recent[m].date.slice(5);
      bars += '<div class="report-week-bar-wrap">' +
        '<div class="report-week-bar" style="height:' + pct + '%"></div>' +
        '<span class="report-week-label">' + day + '</span>' +
        '</div>';
    }
    weekSection.innerHTML = '<h3>최근 학습 시간</h3>' +
      '<div class="report-week-chart">' + bars + '</div>';
    content.appendChild(weekSection);
  }

  // 오늘
  var todaySection = document.createElement('div');
  todaySection.className = 'report-section';
  todaySection.innerHTML = '<h3>오늘</h3>' +
    '<p>' + st.daily.minutesToday + '분 학습, ' + st.daily.activitiesDone + '개 활동 완료</p>';
  content.appendChild(todaySection);
}
