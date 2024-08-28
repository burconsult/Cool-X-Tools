
    
    document.getElementById('speakPost').addEventListener('click', async () => {
        const status = document.getElementById('status');
        status.textContent = 'Fetching X post...';
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.url.includes('x.com') && !tab.url.includes('twitter.com')) {
            showError('This extension only works on x.com or twitter.com');
            return;
        }
        
        chrome.tabs.sendMessage(tab.id, {action: "getTweetText"}, (response) => {
            if (chrome.runtime.lastError) {
                showError('Error: ' + chrome.runtime.lastError.message);
                return;
            }
            
            const postContent = response.text;
            if (postContent) {
                document.getElementById('postText').innerText = postContent;
                processAndSpeak(postContent);
            } else {
                showError('No X post text found or could not access the content.');
            }
        });
    });
    
    function processAndSpeak(text) {
        const sanitizedText = text.replace(/<[^>]*>/g, '');
        const status = document.getElementById('status');
        status.textContent = 'Generating speech...';
    
        const API_KEY = 'da5aa32fb96e2179e8ee61f83157293f';
        const voiceID = 'IedDcZoHOPxiwT4aq85W';
    
        fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceID, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': API_KEY
            },
            body: JSON.stringify({
                text: sanitizedText,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5
                }
            })
        }).then(response => {
            if (!response.ok) {
                throw new Error('Failed to generate speech');
            }
            return response.blob();
        }).then(blob => {
            const audioUrl = URL.createObjectURL(blob);
            new Audio(audioUrl).play();
            status.textContent = 'Playing...';
        }).catch(error => {
            console.error('Error:', error);
            showError('Failed to generate or play speech: ' + error.message);
        }).finally(() => {
            setTimeout(() => { status.textContent = ''; }, 3000);
        });
    }
    
    function showError(message) {
        const status = document.getElementById('status');
        status.textContent = message;
        document.getElementById('postText').innerText = '';
        setTimeout(() => { status.textContent = ''; }, 5000);
    }