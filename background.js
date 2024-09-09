chrome.action.onClicked.addListener((tab) => {
    if (tab.url && (tab.url.includes('x.com') || tab.url.includes('twitter.com'))) {
        chrome.action.openPopup();
    } else {
        console.log('This extension only works on x.com or twitter.com');
    }
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case "processWithAnthropic":
            processWithAnthropic(request.userContent)
                .then(response => sendResponse({success: true, data: response}))
                .catch(error => sendResponse({success: false, error: error.message}));
            break;
        case "generateImage":
            generateImage(request.prompt)
                .then(response => sendResponse({success: true, data: response}))
                .catch(error => sendResponse({success: false, error: error.message}));
            break;
        case "textToSpeech":
            textToSpeech(request.text)
                .then(response => sendResponse({success: true, data: response}))
                .catch(error => sendResponse({success: false, error: error.message}));
            break;
        case "extractPostText":
        case "extractProfileInfo":
            // These should be handled by the content script, not the background script
            sendResponse({success: false, error: "This action should be handled by the content script"});
            break;
        default:
            sendResponse({success: false, error: "Unknown action"});
    }
    return true;  // Indicates that we will send a response asynchronously
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
    const encryptedKey = await getSetting(service + 'Key');
    if (encryptedKey) {
        return decryptKey(encryptedKey);
    }
    return null;
}

function decryptKey(encryptedKey) {
    const secret = "XVoice4Life";
    return encryptedKey.split('').map((char, index) => 
        String.fromCharCode(char.charCodeAt(0) ^ secret.charCodeAt(index % secret.length))
    ).join('');
}

async function generateImage(prompt) {
    const REPLICATE_API_KEY = await getApiKey('replicate');
    const REPLICATE_MODEL = await getSetting('replicateModel');
    if (!REPLICATE_API_KEY || !REPLICATE_MODEL) {
        throw new Error('Replicate API key or model not found. Please set up the extension.');
    }

    console.log('Generating image with prompt:', prompt);
    console.log('Using Replicate model:', REPLICATE_MODEL);

    // Start a prediction
    const response = await fetch(`https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`, {
        method: 'POST',
        headers: {
            'Authorization': `Token ${REPLICATE_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            input: {
                steps: 25,
                prompt: prompt,
                guidance: 3,
                interval: 2,
                aspect_ratio: "1:1",
                output_format: "webp",
                output_quality: 80,
                safety_tolerance: 2
            }
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    let prediction = await response.json();
    console.log('Initial prediction response:', prediction);

    // Poll for the result
    while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
        const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
            headers: {
                'Authorization': `Token ${REPLICATE_API_KEY}`,
            },
        });
        prediction = await pollResponse.json();
        console.log('Polling prediction status:', prediction.status);
    }

    if (prediction.status === 'failed') {
        console.error('Image generation failed:', prediction.error);
        throw new Error(`Image generation failed: ${prediction.error}`);
    }

    if (prediction.output && prediction.output.length > 0) {
        const imageUrl = prediction.output;
        console.log('Image generated successfully:', imageUrl);
        return imageUrl;
    } else {
        console.error('No image URL in the output');
        throw new Error('No image URL in the output');
    }
}

async function textToSpeech(text) {
    const ELEVENLABS_API_KEY = await getApiKey('elevenLabs');
    const ELEVENLABS_VOICE_ID = await getSetting('elevenLabsVoiceId');
    
    console.log('ElevenLabs API Key:', ELEVENLABS_API_KEY ? 'Found' : 'Not found');
    console.log('ElevenLabs Voice ID:', ELEVENLABS_VOICE_ID);

    if (!ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID) {
        throw new Error('ElevenLabs API key or voice ID not found. Please set up the extension.');
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
        method: 'POST',
        headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
            text: text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.5
            }
        })
    });

    if (!response.ok) {
        throw new Error('Failed to generate speech');
    }

    const arrayBuffer = await response.arrayBuffer();
    return Array.from(new Uint8Array(arrayBuffer));
}

async function getSetting(key, defaultValue = null) {
    return new Promise((resolve) => {
        chrome.storage.sync.get(key, (result) => {
            console.log(`Getting setting for ${key}:`, result[key] ? 'Found' : 'Not found');
            resolve(result[key] !== undefined ? result[key] : defaultValue);
        });
    });
}

// Function to update the extension's action (icon)
function updateAction(tabId, url) {
    if (url && (url.includes('x.com') || url.includes('twitter.com'))) {
        chrome.action.enable(tabId);
    } else {
        chrome.action.disable(tabId);
    }
}

// Listen for tab updates and update the action accordingly
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        updateAction(tabId, tab.url);
    }
});

// Listen for tab activation and update the action
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        updateAction(tab.id, tab.url);
    });
});

// Example log message
console.log('Cool X Tools: Background script loaded');
