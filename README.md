# Who You Are By Your Music

A modern web application built with Next.js that analyzes your Spotify listening history to create a visual and insightful profile of your musical taste.

## 🚀 Features

*   **Spotify Integration:** Securely connect your Spotify account to fetch your top artists, tracks, and recently played history.
*   **Musical Personality Profile:** Visualize your music taste through generated stats and charts.
*   **Beautiful UI:** Built with a modern TailwindCSS framework for a smooth, responsive experience.

## 🛠️ Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/) (React)
*   **Authentication:** [Next-Auth.js](https://next-auth.js.org/) for Spotify OAuth
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Data Fetching:** [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
*   **Deployment:** [Vercel](https://vercel.com/) (Recommended)

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (Version 18 or higher)
*   [npm](https://www.npmjs.com/), [yarn](https://yarnpkg.com/), or [pnpm](https://pnpm.io/)

You will also need a [Spotify Developer Account](https://developer.spotify.com/dashboard/).

## ⚙️ Local Setup

Follow these steps to get a local copy up and running.

### 1. Clone and Install

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/whoyouarebyyourmusic.git

# Navigate into the project directory
cd whoyouarebyyourmusic

# Install dependencies
npm install
```

### 2. Configure Spotify App
Go to the Spotify Developer Dashboard.

Click "Create App".

Fill in the details (Name, Description).

For "Redirect URI", add: http://localhost:3000/api/auth/callback/spotify

Once created, note down your Client ID and Client Secret.

3. Environment Variables
In the root of your project, create a file named .env.local and add the following:

```bash
# Spotify OAuth Credentials
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here

# Next-Auth Secret (Generate a secure random string)
NEXTAUTH_SECRET=your_generated_secret_here
NEXTAUTH_URL=http://localhost:3000
```

To generate a NEXTAUTH_SECRET, you can run this command in your terminal:

```bash
openssl rand -base64 32
```

Copy the output and use it as the value for NEXTAUTH_SECRET.

4. Run the Development Server

```bash
npm run dev
```
Open http://localhost:3000 with your browser to see the application.

🚀 Deploy on Vercel
The easiest way to deploy your Next.js app is to use the Vercel Platform.

Push your code to GitHub.

Go to Vercel and sign up with your GitHub account.

Click "New Project" and import your repository.

In the configuration screen, add your Environment Variables:

SPOTIFY_CLIENT_ID

SPOTIFY_CLIENT_SECRET

NEXTAUTH_SECRET (Use the same value from your .env.local or generate a new one)

NEXTAUTH_URL (Set this to your Vercel deployment URL, e.g., https://your-app.vercel.app)

Click Deploy.

Crucial Final Step: Go back to your Spotify App settings in the Developer Dashboard and add your production Redirect URI (e.g., https://your-app.vercel.app/api/auth/callback/spotify).

🤝 Contributing
Contributions are welcome! Feel free to open an issue or submit a pull request.

Fork the Project

Create your Feature Branch (git checkout -b feature/AmazingFeature)

Commit your Changes (git commit -m 'Add some AmazingFeature')

Push to the Branch (git push origin feature/AmazingFeature)

Open a Pull Request

📜 License
This project is licensed under the MIT License. See the LICENSE.md file for details.

🙏 Acknowledgments
Thanks to Spotify for their powerful Web API.

Built with Next.js and deployed on Vercel.