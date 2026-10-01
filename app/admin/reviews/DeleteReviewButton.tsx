"use client";

import { useActionState } from "react";
import FormMessage from "../../../components/admin/FormMessage";
import SubmitButton from "../../../components/admin/SubmitButton";
import { deleteReview } from "./actions";

export default function DeleteReviewButton({ reviewId }: { reviewId: string }) {
  const [state, action] = useActionState(deleteReview.bind(null, reviewId), null);

  return (
    <form action={action} className="admin-row-action">
      <SubmitButton className="admin-btn danger small" confirmMessage="Confirm delete" pendingLabel="Deleting…">
        Delete
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
