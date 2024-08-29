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
    if (request.action === "getTweetText") {
        sendResponse({text: getTweetText()});
    } else if (request.action === "getProfileInfo") {
        sendResponse({profileInfo: getProfileInfo()});
    }
});