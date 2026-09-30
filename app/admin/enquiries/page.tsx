import type { Metadata } from "next";
import Link from "next/link";
import { PAGE_SIZE, parsePage, requireAdmin } from "../../../lib/admin";
import { EnquiryStatus } from "../../../lib/generated/prisma/enums";
import { formatOrderDate } from "../../../lib/order-display";
import { prisma } from "../../../lib/prisma";
import Pagination from "../../../components/admin/Pagination";
import EnquiryActions from "./EnquiryActions";

export const metadata: Metadata = { title: "Enquiries" };

const STATUS_LABELS: Record<EnquiryStatus, string> = {
  NEW: "New",
  IN_PROGRESS: "In progress",
  CLOSED: "Closed",
};

type Search = { status?: string; page?: string };

export default async function AdminEnquiriesPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin();
  const params = await searchParams;

  // Default view: everything that still needs attention.
  const status = Object.values(EnquiryStatus).find((value) => value === params.status);
  const showAll = params.status === "all";
  const where = showAll ? {} : status ? { status } : { status: { not: "CLOSED" as const } };

  const total = await prisma.enquiry.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(parsePage(params.page), totalPages);

  const enquiries = await prisma.enquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const tabs = [
    { key: undefined, label: "Open" },
    { key: "NEW", label: "New" },
    { key: "IN_PROGRESS", label: "In progress" },
    { key: "CLOSED", label: "Closed" },
    { key: "all", label: "All" },
  ];

  return (
    <>
      <header className="admin-header">
        <h1>Enquiries</h1>
        <span className="admin-count">{total} shown</span>
      </header>

      <nav className="admin-tabs" aria-label="Filter enquiries">
        {tabs.map((tab) => {
          const active = (params.status ?? undefined) === tab.key;
          return (
            <Link
              key={tab.label}
              href={tab.key ? `/admin/enquiries?status=${tab.key}` : "/admin/enquiries"}
              className={active ? "active" : undefined}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {enquiries.length === 0 ? (
        <p className="admin-panel admin-empty">No enquiries here.</p>
      ) : (
        enquiries.map((enquiry) => (
          <article className="admin-panel admin-enquiry" key={enquiry.id}>
            <div className="admin-panel-head">
              <h2>
                {enquiry.name}{" "}
                <span className={`admin-badge ${enquiry.status === "NEW" ? "status-confirmed" : enquiry.status === "CLOSED" ? "off" : ""}`}>
                  {STATUS_LABELS[enquiry.status]}
                </span>
              </h2>
              <small>{formatOrderDate(enquiry.createdAt)}</small>
            </div>

            <p className="admin-detail">
              <strong>{enquiry.requirement}</strong>
              <br />
              <a href={`mailto:${enquiry.email}?subject=${encodeURIComponent(`Re: ${enquiry.requirement}`)}`}>{enquiry.email}</a>
              {enquiry.phone && (
                <>
                  {" · "}
                  <a href={`tel:${enquiry.phone.replace(/\s/g, "")}`}>{enquiry.phone}</a>
                </>
              )}
            </p>

            <p className="admin-enquiry-message">{enquiry.message}</p>

            <EnquiryActions enquiryId={enquiry.id} status={enquiry.status} adminNote={enquiry.adminNote ?? ""} />
          </article>
        ))
      )}

      <Pagination basePath="/admin/enquiries" params={{ status: params.status }} page={page} totalPages={totalPages} />
    </>
  );
}
