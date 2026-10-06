import { notFound } from 'next/navigation';

/**
 * Account.
 *
 * A 404 UNTIL SIGNING IN EXISTS. Nothing links here: the header and drawer
 * links were withheld (src/lib/placeholders.ts, `account`). A page whose only
 * content is "there is no account yet" answers a question no visitor would
 * ask unless the site had invited them to. Phase 6 builds authentication, and
 * the page with it.
 */
export default function AccountPage() {
  notFound();
}
