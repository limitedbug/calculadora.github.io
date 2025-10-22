document.getElementById('toggle-size').addEventListener('click', function() {
        // Open a secondary window containing the calculator UI and replace main window content
        const box = document.querySelector('.box');
        const rect = box.getBoundingClientRect();

        // get absolute href of current stylesheet so it can be used in the new window
        const cssHref = (document.querySelector('link[rel="stylesheet"]') || {}).href || 'style.css';

        const width = Math.round(rect.width + 20); // add small padding
        const height = Math.round(rect.height + 20 + 60); // account for top buttons and padding

        const features = `width=${width},height=${height},left=100,top=100,resizable=yes`;
        const win = window.open('', 'calculadora_pro', features);
        if (!win) {
                alert('No se pudo abrir la ventana secundaria. Revisa el bloqueador de ventanas emergentes.');
                return;
        }

        // clone the calculator box HTML
        const boxHtml = box.outerHTML;

        // inline script to wire the calculator inside the new window (only normal buttons)
        const inlineScript = `
            (function(){
                function evaluateExpression(exp) {
                    const sanitized = exp.replace(/×/g,'*').replace(/÷/g,'/').replace(/%/g,'/100');
                    if (!/^[0-9+\-*/().\s%]+$/.test(sanitized)) return 'Error';
                    try{ const fn = new Function('return ' + sanitized); const val = fn(); return (typeof val==='number'&&isFinite(val))?val:'Error'; }catch(e){return 'Error'}
                }

                const exprInput = document.getElementById('expression');
                const resultDisplay = document.getElementById('result');

                document.querySelectorAll('.actions .column button').forEach(btn=>{
                    btn.addEventListener('click', function(e){
                        const el = e.currentTarget; const txt = el.textContent.trim();
                        if (el.classList.contains('buttons-scientific')) return;
                        if (el.classList.contains('button-clear')){ exprInput.value=''; resultDisplay.textContent=''; return; }
                        if (el.classList.contains('button-result') || txt === '='){ resultDisplay.textContent = evaluateExpression(exprInput.value); return; }
                        if (el.classList.contains('button-delete')){ exprInput.value = exprInput.value.slice(0,-1); return; }
                        exprInput.value += txt;
                    });
                });

                exprInput && exprInput.focus();
            })();
        `;

        const docHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Calculadora Pro</title><link rel="stylesheet" href="${cssHref}"></head><body>${boxHtml}<script>${inlineScript} <\/script></body></html>`;

        win.document.open();
        win.document.write(docHtml);
        win.document.close();

        // Replace main window content with the Pro mode message
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-size:20px;">ahora estas en modo pro</div>';
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
    if (!/^[0-9+\-*/().\s%]+$/.test(sanitized)) return 'Error';
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