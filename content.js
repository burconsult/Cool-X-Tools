function getTweetText() {
    const tweetElement = document.querySelector('[data-testid="tweetText"]');
    return tweetElement ? tweetElement.innerText : null;
}

function getProfileInfo() {
    const nameElement = document.querySelector('[data-testid="UserName"]');
    const bioElement = document.querySelector('[data-testid="UserDescription"]');
    const username = nameElement ? nameElement.innerText.split('\n')[0] : null;
    const bio = bioElement ? bioElement.innerText : null;
    const result = { username, bio };
    console.log('Profile Info:', result);  // Add this line
    return result;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case "extractPostText":
            try {
                const postText = extractPostText();
                sendResponse({success: true, data: postText});
            } catch (error) {
                sendResponse({success: false, error: error.message});
            }
            break;
        case "extractProfileInfo":
            try {
                const profileInfo = extractProfileInfo();
                sendResponse({success: true, data: profileInfo});
            } catch (error) {
                sendResponse({success: false, error: error.message});
            }
            break;
        default:
            sendResponse({success: false, error: "Unknown action"});
    }
    return true;  // Indicates that we will send a response asynchronously
});

function extractPostText() {
    const postElement = document.querySelector('[data-testid="tweetText"]');
    if (!postElement) throw new Error("Couldn't find post text");
    return postElement.innerText;
}

function extractProfileInfo() {
    const nameElement = document.querySelector('[data-testid="UserName"]');
    const bioElement = document.querySelector('[data-testid="UserDescription"]');
    if (!nameElement || !bioElement) throw new Error("Couldn't find profile information");
    const username = nameElement.innerText.split('\n')[0];
    const bio = bioElement.innerText;
    return { username, bio };
}

// Add error handling for message sending
chrome.runtime.sendMessage({action: "getSelectedText"}, function(response) {
    if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
        return;
    }
    console.log('Message response:', response);
    if (response.success) {
        console.log('Selected text:', response.data);
    } else {
        console.error('Error getting selected text:', response.error);
    }
});