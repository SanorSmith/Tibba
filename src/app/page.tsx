import { redirect } from 'next/navigation';

/**
 * The front door.
 *
 * This used to be a scratch landing page offering two buttons: "Go to Login"
 * and a temporary database dashboard. Its own first line was a commented-out
 * redirect with the note "uncomment to redirect to login as normal", so it was
 * never meant to survive.
 *
 * It caused a real failure. No role's module list contains `/`, so anything
 * that sent a signed-in user here showed them a page with a sign-in button and
 * no way onward - which reads as having been signed out. The role chooser hit
 * exactly that.
 *
 * The temporary dashboard it linked to is gone, so the page had one working
 * button left. Now it does what the comment always said.
 */
export default function HomePage() {
  redirect('/login');
}
