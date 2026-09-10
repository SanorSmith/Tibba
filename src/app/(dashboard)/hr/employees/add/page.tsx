/**
 * The old Add Employee form, kept only as a redirect.
 *
 * There were two of these, at /hr/employees/add and /hr/employees/new, and
 * the Staff Directory linked to both. Whichever button you happened to press
 * decided which form you got, and only one of them had the account section:
 * the duplicate-email checks, the choice of role, and the picker for linking
 * an account that already exists. Everything built for this screen landed on
 * `new` and was invisible from `add`, twice, weeks apart.
 *
 * A redirect rather than a deletion, so that anything still pointing here -
 * a bookmark, a link in a message - arrives at the form that works instead of
 * a 404.
 */
import { redirect } from 'next/navigation';

export default function AddEmployeeRedirect() {
  redirect('/hr/employees/new');
}
