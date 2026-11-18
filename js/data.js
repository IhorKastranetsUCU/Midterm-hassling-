// ========================================================
// UCU StatHustle: Unified Course Data (Topic 2 & Topic 3)
// ========================================================

window.PS_DATA_ALL = {
  topic2: window.PS_DATA_TOPIC2,
  topic3: window.PS_DATA_TOPIC3
};

// Current active topic (persisted in localStorage, default 'topic2')
window.currentActiveTopic = localStorage.getItem('stathustle_active_topic') || 'topic2';

// Dynamic pointer to active topic
window.PS_DATA = window.PS_DATA_ALL[window.currentActiveTopic] || window.PS_DATA_TOPIC2;

// Global topic switcher
window.switchTopic = function(topicId, autoRender = true) {
  if (!window.PS_DATA_ALL || !window.PS_DATA_ALL[topicId]) {
    console.warn("Topic not found:", topicId);
    return;
  }
  window.currentActiveTopic = topicId;
  window.PS_DATA = window.PS_DATA_ALL[topicId];
  try {
    localStorage.setItem('stathustle_active_topic', topicId);
  } catch (e) {}

  if (window.app && autoRender) {
    window.app.onTopicChanged(topicId);
  }
};
