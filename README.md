A search UI over a small shared library (`lib/rhythm`) that queries the osu! and Quaver public APIs for 4-key (4K) mania mapsets and merges the results.

## Getting Started

Copy `.env.example` to `.env.local` and fill in an osu! OAuth client id/secret (create one at https://osu.ppy.sh/home/account/edit#oauth, any redirect URL works since only the `client_credentials` grant is used). Quaver's search endpoint is public and needs no credentials.

```bash
nub install
nub run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Without osu! credentials configured, the osu! side of the search will show an error but Quaver results still work.

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
