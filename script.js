
document.addEventListener('DOMContentLoaded', () => {
    // Referências do DOM
    const mainDisplay = document.getElementById('main-display');
    const expressionDisplay = document.getElementById('expression-display');
    const historyPanel = document.getElementById('history-panel');
    const historyList = document.getElementById('history-list');
    const btnHistory = document.getElementById('btn-history');
    const btnClearHistory = document.getElementById('btn-clear-history');
    const themeLight = document.getElementById('theme-light');
    const themeDark = document.getElementById('theme-dark');

    // Estado interno da calculadora
    let currentValue = '0';
    let previousValue = '';
    let operator = null;
    let shouldResetDisplay = false;
    let history = JSON.parse(localStorage.getItem('calc_history')) || [];

    // --- Gerenciamento de Tema ---
    function initTheme() {
        const savedTheme = localStorage.getItem('calc_theme') || 'dark';
        setTheme(savedTheme);
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('calc_theme', theme);

        if (theme === 'dark') {
            themeDark.classList.add('active');
            themeLight.classList.remove('active');
        } else {
            themeLight.classList.add('active');
            themeDark.classList.remove('active');
        }
    }

    themeLight.addEventListener('click', () => setTheme('light'));
    themeDark.addEventListener('click', () => setTheme('dark'));

    // --- Gerenciamento do Histórico ---
    btnHistory.addEventListener('click', () => {
        historyPanel.classList.toggle('open');
    });

    btnClearHistory.addEventListener('click', () => {
        history = [];
        localStorage.removeItem('calc_history');
        renderHistory();
    });

    function saveHistory(expression, result) {
        history.unshift({ expression, result });
        if (history.length > 15) history.pop();
        localStorage.setItem('calc_history', JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        if (history.length === 0) {
            historyList.innerHTML = '<div class="history-empty">Nenhum cálculo registrado</div>';
            return;
        }

        historyList.innerHTML = history.map((item, index) => `
            <div class="history-item" data-index="${index}">
                <span class="history-expr">${item.expression}</span>
                <span class="history-res">= ${item.result}</span>
            </div>
        `).join('');

        document.querySelectorAll('.history-item').forEach(elem => {
            elem.addEventListener('click', () => {
                const idx = elem.getAttribute('data-index');
                currentValue = history[idx].result;
                shouldResetDisplay = false;
                updateDisplay();
            });
        });
    }

    // --- Matemática Precisa (Evita problemas de ponto flutuante em JS) ---
    function preciseCalculate(a, b, op) {
        const numA = parseFloat(a);
        const numB = parseFloat(b);

        if (isNaN(numA) || isNaN(numB)) return 'Erro';

        let result;
        switch (op) {
            case '+':
                result = numA + numB;
                break;
            case '-':
                result = numA - numB;
                break;
            case '*':
                result = numA * numB;
                break;
            case '/':
                if (numB === 0) return 'Erro';
                result = numA / numB;
                break;
            default:
                return 'Erro';
        }

        // Arredondamento de precisão até 10 casas decimais
        return String(Math.round(result * 1e10) / 1e10);
    }

    // --- Lógica de Interface ---
    function updateDisplay() {
        mainDisplay.textContent = formatDisplayNumber(currentValue);
        if (operator && previousValue !== '') {
            const opSymbol = operator === '*' ? '×' : operator === '/' ? '÷' : operator;
            expressionDisplay.textContent = `${formatDisplayNumber(previousValue)} ${opSymbol}`;
        } else {
            expressionDisplay.textContent = '';
        }
    }

    function formatDisplayNumber(numStr) {
        if (numStr === 'Erro') return 'Erro';
        const parts = numStr.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return parts.join(',');
    }

    function appendNumber(num) {
        if (currentValue === '0' || shouldResetDisplay) {
            currentValue = num === '.' ? '0.' : num;
            shouldResetDisplay = false;
        } else {
            if (num === '.' && currentValue.includes('.')) return;
            if (currentValue.length >= 12) return;
            currentValue += num;
        }
        updateDisplay();
    }

    function handleOperator(nextOp) {
        if (operator && shouldResetDisplay) {
            operator = nextOp;
            updateDisplay();
            return;
        }

        if (previousValue === '') {
            previousValue = currentValue;
        } else if (operator) {
            const result = preciseCalculate(previousValue, currentValue, operator);
            if (result === 'Erro') {
                triggerError();
                return;
            }
            currentValue = result;
            previousValue = currentValue;
        }

        shouldResetDisplay = true;
        operator = nextOp;
        updateDisplay();
    }

    function executeEqual() {
        if (!operator || shouldResetDisplay) return;

        const result = preciseCalculate(previousValue, currentValue, operator);
        if (result === 'Erro') {
            triggerError();
            return;
        }

        const opSymbol = operator === '*' ? '×' : operator === '/' ? '÷' : operator;
        const expr = `${formatDisplayNumber(previousValue)} ${opSymbol} ${formatDisplayNumber(currentValue)}`;

        saveHistory(expr, result);

        currentValue = result;
        previousValue = '';
        operator = null;
        shouldResetDisplay = true;
        updateDisplay();
    }

    function clearAll() {
        currentValue = '0';
        previousValue = '';
        operator = null;
        shouldResetDisplay = false;
        updateDisplay();
    }

    function backspace() {
        if (shouldResetDisplay) return;
        if (currentValue.length === 1 || (currentValue.length === 2 && currentValue.startsWith('-'))) {
            currentValue = '0';
        } else {
            currentValue = currentValue.slice(0, -1);
        }
        updateDisplay();
    }

    function triggerError() {
        currentValue = 'Erro';
        updateDisplay();
        setTimeout(clearAll, 1500);
    }

    // --- Mapeamento de Eventos (Clique) ---
    document.querySelectorAll('[data-number]').forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-number');
            appendNumber(val === ',' ? '.' : val);
        });
    });

    document.querySelectorAll('[data-operator]').forEach(btn => {
        btn.addEventListener('click', () => {
            handleOperator(btn.getAttribute('data-operator'));
        });
    });

    document.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const act = btn.getAttribute('data-action');
            if (act === 'clear') clearAll();
            if (act === 'backspace') backspace();
            if (act === 'calculate') executeEqual();
        });
    });

    // --- Suporte Completo a Teclado ---
    window.addEventListener('keydown', (e) => {
        if (e.key >= '0' && e.key <= '9') appendNumber(e.key);
        else if (e.key === '.' || e.key === ',') appendNumber('.');
        else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') handleOperator(e.key);
        else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); executeEqual(); }
        else if (e.key === 'Backspace') backspace();
        else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') clearAll();
    });

    // Inicializações
    initTheme();
    renderHistory();
});
