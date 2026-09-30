"use client";

import { useActionState, useEffect, useRef } from "react";
import FormMessage from "../../../components/admin/FormMessage";
import SubmitButton from "../../../components/admin/SubmitButton";
import { deleteCategory, saveCategory } from "./actions";

export type CategoryFormValues = {
  id: string | null;
  name: string;
  slug: string;
  description: string;
  image: string;
  isActive: boolean;
  productCount: number;
};

export default function CategoryForm({ values }: { values: CategoryFormValues }) {
  const [state, action] = useActionState(saveCategory.bind(null, values.id), null);
  const [deleteState, deleteAction] = useActionState(deleteCategory.bind(null, values.id ?? ""), null);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the "new category" form after a successful create.
  useEffect(() => {
    if (!values.id && state?.success) formRef.current?.reset();
  }, [state, values.id]);

  return (
    <>
      <form ref={formRef} action={action} className="admin-form admin-panel">
        {!values.id && <h2>New category</h2>}
        <div className="admin-field-row">
          <label className="admin-field grow">
            <span>Name *</span>
            <input name="name" defaultValue={values.name} required maxLength={80} />
          </label>
          <label className="admin-field grow">
            <span>URL slug</span>
            <input name="slug" defaultValue={values.slug} maxLength={80} placeholder="Generated from the name" />
          </label>
        </div>

        <label className="admin-field">
          <span>Description</span>
          <input name="description" defaultValue={values.description} maxLength={500} />
        </label>

        <label className="admin-field">
          <span>Image URL</span>
          <input name="image" defaultValue={values.image} maxLength={500} placeholder="https://…" />
        </label>

        <div className="admin-checks">
          <label>
            <input type="checkbox" name="isActive" defaultChecked={values.isActive} /> Visible in store
          </label>
        </div>

        <FormMessage state={state} />
        <SubmitButton>{values.id ? "Save changes" : "Create category"}</SubmitButton>
      </form>

      {values.id && values.productCount === 0 && (
        <form action={deleteAction} className="admin-panel admin-danger-zone">
          <h2>Delete category</h2>
          <p className="admin-hint">This category has no products, so it can be deleted.</p>
          <FormMessage state={deleteState} />
          <SubmitButton className="admin-btn danger" confirmMessage="Click again to delete" pendingLabel="Deleting…">
            Delete category
          </SubmitButton>
        </form>
      )}
    </>
  );
}
