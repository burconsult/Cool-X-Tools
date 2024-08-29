const DEFAULT_ROAST_PROMPT = "Roast this X user's profile in a humorous and witty manner. Be creative and funny, but avoid being overly mean or offensive. Output only the roast, no intro, no explanation, etc.";
const DEFAULT_IMAGE_PROMPT = "Generate a creative and visually interesting image prompt based on the following text which is post or a description of a profile on the platform X. Output only the prompt, no intro, no explanation, etc.";
const DEFAULT_ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const DEFAULT_REPLICATE_MODEL = "black-forest-labs/flux-pro";

document.addEventListener('DOMContentLoaded', initializeSettings);

function initializeSettings() {
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    document.getElementById('resetToDefault').addEventListener('click', resetToDefault);
    loadExistingSettings();
}

function saveSettings() {
    const settings = {
        anthropicKey: encryptKey(document.getElementById('anthropicKey').value),
        elevenLabsKey: encryptKey(document.getElementById('elevenLabsKey').value),
        replicateKey: encryptKey(document.getElementById('replicateKey').value),
        replicateModel: document.getElementById('replicateModel').value,
        elevenLabsVoiceId: document.getElementById('elevenLabsVoiceId').value,
        roastPrompt: document.getElementById('roastPrompt').value,
        imagePrompt: document.getElementById('imagePrompt').value
    };

    chrome.storage.sync.set(settings, () => {
        if (chrome.runtime.lastError) {
            console.error('Error saving settings:', chrome.runtime.lastError);
            alert('Error saving settings. Please try again.');
        } else {
            console.log('Settings saved successfully');
            alert('Settings saved successfully!');
        }
    });
}

function loadExistingSettings() {
    chrome.storage.sync.get(null, (result) => {
        if (chrome.runtime.lastError) {
            console.error('Error loading settings:', chrome.runtime.lastError);
        } else {
            document.getElementById('anthropicKey').value = result.anthropicKey ? decryptKey(result.anthropicKey) : '';
            document.getElementById('elevenLabsKey').value = result.elevenLabsKey ? decryptKey(result.elevenLabsKey) : '';
            document.getElementById('replicateKey').value = result.replicateKey ? decryptKey(result.replicateKey) : '';
            document.getElementById('replicateModel').value = result.replicateModel || DEFAULT_REPLICATE_MODEL;
            document.getElementById('elevenLabsVoiceId').value = result.elevenLabsVoiceId || DEFAULT_ELEVENLABS_VOICE_ID;
            document.getElementById('roastPrompt').value = result.roastPrompt || DEFAULT_ROAST_PROMPT;
            document.getElementById('imagePrompt').value = result.imagePrompt || DEFAULT_IMAGE_PROMPT;
            console.log('Settings loaded successfully');
        }
    });
}

function resetToDefault() {
    if (confirm('Are you sure you want to reset all settings to default? This will remove your API keys.')) {
        chrome.storage.local.clear(() => {
            if (chrome.runtime.lastError) {
                console.error('Error resetting settings:', chrome.runtime.lastError);
                alert('Error resetting settings. Please try again.');
            } else {
                loadExistingSettings(); // This will load the default values
                alert('All settings have been reset to default.');
            }
        });
    }
}

function getDefaultValue(key) {
    switch (key) {
        case 'replicateModel':
            return DEFAULT_REPLICATE_MODEL;
        case 'elevenLabsVoiceId':
            return DEFAULT_ELEVENLABS_VOICE_ID;
        case 'roastPrompt':
            return DEFAULT_ROAST_PROMPT;
        case 'imagePrompt':
            return DEFAULT_IMAGE_PROMPT;
        default:
            return '';
    }
}

function encryptKey(key) {
    const secret = "XVoice4Life";
    return key.split('').map((char, index) => 
        String.fromCharCode(char.charCodeAt(0) ^ secret.charCodeAt(index % secret.length))
    ).join('');
}

function decryptKey(encryptedKey) {
    return encryptKey(encryptedKey); // The XOR operation is its own inverse
}
