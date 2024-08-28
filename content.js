function getTweetText() {
    const tweetElement = document.querySelector('[data-testid="tweetText"]');
    return tweetElement ? tweetElement.innerText : null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getTweetText") {
        sendResponse({text: getTweetText()});
    }
});