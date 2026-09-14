# Production operations

## Release checklist

1. Run `pnpm install --frozen-lockfile`.
2. Run `pnpm check`.
3. Confirm `pnpm audit --prod` reports no known vulnerabilities.
4. Deploy the tested commit through the Vercel production project.
5. Verify:
   - `/login` loads.
   - `/dashboard` redirects unauthenticated users or renders for an active session.
   - `/api/pdf-worker` returns HTTP 200 with JavaScript content.
   - `/api/document-preview` returns HTTP 401 without a bearer token.
6. Deploy `firestore.rules` to the matching Firebase project whenever that file changes.

## Rollback

For a bad web release, use Vercel's **Instant Rollback** on the last known-good production deployment, then revert the faulty Git commit so the next deployment does not reintroduce it.

For bad Firestore rules, immediately redeploy the last known-good `firestore.rules` from Git. Rules and the web deployment are separate releases.

## Incident triage

1. Check Vercel deployment status and runtime logs.
2. Test `/login`, `/dashboard`, `/api/pdf-worker`, and the document-preview authorization response.
3. Check the external API from the server environment and confirm that `NEXT_PUBLIC_API_BASE_URL` points to the intended environment.
4. For authentication incidents, verify the JWT expiry and the backend response before clearing browser storage.
5. For employee-mapping incidents, check Firebase Authentication and Firestore rule denials. Do not loosen rules as a temporary workaround.

Never include JWTs, refresh tokens, Firebase private keys, or signed document URLs in tickets or logs.
