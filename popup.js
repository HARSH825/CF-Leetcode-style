document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const saveBtn = document.getElementById('saveBtn');
    const status = document.getElementById('status');

    chrome.runtime.sendMessage({ action: 'getApiKey' }, (response) => {
        if (response.apiKey) apiKeyInput.value = response.apiKey;
    });

    saveBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (!key) {
            showStatus('Please enter API key');
            return;
        }

        chrome.runtime.sendMessage({ action: 'saveApiKey', apiKey: key }, () => {
            showStatus('Saved');
        });
    });

    function showStatus(msg) {
        status.textContent = msg;
        status.style.display = 'block';
        setTimeout(() => status.style.display = 'none', 2000);
    }
});
