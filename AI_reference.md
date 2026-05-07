AI Usage Reference Report
Project: ChatVerse Chatroom
Student ID: 113062206

1. AI Tool(s) Used
- Gemini 1.5 Pro
- Gemini 1.5 Flash
- Claude 3.5 Sonnet

2. Scope of Usage

A. Refactoring from React to Vanilla JS
Location: index.html, js/app.js, js/chat.js, js/auth.js, js/ui.js
Prompt: "Convert this React chat application to a pure vanilla JavaScript version using Firebase compat SDK. Keep all features like messaging, bot, and canvas."
Response: The AI helped map the React component logic into separate JS files and handled the DOM manipulation logic.
Refinement: I had to fix the CSS layout because the initial conversion had issues with the chatroom not scrolling correctly on mobile. I changed the flexbox settings to use min-height 0.

B. Firebase Listeners
Location: js/chat.js
Prompt: "How to use onSnapshot in Firebase compat version to listen for new messages in a collection?"
Response: Provided the syntax for collection listeners.
Refinement: I added logic to filter out messages from blocked users in group chats so that the blocking feature works as required.

C. Drawing Canvas
Location: js/ui.js
Prompt: "Write a function for a canvas drawing tool with different brush sizes and colors for a chatroom sticker feature."
Response: Provided the basic mouse event listeners for drawing on a canvas element.
Refinement: I added a history stack to allow users to undo their strokes, which was not in the original AI suggestion.

D. Gemini Bot Integration
Location: js/chat.js
Prompt: "Provide a fetch request to call the Gemini API from the browser to create a chatbot."
Response: Provided the API endpoint and JSON body structure.
Refinement: I added a check to make sure the bot only responds when the user starts a message with "@bot".

3. Statement of Non-Usage
AI was used for refactoring and implementing complex parts like the real-time listeners and canvas. All code was reviewed and modified to fit the project requirements.
