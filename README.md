# Double Image Comparison Tool

A Vue.js application that allows users to compare two images side-by-side. Users can upload their own images or use pre-loaded templates. The tool also provides a drawing canvas to annotate or highlight differences between the images.

## Features

*   **Side-by-side Image Comparison:** View two images concurrently for easy comparison.
*   **Custom Image Upload:** Upload your own images from your local machine.
*   **Template Images:** Start with pre-loaded templates for quick use.
*   **Drawing Canvas:** Annotate images with drawing tools to highlight key areas.
*   **Responsive Design:** Works on various screen sizes.

## Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (v16 or higher recommended)
*   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1.  Clone the repository:
    ```sh
    git clone https://github.com/FDeSousa/double-image.git
    ```
2.  Navigate to the project directory:
    ```sh
    cd double-image-vue
    ```
3.  Install the dependencies:
    ```sh
    npm install
    ```

## Usage

### Development Server

To run the app in development mode with hot-reloading, use the following command:

```sh
npm run serve
```

The application will be available at `http://localhost:8080`.

### Production Build

To compile and minify the application for production, run:

```sh
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## Testing

### Unit Tests

Run unit tests using Jest:

```sh
npm run test:unit
```

### End-to-End Tests

Run end-to-end tests using Playwright:

```sh
npm run test:e2e
```

## Deployment

This project is configured for deployment on [Vercel](https://vercel.com/).

When deploying to Vercel, the `vercel.json` file in the root of the project ensures that the necessary system dependencies for the `canvas` package are installed in the build environment. The `installCommand` uses `yum` to install these dependencies on Amazon Linux 2.

A new deployment is automatically triggered on every push to the `main` branch.

## Available Scripts

*   `npm run serve`: Compiles and hot-reloads for development.
*   `npm run build`: Compiles and minifies for production.
*   `npm run lint`: Lints and fixes files.
*   `npm run test:unit`: Runs unit tests.
*   `npm run test:e2e`: Runs end-to-end tests.

## Technologies Used

*   [Vue.js 3](https://vuejs.org/)
*   [Vue CLI](https://cli.vuejs.org/)
*   [Jest](https://jestjs.io/)
*   [Playwright](https://playwright.dev/)
*   [Vercel](https://vercel.com/)
