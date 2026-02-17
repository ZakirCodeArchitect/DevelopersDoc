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

## CI/CD

- **GitHub Actions** (`.github/workflows/ci-cd.yml`) runs on every **push to `main`** and on **pull requests targeting `main`**:
  - Installs dependencies, generates Prisma client, runs **lint** and **build**.
- For **automatic deployment** when you push to `main`, use Vercel’s Git integration (see below).

## Deploy on Vercel (auto-deploy on push to main)

1. Go to [Vercel](https://vercel.com) and **import** this repository (or connect the GitHub repo to an existing project).
2. Set the **Production Branch** to `main`.
3. Add your **environment variables** in the Vercel project (e.g. `DATABASE_URL`, `DIRECT_URL`, Clerk keys, etc.).
4. Every **push to `main`** will trigger a new deployment.

Optional: to make the CI build use the same env as production, add `DATABASE_URL`, `DIRECT_URL`, and any required Clerk/App URL vars as **GitHub repository secrets** (Settings → Secrets and variables → Actions). The workflow uses placeholders if secrets are not set.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
