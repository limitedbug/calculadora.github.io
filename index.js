// Global reference to secondary window
let secondaryWin = null;

// Function to restore state and normal view
function restoreState() {
    const savedState = JSON.parse(localStorage.getItem('calculatorState') || '{}');
    if (savedState.expr !== undefined) {
        exprInput.value = savedState.expr;
        resultDisplay.textContent = savedState.res;
    }
    if (savedState.isScientific !== undefined) {
        const box = document.querySelector('.box');
        const button = document.getElementById('toggle-scientific');
        if (savedState.isScientific) {
            box.classList.add('scientific');
            button.textContent = '±';
        } else {
            box.classList.remove('scientific');
            button.textContent = '√';
        }
    }
    localStorage.removeItem('calculatorState');
    document.querySelector('.box').style.display = '';
    document.getElementById('pro-msg').style.display = 'none';
    exprInput.focus();
    secondaryWin = null;
}

// Function to update saved state (called from secondary on close)
function updateSavedState(expr, res, isScientific = null) {
    const current = JSON.parse(localStorage.getItem('calculatorState') || '{}');
    localStorage.setItem('calculatorState', JSON.stringify({ expr: expr, res: res, isScientific: isScientific !== null ? isScientific : current.isScientific }));
}

document.getElementById('toggle-size').addEventListener('click', function() {
    if (secondaryWin && !secondaryWin.closed) {
        // If secondary is open, close it and restore
        secondaryWin.close();
        restoreState();
        return;
    }

    // Open a secondary window containing the calculator UI and switch to pro mode
    const box = document.querySelector('.box');
    const rect = box.getBoundingClientRect();

    // get absolute href of current stylesheet so it can be used in the new window
    const cssHref = (document.querySelector('link[rel="stylesheet"]') || {}).href || 'style.css';

    const width = Math.round(rect.width + 20); // add small padding
    const height = Math.round(rect.height + 20 + 60); // account for top buttons and padding

    const features = `width=${width},height=${height},left=100,top=100,resizable=yes`;

    // Save current state
    const savedState = { expr: exprInput.value, res: resultDisplay.textContent, isScientific: box.classList.contains('scientific') };
    localStorage.setItem('calculatorState', JSON.stringify(savedState));

    // clone the calculator box HTML (before hiding)
    const boxHtml = box.outerHTML;

    // Prepare current state to pass to secondary
    const currentExpr = exprInput.value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const currentRes = resultDisplay.textContent.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const currentIsScientific = box.classList.contains('scientific');

    // Switch to pro mode view: hide box, show message
    box.style.display = 'none';
    document.getElementById('pro-msg').style.display = 'flex';

    secondaryWin = window.open('', 'calculadora_pro', features);
    if (!secondaryWin) {
        alert('No se pudo abrir la ventana secundaria. Revisa el bloqueador de ventanas emergentes.');
        return;
    }

    // inline script to wire the calculator inside the new window (with keyboard, pressed, toggle scientific)
    const inlineScript = `
        (function(){
            function evaluateExpression(exp) {
                const sanitized = exp.replace(/×/g,'*').replace(/÷/g,'/').replace(/%/g,'/100');
                const allowedChars = '0123456789+-*/.() %';
                if (sanitized.split('').some(c => !allowedChars.includes(c))) return 'Error';
                try{ const fn = new Function('return ' + sanitized); const val = fn(); return (typeof val==='number'&&isFinite(val))?val:'Error'; }catch(e){return 'Error'}
            }

            const exprInput = document.getElementById('expression');
            const resultDisplay = document.getElementById('result');

            // Simulate press: add pressed class and trigger action
            const simulatePress = (button) => {
                if (!button) return;
                button.classList.add('pressed');
                setTimeout(() => button.classList.remove('pressed'), 120);
                button.click();
            };

            // Global keyboard mapping
            document.addEventListener('keydown', (e) => {
                const key = e.key;
                if (key === 'Escape') {
                    const clearBtn = document.querySelector('.button-clear');
                    simulatePress(clearBtn);
                    return;
                }
                if (key === 'Backspace') {
                    const delBtn = document.querySelector('.button-delete');
                    simulatePress(delBtn);
                    e.preventDefault();
                    return;
                }
                if (key === 'Enter' || key === '=') {
                    const eqBtn = document.querySelector('.button-result');
                    simulatePress(eqBtn);
                    e.preventDefault();
                    return;
                }
                const mapKeyToText = (k) => {
                    if (k === '*') return '×';
                    if (k === '/') return '÷';
                    return k;
                };
                const t = mapKeyToText(key);
                const btn = Array.from(document.querySelectorAll('.actions button')).find(b => b.textContent.trim() === t);
                if (btn) {
                    simulatePress(btn);
                    e.preventDefault();
                }
            });

            // Keyboard on input (basic eval on Enter)
            exprInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const res = evaluateExpression(exprInput.value);
                    resultDisplay.textContent = res;
                    e.preventDefault();
                }
            });

            // Toggle size button in secondary to close window
            document.getElementById('toggle-size').addEventListener('click', () => window.close());

            // Disable transition for instant resize
            document.querySelector('.box').style.transition = 'none';

            // Toggle scientific (adds size change)
            document.getElementById('toggle-scientific').addEventListener('click', function() {
                const box = document.querySelector('.box');
                const button = this;
                box.classList.toggle('scientific');
                if (box.classList.contains('scientific')) {
                    button.textContent = '±';
                    requestAnimationFrame(() => requestAnimationFrame(() => {
                        const rect = box.getBoundingClientRect();
                        const newWidth = Math.round(${width}+400);
                        const newHeight = Math.round(${height}+25);
                        window.resizeTo(newWidth, newHeight);
                    }));
                } else {
                    button.textContent = '√';
                    requestAnimationFrame(() => requestAnimationFrame(() => {
                        const rect = box.getBoundingClientRect();
                        const newWidth = Math.round(${width}+20);
                        const newHeight = Math.round(${height}+20);
                        window.resizeTo(newWidth, newHeight);
                    }));
                }
                
            });

            // Button click handlers (all action buttons, including scientific for append)
            document.querySelectorAll('.actions button').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    const el = e.currentTarget;
                    const txt = el.textContent.trim();

                    // Add pressed effect on click
                    el.classList.add('pressed');
                    setTimeout(() => el.classList.remove('pressed'), 120);

                    if (el.classList.contains('button-clear')) {
                        exprInput.value = '';
                        resultDisplay.textContent = '';
                        return;
                    }
                    if (el.classList.contains('button-result') || txt === '=') {
                        resultDisplay.textContent = evaluateExpression(exprInput.value);
                        return;
                    }
                    if (el.classList.contains('button-delete')) {
                        exprInput.value = exprInput.value.slice(0, -1);
                        return;
                    }
                    // Append for others, including scientific
                    exprInput.value += txt;
                });
            });

            // On close, save current state and restore parent
            window.addEventListener('beforeunload', () => {
                if (window.opener && window.opener.updateSavedState) {
                    const isScientific = document.querySelector('.box').classList.contains('scientific');
                    window.opener.updateSavedState(exprInput.value, resultDisplay.textContent, isScientific);
                }
                if (window.opener && window.opener.restoreState) {
                    window.opener.restoreState();
                }
            });

            // Set initial state
            exprInput.value = '${currentExpr}';
            resultDisplay.textContent = '${currentRes}';
            if (${currentIsScientific}) {
                document.querySelector('.box').classList.add('scientific');
                document.getElementById('toggle-scientific').textContent = '±';
            } else {
                document.querySelector('.box').classList.remove('scientific');
                document.getElementById('toggle-scientific').textContent = '√';
            }

            // Focus input initially
            exprInput && exprInput.focus();
        })();
    `;

    const docHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Calculadora Pro</title><link rel="stylesheet" href="${cssHref}"></head><body>${boxHtml}<script>${inlineScript}<\/script></body></html>`;

    secondaryWin.document.open();
    secondaryWin.document.write(docHtml);
    secondaryWin.document.close();
});

document.getElementById('toggle-scientific').addEventListener('click', function() {
    const box = document.querySelector('.box');
    const button = document.getElementById('toggle-scientific');
    
    box.classList.toggle('scientific');
    
    if (box.classList.contains('scientific')) {
        button.textContent = '±';
    } else {
        button.textContent = '√';
    }
});

// Basic calculator wiring for normal buttons (numbers and common operators)
const exprInput = document.getElementById('expression');
const resultDisplay = document.getElementById('result');

// Helper to sanitize and evaluate the expression safely-ish
function evaluateExpression(exp) {
    // replace X with * and handle percent
    const sanitized = exp.replace(/X/g, '*').replace(/×/g, '*').replace(/÷/g, '/').replace(/%/g, '/100');
    // allow only digits, operators, parentheses, dot and spaces
    const allowedChars = '0123456789+-*/.() %';
    if (sanitized.split('').some(c => !allowedChars.includes(c))) return 'Error';
    try {
        // eslint-disable-next-line no-new-func
        const fn = new Function('return ' + sanitized);
        const val = fn();
        if (typeof val === 'number' && isFinite(val)) return val;
        return 'Error';
    } catch (e) {
        return 'Error';
    }
}

// click handler for all normal buttons inside .actions (but ignore scientific buttons)
document.querySelectorAll('.actions .column button, .actions .scientific-section button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const el = e.currentTarget;
        const txt = el.textContent.trim();

        // skip scientific buttons (they have class buttons-scientific)
        if (el.classList.contains('buttons-scientific')) return;

        if (el.classList.contains('button-clear')) {
            exprInput.value = '';
            resultDisplay.textContent = '';
            return;
        }

        if (el.classList.contains('button-result') || txt === '=') {
            const res = evaluateExpression(exprInput.value);
            resultDisplay.textContent = res;
            return;
        }

        if (el.classList.contains('button-delete')) {
            exprInput.value = exprInput.value.slice(0, -1);
            return;
        }

        // Append numbers/operators to input
        exprInput.value += txt;
    });
});

// Make number/operator keys also update input when pressed on keyboard
exprInput.addEventListener('keydown', (e) => {
    // allow basic navigation and editing
    if (e.key === 'Enter') {
        const res = evaluateExpression(exprInput.value);
        resultDisplay.textContent = res;
        e.preventDefault();
    }
});

// Global keyboard mapping to simulate button clicks
document.addEventListener('keydown', (e) => {
    const key = e.key;

    // Escape = clear
    const simulatePress = (button) => {
        if (!button) return;
        button.classList.add('pressed');
        // trigger click action
        button.click();
        setTimeout(() => button.classList.remove('pressed'), 120);
    };

    if (key === 'Escape') {
        const clearBtn = document.querySelector('.button-clear');
        simulatePress(clearBtn);
        return;
    }

    // Backspace = delete
    if (key === 'Backspace') {
        const delBtn = document.querySelector('.button-delete');
        simulatePress(delBtn);
        e.preventDefault();
        return;
    }

    // Enter or = -> evaluate
    if (key === 'Enter' || key === '=') {
        const eqBtn = document.querySelector('.button-result');
        simulatePress(eqBtn);
        e.preventDefault();
        return;
    }

    // Map simple operators and digits to corresponding buttons by text
    const mapKeyToText = (k) => {
        if (k === '*') return '×';
        if (k === '/') return '÷';
        return k;
    };

    const t = mapKeyToText(key);
    // find a button whose textContent equals t
    const btn = Array.from(document.querySelectorAll('.actions button'))
        .find(b => b.textContent.trim() === t);

    if (btn) {
        simulatePress(btn);
        e.preventDefault();
    }
});
