This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment Configuration

The web app uses a centralized env layer in `src/lib/env.ts` for public/build-safe values and `src/lib/env.server.ts` for server-only secrets. Public values may be exposed to browser bundles; server-only values must stay in GitHub/hosting secrets and must never use a `NEXT_PUBLIC_` or `EXPO_PUBLIC_` prefix.

Copy `.env.example` to `.env.local` for local development. The app has a safe canonical fallback for `NEXT_PUBLIC_SITE_URL` (`https://www.creeda.in`) so static generation, metadata, sitemap, robots, and `/_not-found` do not crash during CI builds.

Required for production runtime:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Required only for privileged server operations:

- `SUPABASE_SERVICE_ROLE_KEY`

Optional integrations:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
- `NEXT_PUBLIC_BING_SITE_VERIFICATION`
- `DATABASE_URL`
- `INDEXNOW_KEY`
- `INDEXNOW_API_TOKEN`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_BASE_URL`
- `DIAG_TEST_EMAIL`
- `DIAG_TEST_PASSWORD`

GitHub Actions should store `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` values as repository/environment variables (`vars`). Store `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, and `INDEXNOW_API_TOKEN` as secrets. `DIAG_TEST_EMAIL` and `DIAG_TEST_PASSWORD` are local diagnostics only and should use disposable test accounts. The security build workflow does not require server secrets.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
