import { useEffect, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { newsletterService } from "../../api/services/newsletter.service";

/**
 * Newsletter — the audience, not the content.
 *
 * Writing announcements used to live here too, which is why the artwork fields never got built:
 * on a page about subscribers, a thumbnail reads as decoration. Announcements are their own
 * section now, and this page answers the one question that really is about the mailing list —
 * how many people are on it. Publishing an announcement is still what sends mail to them, so the
 * card below points there rather than pretending the two are unrelated.
 */
export default function NewsletterPage() {
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    newsletterService
      .getStats(ac.signal)
      .then((stats) => setSubscriberCount(stats.data?.subscriberCount ?? 0))
      .catch(() => setSubscriberCount(null));
    return () => ac.abort();
  }, []);

  return (
    <>
      <PageMeta title="Newsletter | Buyology" description="Newsletter subscribers" />
      <PageBreadcrumb pageTitle="Newsletter" />

      <div className="mb-6 max-w-sm">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Subscribers</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white">
            {subscriberCount === null ? "—" : subscriberCount.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            People who opted in and have not unsubscribed.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-base font-medium text-gray-800 dark:text-white">
          Looking for articles?
        </h3>
        <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          Writing, editing and publishing now happens in Announcements, where a post can also carry
          a thumbnail and a gallery. Choosing <strong>Publish &amp; Send</strong> there is what
          emails an announcement to the subscribers counted above.
        </p>
        <Link
          to="/announcements"
          className="mt-4 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Go to Announcements
        </Link>
      </div>
    </>
  );
}
