function getProfileInfo() {
    const nameElement = document.querySelector('[data-testid="UserName"]');
    const bioElement = document.querySelector('[data-testid="UserDescription"]');
    
    let name = null;
    let handle = null;
    let bio = null;
    let profileImageUrl = null;

    if (nameElement) {
        const userInfo = extractUserInfo(nameElement);
        name = userInfo.name;
        handle = userInfo.handle;
        profileImageUrl = userInfo.imageUrl;
    }

    if (bioElement) {
        bio = bioElement.innerText;
    }
    
    const result = { name, handle, bio, profileImageUrl };
    console.log('Profile Info:', result);
    return result;
}

function extractUserInfo(element) {
    // Get the HTML content of the element
    const htmlContent = element.innerHTML;

    // Extract the name (assumes it's the first text not starting with @)
    const nameMatch = htmlContent.match(/<span[^>]*>([^@<]+)<\/span>/);
    const name = nameMatch ? nameMatch[1].trim() : '';

    // Extract the handle (assumes it starts with @ and ends with </span>)
    const handleMatch = htmlContent.match(/@(\w+)<\/span>/);
    const handle = handleMatch ? handleMatch[1] : '';

    // Extract image URL
    const imageUrl = extractImageUrl(handle);

    return { name, handle, imageUrl };
}

function extractImageUrl(handle) {
    const avatarContainer = document.querySelector(`[data-testid="UserAvatar-Container-${handle}"]`);
    if (avatarContainer) {
        const imgElement = avatarContainer.querySelector('img[src*="twimg.com"]');
        return imgElement ? imgElement.src : null;
    }
    return null;
}

function getTweetText() {
    const tweetElement = document.querySelector('[data-testid="tweetText"]');
    return tweetElement ? tweetElement.innerText : null;
}

// Listener for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case "getProfileInfo":
            sendResponse(getProfileInfo());
            break;
        case "getTweetText":
            sendResponse({ text: getTweetText() });
            break;
        default:
            sendResponse({ error: "Unknown action" });
    }
    return true; // Keeps the message channel open for asynchronous responses
});