# Al-Tharid website — single-page menu preview

A Next.js website for Al-Tharid, Jaranwala. The home page has a fixed navbar that shrinks on scroll, smooth links to four menu sections, real stock photography, and draft PKR prices. The admin still edits menu items and store details on this local development starter.

## Update your existing Windows project

1. Stop `npm run dev` in Antigravity (`Ctrl+C`).
2. Back up your existing `D:\1-Al-Thaird\website\data\site.json` if you have already edited menu items or prices in the admin. This update supplies a new draft file with 19 items and sample prices.
3. Extract this ZIP. Copy the **contents** of `al-tharid-website` into `D:\1-Al-Thaird\website`, choosing to replace existing project files. Do not overwrite or remove your existing `.env.local` (it is not included in the ZIP). If you made other code edits, compare before replacing.
4. In Antigravity's terminal, run:

   ```powershell
   cd 'D:\1-Al-Thaird\website'
   npm install
   npm run dev
   ```

5. Open `http://localhost:3000` and test the navigation on desktop and mobile. The local admin remains at `http://localhost:3000/admin`. `/menu` now sends visitors to the menu section on the home page.

## Current design

- Brand colors sampled visually from the approved shawarma packaging reference: yellow, red, black and warm cream. The header uses a temporary text mark; replace it with the final vector logo when available.
- Four categories: Shawarma, Burgers, Loaded Fries and Cold Drinks. Fifteen draft food items from the original plan and four new draft drinks. All prices are **temporary previews** and must be approved from actual recipe and packaging costs.
- Real free-use Unsplash photos are loaded directly from images.unsplash.com. These photos show representative food, not the actual products. A network connection is needed for images to appear. Replace them with your own menu photography before launch. Photo links/credits are at the bottom of the site and the source URLs are in `src/app/page.tsx`.
- The existing admin can edit item details, category, publication, availability and prices, including the new drinks category. Food images are currently fixed per section in `src/app/page.tsx`; image upload is a later admin feature.

## Key files

| File | Purpose |
| --- | --- |
| `src/app/page.tsx` | Single-page menu and stock photo links |
| `src/app/NavBar.tsx` | Sticky navbar, shrink animation and active section |
| `src/app/globals.css` | Responsive brand styles and scroll motion |
| `data/site.json` | Draft menu, preview prices and store details |
| `src/app/admin/page.tsx` | Local admin screen |

Before publishing, confirm your menu and final prices, replace example images, add phone/address/opening hours and move local JSON data and single-password admin to production-ready storage and authentication. This starter does not process orders. `npm run lint` and `npm run build` pass.
