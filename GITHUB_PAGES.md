# Deploy on GitHub Pages

This app can be hosted on GitHub Pages without a Vercel or Cloudflare token. GitHub Actions builds the source and deploys the `dist` artifact using GitHub's automatic credentials. Supabase still provides authentication and private data storage.

## One-time setup (no terminal required)

1. Put this project's source in a GitHub repository. Keep `package.json`, `src`, `public`, configuration files and `.github/workflows/deploy-pages.yml` at the repository root. Do not upload `node_modules`, `dist`, `.env` files or secrets. Use a public repository for free Pages on GitHub Free; private-repository Pages availability depends on your GitHub plan.
2. In the repository open **Settings → Pages → Build and deployment → Source**, and select **GitHub Actions**. Enable Actions in repository settings if necessary.
3. Push to `main` or `master`. Alternatively, open **Actions → Deploy to GitHub Pages → Run workflow** on your chosen branch. If an environment approval is requested, approve the `github-pages` deployment.
4. Wait for the build and deployment jobs to pass. Open the published URL shown in the deployment summary or **Settings → Pages**. A project repository normally uses `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`. An account repository named `YOUR-USERNAME.github.io` uses the domain root. The workflow obtains the correct asset/router base from GitHub Pages automatically, including custom-domain deployments.
5. In the connected **Supabase → Authentication → URL Configuration → Redirect URLs**, add both full URLs below, using the exact published repository name (including case):
   - `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/auth/callback`
   - `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/reset-password`
   For root/custom-domain hosting, omit `YOUR-REPOSITORY/`. Do not put `#` in these callback URLs. Existing preview redirect URLs can remain allowed.
6. Sign in with your existing approved account. Do not create another owner. Disable public signups in Supabase if not already disabled. Test sign-in, recovery email/password update, sign-out and refresh on a training page. Test the published address on both devices before importing valuable data.

Further pushes to `main` or `master` redeploy automatically. If your default branch has a different name, update the workflow's branch list or trigger deployments manually. No personal access token or provider secret is needed in the workflow. The browser Supabase publishable key is intentionally public; access is enforced by Supabase owner checks and RLS. Never add a service-role key to the site.

## Routing and authentication

The app uses BrowserRouter with Vite's deployment base. The workflow copies the built entry page to `404.html`: GitHub Pages serves that page when a direct application route has no static file. The app then renders the requested route, preserving its query and fragment for Supabase's code/token processing. Password recovery therefore does not compete with hash-based navigation.

GitHub Pages sends HTTP **404** for those initial nested-route requests even though the application renders. This is a static-host limitation of the fallback, not a failed client navigation. The root page returns 200, and navigation inside the running app does not request server routes. For server-side 200 rewrites or search indexing, use a host with SPA rewrites instead.

## Privacy and limitations

The published frontend and compiled public configuration are downloadable by anyone who can visit the site, even if its source repository is private. Training data remains protected by Supabase authentication and database policies; it must never be embedded in the static build. Keep credentials and exports out of the repository.

GitHub Pages supplies HTTPS hosting, not AI inference or a backend. The default Gemini connector requires a GEMINI_API_KEY secret in Supabase; free-tier eligibility and any charges depend on your Google project. This deployment does not expose local Ollama or make a phone reach the computer's localhost. Existing voice consent and model limitations still apply. Supabase and GitHub plan limits remain separate from application functionality.

Changing from a preview or another host gives the app a new browser origin. Sign in again; synchronized server records remain available. Local settings and unsent drafts do not move automatically. Wait for synchronization or export a backup from the old origin first.

The workflow runs TypeScript checks, tests and a production build. These checks do not prove email delivery, real two-device synchronization or microphone operation. No GitHub deployment is created until the source is placed in your repository and the workflow completes.
