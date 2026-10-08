"use client";

import { useActionState } from "react";
import FormMessage from "../../../components/admin/FormMessage";
import SubmitButton from "../../../components/admin/SubmitButton";
import { deleteReviewPhoto } from "./actions";

/** A customer photo thumbnail with a remove button, for moderating unsuitable photos. */
export default function RemovePhotoButton({ photoId, url }: { photoId: string; url: string }) {
  const [state, action] = useActionState(deleteReviewPhoto.bind(null, photoId), null);

  return (
    <form action={action}>
      <a href={url} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element -- customer uploads are served by our own API */}
        <img src={url} alt="Customer photo" />
      </a>
      <SubmitButton className="" confirmMessage="?" pendingLabel="…">
        ×
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
