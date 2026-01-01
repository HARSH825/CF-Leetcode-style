(function () {
    'use strict';

    console.log('CF LeetCode Style: Loaded');

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
    } else {
        setTimeout(init, 100);
    }

    function init() {
        if (!document.querySelector('.problem-statement')) {
            console.log('Not a problem page');
            return;
        }

        if (typeof katex === 'undefined') {
            console.error('KaTeX not loaded! Check if katex.min.js is in your extension folder.');
            return;
        }

        console.log('KaTeX loaded successfully!');

        const statementDiv = findProblemStatementDiv();
        if (!statementDiv) {
            console.log('Could not find problem statement div');
            return;
        }

        const originalHTML = statementDiv.innerHTML;
        const originalStatement = statementDiv.textContent.trim();

        console.log('Found statement div, length:', originalStatement.length);

        createToggleButton(statementDiv, originalHTML, originalStatement);
    }

    function findProblemStatementDiv() {
        const problemDiv = document.querySelector('.problem-statement');
        if (!problemDiv) return null;

        let foundHeader = false;
        for (let child of problemDiv.children) {
            if (child.classList.contains('header')) {
                foundHeader = true;
                continue;
            }

            if (foundHeader && child.tagName === 'DIV' &&
                !child.classList.contains('input-specification') &&
                !child.classList.contains('output-specification') &&
                !child.classList.contains('sample-test') &&
                !child.classList.contains('note')) {
                return child;
            }
        }
        return null;
    }

    function createToggleButton(statementDiv, originalHTML, originalStatement) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'cf-leetcode-toggle';
        toggleBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            <span>Simplify</span>
        `;

        statementDiv.parentElement.insertBefore(toggleBtn, statementDiv);

        let isSimplified = false;
        let simplifiedHTML = null;

        toggleBtn.addEventListener('click', () => {
            if (isSimplified) {
                statementDiv.innerHTML = originalHTML;
                statementDiv.classList.remove('cf-simplified');
                toggleBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                    <span>Simplify</span>
                `;
                isSimplified = false;
            } else {
                if (simplifiedHTML) {
                    statementDiv.innerHTML = simplifiedHTML;
                    statementDiv.classList.add('cf-simplified');
                } else {
                    showLoading(statementDiv);
                    fetchSimplified(originalStatement, (result) => {
                        if (result.success) {
                            const htmlWithMath = processAndRenderMath(result.text);
                            simplifiedHTML = htmlWithMath;
                            statementDiv.innerHTML = htmlWithMath;
                            statementDiv.classList.add('cf-simplified');
                        } else {
                            showError(statementDiv, result.error);
                        }
                    });
                }

                toggleBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 18l-6-6 6-6"/>
                    </svg>
                    <span>Original</span>
                `;
                isSimplified = true;
            }
        });
    }

    function showLoading(div) {
        div.classList.add('cf-simplified');
        div.innerHTML = `
            <div class="cf-loading">
                <div class="cf-spinner"></div>
                <p>Simplifying problem...</p>
            </div>
        `;
    }

    function showError(div, error) {
        div.innerHTML = `
            <div class="cf-error">
                <p class="error-icon">⚠️</p>
                <p>${error}</p>
                <button onclick="location.reload()" class="cf-retry">Retry</button>
            </div>
        `;
    }

    function fetchSimplified(statement, callback) {
        chrome.runtime.sendMessage({
            action: 'simplify',
            statement: statement
        }, callback);
    }

    // Process text and render all math with KaTeX
    function processAndRenderMath(text) {
        console.log('Processing math in text...');

        if (typeof katex === 'undefined') {
            console.error('KaTeX not available during rendering');
            return text;
        }

        let processedText = text;

        // Remove LaTeX formatting commands BEFORE rendering math
        processedText = processedText.replace(/\\textbf\{([^\}]+)\}/g, '<strong>$1</strong>');
        processedText = processedText.replace(/\\begin\{itemize\}/g, '');
        processedText = processedText.replace(/\\end\{itemize\}/g, '');
        processedText = processedText.replace(/\\item\s+/g, '• ');
        processedText = processedText.replace(/\\text/g, '');

        // Handle markdown-style formatting
        // ** for bold (but not if it's inside math $...$)
        processedText = processedText.replace(/\*\*([^\*\$]+?)\*\*/g, '<strong>$1</strong>');

        // Handle bullet points more carefully
        // Convert standalone * at beginning of lines to bullets with proper line breaks
        processedText = processedText.replace(/^(\s*)\* /gm, '\n• ');
        processedText = processedText.replace(/\n\* /g, '\n• ');

        // Replace all $...$ with KaTeX rendered HTML
        processedText = processedText.replace(/\$([^\$]+)\$/g, (match, math) => {
            try {
                return katex.renderToString(math, {
                    throwOnError: false,
                    displayMode: false
                });
            } catch (e) {
                console.error('KaTeX render error:', e, 'for:', math);
                return `<code>${math}</code>`;
            }
        });

        // Smart paragraph splitting
        // Split by double newlines first (major paragraphs)
        const sections = processedText.split('\n\n');

        const html = sections.map(section => {
            section = section.trim();
            if (!section) return '';

            // Check if section contains bullet points
            if (section.includes('\n• ')) {
                // Split
                const lines = section.split('\n').map(line => line.trim()).filter(line => line);

                let result = '';
                let bulletItems = [];
                let currentParagraph = '';

                for (let line of lines) {
                    if (line.startsWith('• ')) {
                        // If we have a current paragraph, close it
                        if (currentParagraph) {
                            result += `<p>${currentParagraph}</p>`;
                            currentParagraph = '';
                        }
                        // Add bullet item
                        bulletItems.push(line);
                    } else {
                        // If we have accumulated bullets, output them first
                        if (bulletItems.length > 0) {
                            result += '<ul>' + bulletItems.map(item => `<li>${item.substring(2)}</li>`).join('') + '</ul>';
                            bulletItems = [];
                        }
                        // Add to current paragraph
                        currentParagraph += (currentParagraph ? ' ' : '') + line;
                    }
                }

                // Close any remaining content
                if (bulletItems.length > 0) {
                    result += '<ul>' + bulletItems.map(item => `<li>${item.substring(2)}</li>`).join('') + '</ul>';
                }
                if (currentParagraph) {
                    result += `<p>${currentParagraph}</p>`;
                }

                return result;
            } else {
                // Regular paragraph
                return `<p>${section}</p>`;
            }
        }).join('');

        return html;
    }



})();
