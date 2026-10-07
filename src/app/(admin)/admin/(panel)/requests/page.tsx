import type { Metadata } from 'next';
import Link from 'next/link';

import { StatusPill, StatusTabs } from '@/components/admin/StatusTabs';
import { formatDateTime } from '@/lib/admin/format';
import {
  countRequestsByStatus,
  isRequestStatus,
  jewelryTypeLabel,
  listRequests,
  readRequestSnapshot,
  REQUEST_STATUS_LABELS,
} from '@/lib/admin/requests';
import { requireAdminPage } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'בקשות עיצוב' };

const TABS = [
  { value: 'OPEN', label: 'פתוחות' },
  { value: 'NEW', label: REQUEST_STATUS_LABELS.NEW },
  { value: 'REVIEWING', label: REQUEST_STATUS_LABELS.REVIEWING },
  { value: 'QUOTE_SENT', label: REQUEST_STATUS_LABELS.QUOTE_SENT },
  { value: 'CUSTOMER_APPROVED', label: REQUEST_STATUS_LABELS.CUSTOMER_APPROVED },
  { value: 'PRODUCTION', label: REQUEST_STATUS_LABELS.PRODUCTION },
  { value: 'COMPLETED', label: REQUEST_STATUS_LABELS.COMPLETED },
  { value: 'REJECTED', label: REQUEST_STATUS_LABELS.REJECTED },
] as const;

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const status = isRequestStatus(params.status) ? params.status : 'OPEN';
  const [requests, counts] = await Promise.all([listRequests({ status }), countRequestsByStatus()]);

  return (
    <>
      <h1 className="text-2xl font-bold">בקשות עיצוב</h1>
      <div className="mt-6">
        <StatusTabs basePath="/admin/requests" current={status} tabs={TABS} counts={counts} />
      </div>

      {requests.length === 0 ? (
        <p className="text-muted-foreground mt-10">אין בקשות בסטטוס הזה.</p>
      ) : (
        <ul className="divide-border border-border mt-6 divide-y border-y">
          {requests.map((request) => {
            const model = readRequestSnapshot(request.productSnapshot);
            return (
              <li key={request.id}>
                <Link
                  href={`/admin/requests/${request.requestNumber}`}
                  className="hover:bg-muted/50 flex flex-wrap items-start gap-x-6 gap-y-1 px-1 py-4 text-sm"
                >
                  <div className="w-24 shrink-0">
                    <p className="font-semibold tabular-nums">#{request.requestNumber}</p>
                    <p className="text-muted-foreground tabular-nums">
                      {formatDateTime(request.createdAt)}
                    </p>
                  </div>
                  <div className="w-44 shrink-0">
                    <p className="font-medium">{request.fullName}</p>
                    <p className="text-muted-foreground">
                      <bdi dir="ltr">{request.phone ?? request.email}</bdi>
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {jewelryTypeLabel(request.jewelryType)}
                      {model ? ` · לפי ${model.nameHe}` : ''}
                    </p>
                    <p className="text-muted-foreground line-clamp-2">{request.description}</p>
                  </div>
                  <StatusPill
                    label={REQUEST_STATUS_LABELS[request.status]}
                    tone={request.status === 'NEW' ? 'attention' : 'neutral'}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
