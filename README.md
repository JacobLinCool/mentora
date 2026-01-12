# Mentora

Mentora is a learning platform that helps people to reshape their thinking through conversation and reflection with AI.

## Development

The application is built using Node.js ecosystem and Firebase.

1. Install dependencies: `pnpm i`
2. Build all packages: `pnpm -r build`
3. Setup local Firebase emulators: `pnpm --filter mentora-firebase dev`
4. Configure main application environment variables: Copy `.env.example` to `.env` and fill in the values.
5. Run development server: `pnpm --filter mentora dev`
