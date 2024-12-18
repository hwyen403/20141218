let questions = [];
let currentQuestion = 0;
let userAnswers = [];

// 檔案上傳處理
document.getElementById('fileInput').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (validateExcelData(jsonData)) {
            questions = jsonData;
            // 檢查學號是否已輸入
            const studentId = document.getElementById('studentId').value.trim();
            document.getElementById('startBtn').disabled = !studentId;
            alert(`成功載入 ${questions.length} 道題目！`);
        } else {
            throw new Error('Excel 格式不正確');
        }
    } catch (error) {
        alert('檔案格式錯誤！請確保包含：題目、選項A、選項B、選項C、選項D、正確答案');
        document.getElementById('fileInput').value = '';
        document.getElementById('startBtn').disabled = true;
    }
});

// 驗證 Excel 資料格式
function validateExcelData(data) {
    if (!Array.isArray(data) || data.length === 0) return false;
    const requiredColumns = ['題目', '選項A', '選項B', '選項C', '選項D', '正確答案'];
    return requiredColumns.every(column => data[0].hasOwnProperty(column));
}

// 開始測驗
document.getElementById('startBtn').addEventListener('click', function() {
    const studentId = document.getElementById('studentId').value.trim();
    if (!studentId) {
        alert('請輸入學號！');
        return;
    }
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('quizSection').style.display = 'block';
    showQuestion();
});

// 顯示題目
function showQuestion() {
    const question = questions[currentQuestion];
    document.getElementById('questionNumber').textContent = 
        `題目 ${currentQuestion + 1}/${questions.length}`;
    document.getElementById('questionText').textContent = question['題目'];

    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';

    ['選項A', '選項B', '選項C', '選項D'].forEach((option, index) => {
        const div = document.createElement('div');
        div.className = 'option';
        div.textContent = question[option];
        div.onclick = () => selectOption(index);
        optionsContainer.appendChild(div);
    });

    if (userAnswers[currentQuestion] !== undefined) {
        const options = document.getElementsByClassName('option');
        options[userAnswers[currentQuestion]].classList.add('selected');
    }
}

// 選擇答案
function selectOption(index) {
    const options = document.getElementsByClassName('option');
    Array.from(options).forEach(option => {
        option.classList.remove('selected');
    });
    options[index].classList.add('selected');
    userAnswers[currentQuestion] = index;
}

// 下一題
document.getElementById('nextBtn').addEventListener('click', function() {
    if (userAnswers[currentQuestion] === undefined) {
        alert('請選擇一個答案！');
        return;
    }

    currentQuestion++;
    if (currentQuestion < questions.length) {
        showQuestion();
    } else {
        showResult();
    }
});

// 顯示結果
function showResult() {
    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('resultSection').style.display = 'block';

    let score = 0;
    const wrongAnswers = [];

    questions.forEach((question, index) => {
        const userAnswer = question[`選項${String.fromCharCode(65 + userAnswers[index])}`];
        if (userAnswer === question['正確答案']) {
            score++;
        } else {
            wrongAnswers.push({
                question: question['題目'],
                userAnswer: userAnswer,
                correctAnswer: question['正確答案']
            });
        }
    });

    // 顯示分數
    const scorePercentage = (score / questions.length * 100).toFixed(1);
    document.getElementById('scoreCard').innerHTML = `
        <h3>測驗成績</h3>
        <p>總題數：${questions.length}</p>
        <p>答對題數：${score}</p>
        <p>得分率：${scorePercentage}%</p>
    `;

    // 顯示錯誤題目
    const wrongAnswersList = document.getElementById('wrongAnswersList');
    if (wrongAnswers.length > 0) {
        wrongAnswersList.innerHTML = '<h3>需要複習的題目：</h3>';
        wrongAnswers.forEach((wrong, index) => {
            wrongAnswersList.innerHTML += `
                <div class="wrong-item">
                    <p><strong>題目 ${index + 1}:</strong> ${wrong.question}</p>
                    <p>您的答案：${wrong.userAnswer}</p>
                    <p>正確答案：${wrong.correctAnswer}</p>
                </div>
            `;
        });
    } else {
        wrongAnswersList.innerHTML = '<h3 style="color: var(--success-color)">恭喜！全部答對！</h3>';
    }

    // 儲存學生成績資訊
    const studentId = document.getElementById('studentId').value;
    window.studentResult = {
        studentId: studentId,
        totalQuestions: questions.length,
        correctAnswers: score,
        percentage: scorePercentage,
        date: new Date().toLocaleString()
    };
}

// 重新測驗
document.getElementById('retryBtn').addEventListener('click', function() {
    currentQuestion = 0;
    userAnswers = [];
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('fileInput').value = '';
    document.getElementById('startBtn').disabled = true;
});

// 匯出成績功能
document.getElementById('exportBtn').addEventListener('click', function() {
    const result = window.studentResult;
    if (!result) return;

    // 建立工作表
    const ws = XLSX.utils.json_to_sheet([{
        學號: result.studentId,
        測驗日期: result.date,
        總題數: result.totalQuestions,
        答對題數: result.correctAnswers,
        得分率: result.percentage + '%'
    }]);

    // 建立工作簿
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "測驗成績");

    // 設定欄寬
    const wscols = [
        {wch: 15}, // 學號
        {wch: 20}, // 測驗日期
        {wch: 10}, // 總題數
        {wch: 10}, // 答對題數
        {wch: 10}  // 得分率
    ];
    ws['!cols'] = wscols;

    // 匯出檔案
    const fileName = `測驗成績_${result.studentId}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
});

// 驗證學號輸入
document.getElementById('studentId').addEventListener('input', function() {
    const startBtn = document.getElementById('startBtn');
    if (this.value.trim() && document.getElementById('fileInput').files.length > 0) {
        startBtn.disabled = false;
    } else {
        startBtn.disabled = true;
    }
}); 