This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Clerk + Convex Auth Setup

If you see **404 errors** on `tokens/convex` or **"Unauthenticated"** errors from Convex, configure the Convex JWT template in Clerk:

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → **JWT Templates**
2. Click **New template** and select **Convex** from the list
3. **Do NOT rename** the template—it must be called `convex`
4. Copy the **Issuer** URL (e.g. `https://verb-noun-00.clerk.accounts.dev`)
5. Add to `.env.local`:
   ```
   CLERK_JWT_ISSUER_DOMAIN=https://your-issuer-url.clerk.accounts.dev
   ```
6. In [Convex Dashboard](https://dashboard.convex.dev) → Settings → Environment Variables, set `CLERK_JWT_ISSUER_DOMAIN` to the same value
7. Run `npx convex dev` to sync the configuration

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
