<<<<<<< HEAD
# chatpal
=======
# ChatPal

ChatPal is a private messaging application that enables real-time chat with advanced collaboration features including live drawing, collaborative tables, and threaded conversations.

## Features

- **Real-time Messaging**: Send and receive messages instantly
- **Group Conversations**: Create and manage group chats
- **Live Drawing Board**: Collaborate on drawings in real-time
- **Interactive Tables**: Create and edit tables collaboratively
- **Threaded Conversations**: Organize discussions with reply threads
- **Notifications**: Get alerts for new messages and activities
- **User Status**: See who's online, away, or offline

## Tech Stack

- **Frontend**: React.js, Socket.io Client, CSS
- **Backend**: Node.js, Express.js, Socket.io
- **Database**: MongoDB
- **Authentication**: JWT

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/chatpal.git
   cd chatpal
   ```

2. Install server dependencies:
   ```
   npm install
   ```

3. Install client dependencies:
   ```
   cd client
   npm install
   cd ..
   ```

4. Create a `.env` file in the root directory and add your environment variables (use `.env.sample` as a template).

5. Run the development server:
   ```
   npm run dev
   ```

This will start both the backend server and the React frontend app in development mode.

- Backend: [http://localhost:5000](http://localhost:5000)
- Frontend: [http://localhost:3000](http://localhost:3000)

## Project Structure

The project follows a structured organization with clear separation between client and server code:

```
chatpal/
├── client/                           # Frontend React application
│   ├── public/                       # Static files
│   └── src/                          # React source code
│       ├── components/               # React components
│       ├── context/                  # React context providers
│       └── utils/                    # Utility functions
│
├── server/                           # Backend Node.js application
│   ├── config/                       # Configuration files
│   ├── middleware/                   # Express/Socket middleware
│   ├── models/                       # MongoDB models
│   ├── routes/                       # Express API routes
│   ├── sockets/                      # Socket.io handlers
│   └── server.js                     # Server entry point
│
├── .env                              # Environment variables
├── .gitignore                        # Git ignore file
└── package.json                      # Root dependencies and scripts
```

## Development

### Running the Server Only

```
npm run server
```

### Running the Client Only

```
npm run client
```

### Running Both Client and Server

```
npm run dev
```

## Deployment

### Building for Production

```
npm run build
```

This will create a production build of the React app in the `client/build` directory.

### Deploying to Heroku

```
heroku create
git push heroku main
```

## License

This project is licensed under the Unlicense - see the LICENSE file for details.
>>>>>>> 9075028 (Initial commit - added project files)
