# Kids Code Academy

A fun and educational website for teaching kids computer programming and coding concepts.

## Features

- 🎨 Kid-friendly, colorful interface
- 📹 Video upload and library for educational content
- 💳 Payment integration for booking tutoring sessions
- 💬 Real-time online tutoring with chat functionality
- 📱 Responsive design using Bootstrap

## Tech Stack

### Frontend

- React.js
- Bootstrap for styling
- React Router for navigation
- Axios for API calls
- Socket.io client for real-time communication

### Backend

- Node.js with Express.js
- MySQL database
- Multer for file uploads
- Stripe for payment processing
- Socket.io for real-time features

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MySQL
- npm or yarn

### Backend Setup

1. Navigate to the server directory:

   ```
   cd kids-coding-website/server
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Set up the database:

   - Create a MySQL database named `kids_coding`
   - Run the SQL script in `database.sql` to create tables

4. Configure environment variables:

   - Copy `.env.example` to `.env`
   - Update the values in `.env` with your database credentials and Stripe API key

5. Start the server:
   ```
   npm start
   ```

### Frontend Setup

1. Navigate to the client directory:

   ```
   cd kids-coding-website/client
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the development server:

   ```
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## Usage

1. **Home Page**: Overview of the academy's features
2. **Video Upload**: Upload educational videos (admin/tutor feature)
3. **Book Sessions**: Parents can book tutoring sessions and make payments
4. **Online Tutoring**: Real-time chat-based tutoring sessions

## API Endpoints

- `POST /api/upload-video`: Upload a video file
- `GET /api/videos`: Get all uploaded videos
- `POST /api/create-payment-intent`: Create a Stripe payment intent
- `POST /api/book-session`: Book a tutoring session

## Real-time Features

- Socket.io is used for real-time chat during tutoring sessions
- Users can join rooms and communicate with tutors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
# kidscodeacademy
