// Constants for default values
const DEFAULT_ROAST_PROMPT = "Roast this X user's profile in a humorous and witty manner. Be creative and funny, but avoid being overly mean or offensive.";
const DEFAULT_IMAGE_PROMPT = "Generate a creative and visually interesting image prompt based on the following text. The image should be surreal, artistic, and captivating.";
const DEFAULT_ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const DEFAULT_REPLICATE_MODEL = "black-forest-labs/flux-pro";

document.addEventListener('DOMContentLoaded', initializePopup);

function initializePopup() {
    document.getElementById('speakPost').addEventListener('click', speakPost);
    document.getElementById('roastProfile').addEventListener('click', roastProfile);
    document.getElementById('generateImageFromPost').addEventListener('click', generateImageFromPost);
    document.getElementById('generateImageFromProfile').addEventListener('click', generateImageFromProfile);

    const settingsLink = document.createElement('a');
    settingsLink.href = 'settings.html';
    settingsLink.target = '_blank';
    settingsLink.textContent = 'Settings';
    document.body.appendChild(settingsLink);
}

async function speakPost() {
    if (!await checkApiKeys()) return;
    try {
        toggleLoading(true);
        const postText = await extractPostText();
        const summarizedText = await summarizeText(postText);
        displayText('Post Text', postText, summarizedText);
        const audioUrl = await textToSpeech(summarizedText);
        playAudio(audioUrl);
    } catch (error) {
        showError('Error speaking post: ' + error.message);
    } finally {
        toggleLoading(false);
    }
}

async function roastProfile() {
    if (!await checkApiKeys()) return;
    try {
        toggleLoading(true);
        const profileInfo = await extractProfileInfo();
        const profileText = `Username: ${profileInfo.username}\nBio: ${profileInfo.bio}`;
        displayText('Profile', profileText);
        const roastPrompt = await getSetting('roastPrompt', DEFAULT_ROAST_PROMPT);
        const roast = await processWithAnthropic(`${roastPrompt}\n\nProfile: ${profileText}`);
        displayText('Roast', roast);
        const audioUrl = await textToSpeech(roast);
        playAudio(audioUrl);
    } catch (error) {
        showError('Error roasting profile: ' + error.message);
    } finally {
        toggleLoading(false);
    }
}

function playAudio(audioUrl) {
    const audioPlayer = document.getElementById('audioPlayer');
    audioPlayer.src = audioUrl;
    audioPlayer.play();
}

async function generateImageFromPost() {
    const postText = await extractPostText();
    await generateImageFromText(postText, false);
}

async function generateImageFromProfile() {
    const profileInfo = await extractProfileInfo();
    const profileText = `Username: ${profileInfo.username}\nBio: ${profileInfo.bio}`;
    await generateImageFromText(profileText, true);
}

async function generateImageFromText(text, isProfile) {
    if (!await checkApiKeys()) return;
    try {
        toggleLoading(true);
        const summarizedText = await summarizeText(text);
        displayText(isProfile ? 'Profile' : 'Post Text', text, summarizedText);
        const imagePrompt = await getSetting('imagePrompt');
        const promptRequest = `${imagePrompt}\n\n${isProfile ? "Profile" : "Post"}: ${summarizedText}`;
        const prompt = await processWithAnthropic(promptRequest);
        displayText('Generated Image Prompt', prompt);
        const imageUrl = await generateImage(prompt);
        displayImage(imageUrl);
    } catch (error) {
        showError('Error generating image: ' + error.message);
    } finally {
        toggleLoading(false);
    }
}

async function summarizeText(text) {
    if (text.length <= 120) return text;
    const summary = await processWithAnthropic(`Summarize the following text in no more than 120 characters:\n\n${text}`);
    return summary.slice(0, 120);
}

async function checkApiKeys() {
    const services = ['anthropic', 'elevenLabs', 'replicate'];
    for (let service of services) {
        const key = await getSetting(service + 'Key');
        if (!key) {
            showError(`${service} API key not set. Please go to settings to set your API keys.`);
            return false;
        }
    }
    return true;
}

function displayText(title, originalText, summarizedText = null) {
    let displayContent = `${title}:\n${originalText}`;
    if (summarizedText && summarizedText !== originalText) {
        displayContent += `\n\nSummarized ${title}:\n${summarizedText}`;
    }
    document.getElementById('postText').innerText = displayContent;
}

function displayImage(imageUrl) {
    const imgElement = document.createElement('img');
    imgElement.src = imageUrl;
    imgElement.style.maxWidth = '100%';
    document.getElementById('imageContainer').innerHTML = '';
    document.getElementById('imageContainer').appendChild(imgElement);
}

function showError(message) {
    console.error(message);
    document.getElementById('errorMessage').textContent = message;
}

function toggleLoading(show) {
    document.getElementById('loadingIndicator').style.display = show ? 'block' : 'none';
}

async function processWithAnthropic(userContent) {
    return sendMessageToBackground("processWithAnthropic", { userContent });
}

async function generateImage(prompt) {
    return sendMessageToBackground("generateImage", { prompt });
}

async function textToSpeech(text) {
    const audioData = await sendMessageToBackground("textToSpeech", { text });
    const blob = new Blob([new Uint8Array(audioData)], { type: 'audio/mpeg' });
    return URL.createObjectURL(blob);
}

async function sendMessageToBackground(action, data = {}) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action, ...data }, response => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else if (response && response.success) {
                resolve(response.data);
            } else if (response && response.error) {
                reject(new Error(response.error));
            } else {
                reject(new Error('Unknown error occurred'));
            }
        });
    });
}

async function extractPostText() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "extractPostText"}, function(response) {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (response && response.success) {
                    resolve(response.data);
                } else {
                    reject(new Error(response ? response.error : 'Unknown error'));
                }
            });
        });
    });
}

async function extractProfileInfo() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "extractProfileInfo"}, function(response) {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (response && response.success) {
                    resolve(response.data);
                } else {
                    reject(new Error(response ? response.error : 'Unknown error'));
                }
            });
        });
    });
}

async function getSetting(key, defaultValue = null) {
    try {
        return new Promise((resolve) => {
            chrome.storage.local.get([key], (result) => {
                console.log(`Getting setting for ${key}:`, result[key]);
                resolve(result[key] !== undefined ? result[key] : defaultValue);
            });
        });
    } catch (error) {
        console.error('Error getting setting:', error);
        return defaultValue;
    }
}