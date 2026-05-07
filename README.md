Midterm Project - Chatroom
Student ID: 113062206

This is a chatroom web application built with Vanilla JavaScript, HTML, CSS and Firebase.
Deployed at: https://midterm-chatroom-2672b.web.app


--- How to set up locally ---

Note: Firebase Auth does not work if you open index.html directly (file://). You must use a local server.

1. Extract or clone the project folder
2. Open a terminal in the project directory
3. Run: npx serve .
4. Open http://localhost:3000 in the browser

To deploy to Firebase:
1. npm install -g firebase-tools
2. firebase login
3. firebase deploy


--- Features ---

Basic:
- Email sign up and sign in
- Google sign in
- Firebase Hosting deployment
- Database read/write with authentication
- RWD (responsive web design, works on different screen sizes)
- Chatroom: create private and group chats, real-time messaging, load chat history, invite members to group chats

Advanced:
- Pure Vanilla JavaScript implementation
- Chrome notifications for unread messages (only notifies when the tab is not focused)
- CSS animations (message slide-in, hover effects, floating shapes background)
- XSS prevention (HTML tags in messages are escaped, not rendered)
- User profile modal: edit profile picture, username, email, phone number, address
- Message operations: unsend, edit, search, send images (images can also be unsent)

Bonus:
- Chatbot: type "@bot <your question>" in any chatroom to get a reply from Gemini AI
- Block user: block/unblock users from profile settings. Blocked users cannot DM you. In group chats, messages between blocker and blocked are hidden from each other.
- Send GIF: click the GIF button in the message input to search and send GIFs (powered by Giphy API)
- Emoji reactions: hover over any message and click the emoji button to react. Click again to remove your reaction.
- Reply to message: hover a message and click the reply button. The replied message shows above the input while typing. Clicking a reply scrolls to and highlights the original message. If the original was unsent, it shows "This message was deleted".
- Custom sticker: click the drawing button to open a canvas. Draw with 12 colors and 5 brush sizes. The sticker is sent as-is at the position drawn. Stickers can be unsent.


--- How to use each feature ---

Sign up: go to the login page, click "Sign Up", fill in username, email, and password
Google sign in: click "Sign in with Google" on the login page
Create a chat: click the "+" button at the top of the sidebar
Send a message: type in the input field and press Enter or click the send button
Use the chatbot: type "@bot" followed by your question (e.g. "@bot what is React?")
Send an image: click the camera icon in the input bar and select an image file
Send a GIF: click the "GIF" button in the input bar, search for a GIF, and click on it
Insert an emoji: click the smiley face button in the input bar
Draw a sticker: click the paint palette button in the input bar to open the canvas
Reply to a message: hover over a message, click the reply arrow icon
React to a message: hover over a message, click the emoji icon, then pick an emoji
Edit your message: hover over your own message, click the pencil icon
Unsend your message: hover over your own message, click the trash icon
Search messages: click the search icon in the chatroom header
Invite members: click the members icon in a group chat header
Edit your profile: click your avatar in the sidebar footer, then click "Edit Profile"
Block a user: in Edit Profile, click "Manage Blocked Users"
Accept/decline invitation: check the "Invitations" section at the top of the sidebar
