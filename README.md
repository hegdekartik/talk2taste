# AI Recipe Transcriber

A modern, web-based tool that uses Google's **Gemini 1.5 Pro** model to transcribe and translate audio recipes into clear, step-by-step instructions with an extracted list of ingredients. You can also provide an image of the recipe to ensure maximum accuracy and context.

## Features

- 🎙️ **Audio Transcription & Translation**: Automatically detect and translate spoken recipes (e.g., Kannada) into English.
- 🖼️ **Image Context**: Enhance recipe extraction accuracy by providing an optional photo of the dish.
- 🎨 **Premium Modern Design**: A glassmorphism-inspired UI with smooth animations, dark-mode gradients, and a highly responsive layout.
- ⚡ **No Backend Required**: Runs directly in the browser! Configures securely by saving your API key in your local browser storage.
- 📦 **Vite Powered**: Extremely fast Hot Module Replacement (HMR) and optimized build assets.

## Setup Instructions

### Prerequisites
You will need Node.js installed on your machine.

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/hegdekartik/talk2taste.git
   cd talk2taste
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   Navigate to `http://localhost:3000` (or the URL provided in your terminal).

5. **Configure API Key**:
   - Get an API key from [Google AI Studio](https://aistudio.google.com/).
   - Click the "Settings" (gear) icon in the top right of the web app.
   - Enter your Gemini API key and save.

## Deploying to Vercel

This project is configured using **Vite**, making it incredibly simple to deploy to Vercel.

1. Create an account on [Vercel](https://vercel.com/).
2. Click **Add New Project** and import this GitHub repository.
3. Vercel will automatically detect that you are using Vite and will configure the settings as follows:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Click **Deploy**. Vercel will build and serve your site globally on an optimized edge network!

## Technologies Used

- **HTML5 & CSS3**: Custom CSS variables, Grid/Flexbox layouts, Backdrop Filters for glass effects.
- **JavaScript (Vanilla)**: Fetch API, File API for Base64 encoding.
- **Vite**: Frontend tooling for rapid development and optimized builds.
- **Marked.js**: Markdown parser for displaying generated recipes cleanly.
- **Google Gemini API**: `gemini-1.5-pro` model for multimodal (audio/image) inference.
