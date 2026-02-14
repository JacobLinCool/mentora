# Mentora API

The **Mentora API** package provides a comprehensive suite of tools, including a server-side endpoint collection, a client-side SDK, and a Svelte-optimized SDK for seamless integration.

## Development

To develop the Mentora API package, you first need to start the local Firebase emulator:

```sh
pnpm --filter mentora-firebase dev
```

Then, start the Mentora API development server:

```sh
pnpm --filter mentora-api dev
```

The development server will be available at `http://localhost:5173`. You will need both the Firebase emulator and the API server running to properly test the package.

## Building

To build the library:

```sh
pnpm build
```

## API docs (TypeDoc)

Generate API documentation:

```sh
pnpm --filter mentora-api run docs:api
```

The generated docs will be written to `packages/mentora-api/docs/typedoc`.
