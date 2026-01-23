# Video Conferencing Application

## Overview
A real-time video conferencing application with collaborative features. The frontend connects to an externally deployed backend server at `https://video-server-2261.onrender.com`.

## Features
- HD Video calls with WebRTC via mediasoup
- Real-time chat messaging
- Screen sharing
- Live transcription with language translation
- Recording support
- **Polls** - Create and participate in polls during calls
- **Whiteboard** - Collaborative drawing canvas
- **Shared Notes** - Real-time collaborative note-taking

## Project Structure
```
src/
├── components/
│   ├── VideoCall.tsx      - Main video call container
│   ├── CallControls.tsx   - Call control buttons and menu
│   ├── ChatPanel.tsx      - Chat messaging panel
│   ├── PollsPanel.tsx     - Polls creation and voting UI
│   ├── WhiteboardPanel.tsx - Collaborative drawing canvas
│   ├── NotesPanel.tsx     - Shared notes editor
│   └── ...
├── hooks/
│   └── useVideoCall.ts    - Video call state management hook
├── lib/
│   └── mediasoup.ts       - MediaSoup client with socket.io handlers
└── pages/
    └── Index.tsx          - Main entry point
```

## Socket Events for Collaborative Features

### Polls
- `create-poll` - Create a new poll
- `poll-created` - Poll created notification
- `submit-vote` - Submit vote for a poll
- `poll-updated` - Poll vote count updated
- `close-poll` - Close a poll
- `poll-closed` - Poll closed notification

### Whiteboard
- `whiteboard-stroke` - Send a drawing stroke
- `whiteboard-clear` - Clear the whiteboard
- `whiteboard-state` - Receive current whiteboard state

### Shared Notes
- `update-notes` - Update shared notes
- `notes-updated` - Notes updated notification
- `notes-state` - Receive current notes state

## Running the Project
The application runs on port 5000 using Vite's development server.

```bash
npm run dev
```

## Recent Changes
- Added PollsPanel, WhiteboardPanel, and NotesPanel components
- Extended MediaSoupClient with collaborative feature handlers
- Updated useVideoCall hook with polls, whiteboard, and notes state
- Added collaborative feature menu items in CallControls dropdown
