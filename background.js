chrome.action.onClicked.addListener((tab) => {
    if (tab.url.includes('x.com') || tab.url.includes('twitter.com')) {
        chrome.action.openPopup();
    } else {
        console.log('This extension only works on x.com or twitter.com');
    }
});