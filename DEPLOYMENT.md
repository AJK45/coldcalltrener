# Tréner Hovorov — deployment handover

## Confirmed deployment

- Hosting provider: Vercel
- Production URL: https://trener-hovorov.vercel.app
- Team: `team_iTTaMnxmd6tHRdDpG3dQZbbh`
- Project: `prj_wTkcjGiL5pDcZ3HUjm1MsneCuM6w`
- Deployment: `dpl_DxyUfbs9DZQjJNxU1mPy2WkuSzfn`
- Deployment-specific URL: https://trener-hovorov-4r1ne3bp9-ajays-projects-2875459e.vercel.app
- Source snapshot commit: `dc8bd78376bb4ca23267f51cb5d3458aa0342e2d`
- Vercel reported state: **READY**, production aliases assigned, no alias error.
- Framework: Vite. Node: 22.x. Output: `dist`.
- Install command configured: `pnpm install --frozen-lockfile`.
- Build command configured: `pnpm run build`.

This deployment was submitted as a source-file snapshot, not a Git-linked repository deployment. Local transcripts, browser drafts, recordings, credentials and internal `.dyad` files were not uploaded. Updating source locally does not automatically update this deployment; a new deployment or a separately configured Git integration is required. No paid inference provider was enabled.

## Unfinished activation steps

### 1. Vercel deployment protection

The project read-back still reports `ssoProtection.deploymentType = all_except_custom_domains`, enabled. The production `vercel.app` address may therefore request a Vercel login before showing the application's sign-in screen.

An attempted update to `prod_deployment_urls_and_all_previews` timed out and did **not** take effect according to the subsequent read-back. Do not assume it succeeded.

In the Vercel project dashboard, open **Settings → Deployment Protection** and select protection that permits the production domain while retaining preview/deployment-URL protection, if available on the account. Keep Supabase authentication and owner authorization unchanged. If retaining the default hosting gate, the user must also sign into the authorized Vercel account on the phone.

### 2. Create and approve the private user

The live database readiness check returned **zero authentication accounts and zero approved owners**. No password was created or guessed.

Follow the activation section in README.md: create the email/password user through Supabase Authentication, then authorize that user's UUID in `public.private_owner`. Only one owner is permitted. Disable public Auth sign-up in Supabase; absence of a registration UI does not disable the Auth API.

Do not disclose passwords or service-role keys in chat.

### 3. Allow production return URLs

In Supabase **Authentication → URL Configuration → Redirect URLs**, allow these exact public application routes:

- https://trener-hovorov.vercel.app/auth/callback
- https://trener-hovorov.vercel.app/reset-password

These settings were **not** changed automatically. Keep equivalent preview return URLs when testing in the preview. Do not use a localhost Site URL workaround.

### 4. Verify in a real browser

Automated route fetches for home, sign-in, callback and reset timed out. Vercel's READY status confirms hosting build completion, not successful end-to-end browser authentication, email recovery or microphone operation.

After the activation steps, test the production URL from a phone and computer, including sign-in, rejection of an unapproved user, password recovery, sign-out, direct route refresh and a small synchronized edit. Wait for synchronization confirmation before switching devices.

Phone voice calls are still a separate dependency: publishing the frontend does not expose local Ollama safely or provide a verified cloud Slovak speech pipeline. Paid AI remains disabled.
