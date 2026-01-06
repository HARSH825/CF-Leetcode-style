chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'simplify') {
        handleSimplify(request.statement, sendResponse);
        return true;
    }

    if (request.action === 'saveApiKey') {
        chrome.storage.local.set({ apiKey: request.apiKey }, () => {
            sendResponse({ success: true });
        });
        return true;
    }

    if (request.action === 'getApiKey') {
        chrome.storage.local.get(['apiKey'], (result) => {
            sendResponse({ apiKey: result.apiKey || null });
        });
        return true;
    }
});

async function handleSimplify(statement, sendResponse) {
    chrome.storage.local.get(['apiKey'], async (result) => {
        if (!result.apiKey) {
            sendResponse({ success: false, error: 'API key not set. Click extension icon to add it.' });
            return;
        }

        try {
            const simplified = await callGemini(result.apiKey, statement);
            sendResponse({ success: true, text: simplified });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    });
}

async function callGemini(apiKey, statement) {
    const prompt = `Simplify this competitive programming problem. Remove stories, use direct technical language.Make it absolute leetcode style description of problem , which leetcode users can understand ,i.e. exactly to the point , what is given input and what is to be found/solved . 
    Make it as short lengthed and as to the point as possible BUT dont miss important details .  

PROBLEM:
${statement}

INSTRUCTIONS:
- Remove ALL fictional stories and narratives
- Replace character names with Alice/Bob if needed
- Use direct, technical language like LeetCode
- For ALL math (variables, subscripts, superscripts), wrap in dollar signs using LaTeX:
  * Variables: $n$, $k$, $a$, $b$
  * Subscripts: $a_i$, $b_j$
  * Superscripts: $2^n$, $10^4$, $2^{i-1}$
  * Expressions: $i+1$, $i-1$
  * Comparisons: $\\le$, $\\ge$
- For formatting:
  * Use **text** for bold (e.g., **Example:**, **Input:**, **Output:**, **Constraints:**)
  * Use * at line start for bullet points
- Write COMPLETE description
- Use short paragraphs (2-3 sentences each)
- Separate paragraphs with double newlines

MOST CRITICAL : Make it absolute leetcode style description of problem , which leetcode users can understand ,i.e. to the point , what is given and what is to be found/solved . No need to give input , output , constraint sections , user alredy knows them . 

Example:
"**Input:** Two integers $a$ and $b$ where $1 \\le a, b \\le 10^9$.

**Output:** The maximum number of layers $N$.

**Constraints:**
* $1 \\le n \\le 10^5$
* $1 \\le a_i \\le 3n$"

Simplified description:`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.2,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 8192
                }
            })
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || 'API request failed');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}



console.log('Background script loaded');
console.log("Version V1");
