chrome.action.onClicked.addListener((tab) => {
    if (tab.url.includes('x.com') || tab.url.includes('twitter.com')) {
        chrome.action.openPopup();
    } else {
        console.log('This extension only works on x.com or twitter.com');
    }
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "processWithAnthropic") {
        processWithAnthropic(request.userContent)
            .then(response => sendResponse({success: true, data: response}))
            .catch(error => sendResponse({success: false, error: error.message}));
        return true;  // Indicates we will send a response asynchronously
    } else if (request.action === "generateImage") {
        generateImage(request.prompt)
            .then(response => sendResponse({success: true, data: response}))
            .catch(error => sendResponse({success: false, error: error.message}));
        return true;  // Indicates we will send a response asynchronously
    }
});

async function processWithAnthropic(userContent) {
    const ANTHROPIC_API_KEY = await getApiKey('anthropic');
    if (!ANTHROPIC_API_KEY) {
        throw new Error('Anthropic API key not found. Please set up the extension.');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: "claude-3-sonnet-20240229",
            max_tokens: 1000,
            messages: [
                { role: "user", content: userContent }
            ]
        })
    });

    if (!response.ok) {
        throw new Error('Failed to process with Anthropic API');
    }

    const data = await response.json();
    return data.content[0].text.trim();
}

async function getApiKey(service) {
    return new Promise((resolve) => {
        chrome.storage.local.get([service + 'Key'], (result) => {
            if (result[service + 'Key']) {
                const decryptedKey = decryptKey(result[service + 'Key']);
                resolve(decryptedKey);
            } else {
                resolve(null);
            }
        });
    });
}

function decryptKey(encryptedKey) {
    const secret = "XVoice4Life";
    return encryptedKey.split('').map((char, index) => 
        String.fromCharCode(char.charCodeAt(0) ^ secret.charCodeAt(index % secret.length))
    ).join('');
}

async function generateImage(prompt) {
    const REPLICATE_API_KEY = await getApiKey('replicate');
    if (!REPLICATE_API_KEY) {
        throw new Error('Replicate API key not found. Please set up the extension.');
    }

    // Create prediction
    const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${REPLICATE_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            version: "a1c5e6b9f6f7d9f8f9b6a3b7f8f9e6d9",  // Replace with the actual model version
            input: { prompt: prompt }
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to start image generation');
    }

    const prediction = await response.json();
    
    // Poll for the result
    const pollInterval = 2000; // 2 seconds
    const maxAttempts = 30; // Maximum number of polling attempts (1 minute total)
    let attempts = 0;

    while (attempts < maxAttempts) {
        const pollResponse = await fetch(prediction.urls.get, {
            headers: { 'Authorization': `Bearer ${REPLICATE_API_KEY}` }
        });
        
        if (!pollResponse.ok) {
            throw new Error('Failed to check prediction status');
        }

        const result = await pollResponse.json();

        switch (result.status) {
            case 'succeeded':
                return result.output[0]; // Assuming the output is an array with the image URL as the first item
            case 'failed':
                throw new Error('Image generation failed: ' + (result.error || 'Unknown error'));
            case 'canceled':
                throw new Error('Image generation was canceled');
            default:
                // If still processing, wait and then continue the loop
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                attempts++;
        }
    }

    throw new Error('Image generation timed out');
}
