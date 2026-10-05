# Food Search API Comparison

A modern Next.js application that allows you to seamlessly compare food search results between the **Fitrofy** and **Bonhappetee** APIs side-by-side. 

## Features

- **Side-by-Side Comparison:** Visually compare food search endpoints (v1 and v2) with instant name overlap analysis.
- **Modern UI:** Designed with a clean, light-mode aesthetic using Tailwind CSS v4 and `lucide-react` icons.
- **Micro-Animations:** Smooth expanding/collapsing data cards powered by `framer-motion`.
- **CORS-Free Proxying:** Built-in Next.js rewrites securely proxy your API requests to avoid browser CORS restrictions.
- **Robust Error Handling:** Safely parses API responses and gracefully catches failures without crashing the application.

## Getting Started

First, make sure to install all the required dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

1. Paste your **Bonhappetee API Key**.
2. Enter your **Fitrofy Company ID**.
3. Type in any food query (e.g., `paneer bhurji`).
4. Click **Compare APIs** to fetch and view the detailed nutrition data side by side.

## Technologies Used

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Lucide Icons](https://lucide.dev/)
