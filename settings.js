function encryptKey(key) {
    const secret = "XVoice4Life";
    return key.split('').map((char, index) => 
        String.fromCharCode(char.charCodeAt(0) ^ secret.charCodeAt(index % secret.length))
    ).join('');
}

function decryptKey(encryptedKey) {
    // Decryption is the same as encryption for XOR
    return encryptKey(encryptedKey);
}

document.getElementById('saveKeys').addEventListener('click', () => {
  try {
    const keys = {
      anthropic: document.getElementById('anthropicKey').value,
      elevenLabs: document.getElementById('elevenLabsKey').value,
      replicate: document.getElementById('replicateKey').value
    };

    Object.keys(keys).forEach(key => {
      if (keys[key]) {
        const encryptedKey = encryptKey(keys[key]);
        chrome.storage.local.set({ [key + 'Key']: encryptedKey });
      }
    });

    alert('API keys saved successfully!');
  } catch (error) {
    alert('Error saving API keys: ' + error.message);
  }
});

// Load existing keys when the page opens
document.addEventListener('DOMContentLoaded', () => {
  ['anthropic', 'elevenLabs', 'replicate'].forEach(service => {
    chrome.storage.local.get([service + 'Key'], (result) => {
      if (result[service + 'Key']) {
        document.getElementById(service + 'Key').value = '********'; // Don't show the actual key
      }
    });
  });
});
