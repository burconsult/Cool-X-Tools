document.addEventListener('DOMContentLoaded', initializePopup);

function initializePopup() {
    document.getElementById('speakPost').addEventListener('click', speakPost);
    document.getElementById('roastProfile').addEventListener('click', roastProfile);
    document.getElementById('generateImageFromPost').addEventListener('click', generateImageFromPost);
    document.getElementById('generateImageFromProfile').addEventListener('click', generateImageFromProfile);
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
        const profileText = `Name: ${profileInfo.name}\nHandle: @${profileInfo.handle}\nBio: ${profileInfo.bio}`;
        displayProfileInfo(profileInfo);
        const roastPrompt = await getSetting('roastPrompt');
        if (!roastPrompt) {
            throw new Error('Roast prompt not found. Please set up the extension.');
        }
        const roast = await processWithAnthropic(`${roastPrompt}\n\nProfile: ${profileText}`);
        displayText('Roast', roast);
        const audioUrl = await textToSpeech(roast);
        playAudio(audioUrl);
        
        // Add "Save as Video" button
        addSaveVideoButton(profileInfo.profileImageUrl, audioUrl);
    } catch (error) {
        showError('Error roasting profile: ' + error.message);
    } finally {
        toggleLoading(false);
    }
}

function displayProfileInfo(profileInfo) {
    const profileContainer = document.getElementById('profileContainer');
    profileContainer.innerHTML = ''; // Clear previous content

    if (profileInfo.profileImageUrl) {
        const img = document.createElement('img');
        img.src = profileInfo.profileImageUrl;
        img.alt = 'Profile Picture';
        img.style.width = '100px';
        img.style.height = '100px';
        img.style.borderRadius = '50%';
        img.style.marginBottom = '10px';
        profileContainer.appendChild(img);
    }

    const nameElement = document.createElement('p');
    nameElement.textContent = `Name: ${profileInfo.name}`;
    profileContainer.appendChild(nameElement);

    const handleElement = document.createElement('p');
    handleElement.textContent = `Handle: @${profileInfo.handle}`;
    profileContainer.appendChild(handleElement);

    const bioElement = document.createElement('p');
    bioElement.textContent = `Bio: ${profileInfo.bio}`;
    profileContainer.appendChild(bioElement);

    profileContainer.style.display = 'block';
}

function playAudio(audioUrl) {
    const audioPlayer = document.getElementById('audioPlayer');
    audioPlayer.src = audioUrl;
    audioPlayer.style.display = 'block';
    audioPlayer.play();
}

function addSaveVideoButton(imageUrl, audioUrl) {
    const container = document.getElementById('videoContainer') || document.body;
    const existingButton = document.getElementById('saveVideoButton');
    if (existingButton) {
        container.removeChild(existingButton);
    }

    const saveButton = document.createElement('button');
    saveButton.id = 'saveVideoButton';
    saveButton.textContent = 'Save as Video';
    saveButton.onclick = () => createVideoWithAudio(imageUrl, audioUrl);
    container.appendChild(saveButton);
}

async function generateImageFromPost() {
    const postText = await extractPostText();
    await generateImageFromText(postText, false);
}

async function generateImageFromProfile() {
    const profileInfo = await extractProfileInfo();
    const profileText = `Name: ${profileInfo.name}\nHandle: @${profileInfo.handle}\nBio: ${profileInfo.bio}`;
    await generateImageFromText(profileText, true);
}

async function generateImageFromText(text, isProfile) {
    if (!await checkApiKeys()) return;
    try {
        toggleLoading(true);
        const summarizedText = await summarizeText(text);
        displayText(isProfile ? 'Profile' : 'Post Text', text, summarizedText);
        const imagePrompt = await getSetting('imagePrompt');
        if (!imagePrompt) {
            throw new Error('Image prompt not found. Please set up the extension.');
        }
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
            chrome.tabs.sendMessage(tabs[0].id, {action: "getTweetText"}, function(response) {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (response && response.text) {
                    resolve(response.text);
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
            chrome.tabs.sendMessage(tabs[0].id, {action: "getProfileInfo"}, function(response) {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (response) {
                    resolve(response);
                } else {
                    reject(new Error('Failed to extract profile info'));
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

async function createVideoWithAudio(imageUrl, audioUrl) {
    try {
        toggleLoading(true);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 400;
        canvas.height = 400;

        // Load and draw image
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageUrl;
        });
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const audioPlayer = document.getElementById('audioPlayer');
        
        const stream = canvas.captureStream();
        const audioStream = audioPlayer.captureStream();
        const combinedStream = new MediaStream([...stream.getTracks(), ...audioStream.getTracks()]);
        const mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });

        const chunks = [];
        mediaRecorder.ondataavailable = e => chunks.push(e.data);

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'roast_video.webm';
            a.textContent = 'Download Roast Video';
            document.body.appendChild(a);
            
            URL.revokeObjectURL(url);
            toggleLoading(false);
        };

        mediaRecorder.start();
        audioPlayer.currentTime = 0;
        audioPlayer.play();

        audioPlayer.onended = () => mediaRecorder.stop();
    } catch (error) {
        showError('Error creating video: ' + error.message);
        toggleLoading(false);
    }
}