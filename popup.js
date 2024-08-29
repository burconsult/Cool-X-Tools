    document.getElementById('speakPost').addEventListener('click', speakPost);
    document.getElementById('roastProfile').addEventListener('click', roastProfile);
    document.getElementById('generateImageFromPost').addEventListener('click', async () => {
      try {
        toggleLoading(true);
        const postText = await extractPostText();
        await generateImageFromText(postText);
      } catch (error) {
        showError('Error generating image from post: ' + error.message);
      } finally {
        toggleLoading(false);
      }
    });
    document.getElementById('generateImageFromProfile').addEventListener('click', async () => {
      try {
        toggleLoading(true);
        const profileInfo = await extractProfileInfo();
        await generateImageFromText(`Username: ${profileInfo.username}\nBio: ${profileInfo.bio}`, true);
      } catch (error) {
        showError('Error generating image from profile: ' + error.message);
      } finally {
        toggleLoading(false);
      }
    });

    // Main functions

    async function speakPost() {
      if (!await checkApiKeys()) return;
      try {
        toggleLoading(true);
        const postText = await extractPostText();
        displayText(`Original Post Text:\n${postText}`);
        
        const summarizedText = await summarizeText(postText);
        if (summarizedText !== postText) {
          displayText(`Original Post Text:\n${postText}\n\nSummarized Text:\n${summarizedText}`);
        }
        
        await textToSpeech(summarizedText);
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
        displayText(`Profile:\nUsername: ${profileInfo.username}\nBio: ${profileInfo.bio}`);
        const roast = await processWithAnthropic(
          `Make a funny roast for this X user's profile. Keep it short and concise, no more than 100 words. Username: ${profileInfo.username}\nBio: ${profileInfo.bio}`
        );
        await textToSpeech(roast);
      } catch (error) {
        showError('Error roasting profile: ' + error.message);
      } finally {
        toggleLoading(false);
      }
    }

    async function generateImageFromText(text, isProfile = false) {
      if (!await checkApiKeys()) return;
      try {
        toggleLoading(true);
        displayText(`${isProfile ? "Profile" : "Post"} Text:\n${text}`);
        
        const summarizedText = await summarizeText(text);
        if (summarizedText !== text) {
          displayText(`Original ${isProfile ? "Profile" : "Post"} Text:\n${text}\n\nSummarized Text:\n${summarizedText}`);
        }
        
        const promptRequest = `Generate a creative AI image prompt based on this ${isProfile ? "X user profile" : "X post"}: ${summarizedText}`;
        const prompt = await processWithAnthropic(promptRequest);
        displayText(`Generated Image Prompt:\n${prompt}`);
        const imageUrl = await generateImage(prompt);
        displayImage(imageUrl);
      } catch (error) {
        showError('Error generating image: ' + error.message);
      } finally {
        toggleLoading(false);
      }
    }

    // Helper functions

    async function extractPostText() {
      const tab = await getCurrentTab();
      return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, {action: "getTweetText"}, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.text) {
            resolve(response.text);
          } else {
            reject(new Error('No post text found'));
          }
        });
      });
    }

    async function extractProfileInfo() {
      const tab = await getCurrentTab();
      return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, {action: "getProfileInfo"}, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.profileInfo) {
            resolve(response.profileInfo);
          } else {
            reject(new Error('No profile information found'));
          }
        });
      });
    }

    async function processWithAnthropic(userContent) {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: "processWithAnthropic",
            userContent: userContent
          },
          response => {
            if (response.success) {
              resolve(response.data);
            } else {
              reject(new Error(response.error));
            }
          }
        );
      });
    }

    async function textToSpeech(text) {
      const ELEVENLABS_API_KEY = await getApiKey('elevenLabs');
      const voiceID = 'hgo4TYwBXDkASwv0twHG';  // Replace with your desired voice ID

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceID}`, {
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

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      new Audio(audioUrl).play();
    }

    async function generateImage(prompt) {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: "generateImage",
            prompt: prompt
          },
          response => {
            if (response.success) {
              resolve(response.data);
            } else {
              reject(new Error(response.error));
            }
          }
        );
      });
    }

    // Utility functions

    async function getCurrentTab() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab;
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

    function displayImage(imageUrl) {
      const imgElement = document.createElement('img');
      imgElement.src = imageUrl;
      imgElement.style.maxWidth = '100%';
      imgElement.style.height = 'auto';
      document.getElementById('imageContainer').innerHTML = '';
      document.getElementById('imageContainer').appendChild(imgElement);
    }

    function displayText(text) {
      document.getElementById('postText').innerText = text;
    }

    function showError(message) {
      console.error(message);
      document.getElementById('errorMessage').textContent = message;
    }

    async function checkApiKeys() {
      const services = ['anthropic', 'elevenLabs', 'replicate'];
      for (let service of services) {
        const key = await getApiKey(service);
        if (!key) {
          showError(`${service} API key not set. Please go to settings to set your API keys.`);
          document.getElementById('settingsLink').style.display = 'block';
          return false;
        }
      }
      return true;
    }

    // Add this utility function at the top of your file
    function toggleLoading(show) {
      document.getElementById('loadingIndicator').style.display = show ? 'block' : 'none';
    }

    async function summarizeText(text) {
      if (text.length <= 200) return text;
      
      const summary = await processWithAnthropic(
        `Summarize the following text in no more than 200 characters and only output the summary:\n\n${text}`
      );
      return summary.slice(0, 120); // Ensure it's not longer than 120 characters
    }