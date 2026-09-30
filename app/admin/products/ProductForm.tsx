"use client";

import { useActionState } from "react";
import FormMessage from "../../../components/admin/FormMessage";
import SubmitButton from "../../../components/admin/SubmitButton";
import { deleteProduct, saveProduct } from "./actions";

export type ProductFormValues = {
  id: string | null;
  name: string;
  slug: string;
  code: string;
  categoryId: string;
  price: string;
  mrp: string;
  stock: string;
  description: string;
  specifications: string;
  images: string;
  isActive: boolean;
  isFeatured: boolean;
  /** How many past order lines include this product (shown as a warning before deleting). */
  orderCount: number;
};

export default function ProductForm({
  values,
  categories,
}: {
  values: ProductFormValues;
  categories: { id: string; name: string; isActive: boolean }[];
}) {
  const [state, action] = useActionState(saveProduct.bind(null, values.id), null);
  const [deleteState, deleteAction] = useActionState(deleteProduct.bind(null, values.id ?? ""), null);

  return (
    <>
      <form action={action} className="admin-form admin-panel">
        <div className="admin-field-row">
          <label className="admin-field grow">
            <span>Name *</span>
            <input name="name" defaultValue={values.name} required maxLength={120} />
          </label>
          <label className="admin-field">
            <span>Product code *</span>
            <input name="code" defaultValue={values.code} required maxLength={40} placeholder="AC-PL-001" />
          </label>
        </div>

        <div className="admin-field-row">
          <label className="admin-field grow">
            <span>URL slug</span>
            <input name="slug" defaultValue={values.slug} maxLength={80} placeholder="Leave blank to generate from the name" />
          </label>
          <label className="admin-field">
            <span>Category *</span>
            <select name="categoryId" defaultValue={values.categoryId} required>
              <option value="" disabled>
                Choose…
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.isActive ? "" : " (hidden)"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="admin-field-row">
          <label className="admin-field">
            <span>Price (₹) *</span>
            <input name="price" type="number" step="0.01" min="0.01" defaultValue={values.price} required />
          </label>
          <label className="admin-field">
            <span>MRP (₹)</span>
            <input name="mrp" type="number" step="0.01" min="0" defaultValue={values.mrp} placeholder="Optional" />
          </label>
          <label className="admin-field">
            <span>Stock *</span>
            <input name="stock" type="number" step="1" min="0" defaultValue={values.stock} required />
          </label>
        </div>

        <label className="admin-field">
          <span>Description</span>
          <textarea name="description" rows={4} defaultValue={values.description} maxLength={5000} />
        </label>

        <label className="admin-field">
          <span>Specifications — one per line, as “Label: Value”</span>
          <textarea
            name="specifications"
            rows={5}
            defaultValue={values.specifications}
            placeholder={"Material: Ceramic\nFinish: Glossy\nDishwasher Safe: Yes"}
          />
        </label>

        <label className="admin-field">
          <span>Image URLs — one per line, first is the main image</span>
          <textarea name="images" rows={3} defaultValue={values.images} placeholder="https://… or /images/plate.jpg" />
        </label>

        <div className="admin-checks">
          <label>
            <input type="checkbox" name="isActive" defaultChecked={values.isActive} /> Visible in store
          </label>
          <label>
            <input type="checkbox" name="isFeatured" defaultChecked={values.isFeatured} /> Featured on home page
          </label>
        </div>

        <FormMessage state={state} />
        <SubmitButton>{values.id ? "Save changes" : "Create product"}</SubmitButton>
      </form>

      {values.id && (
        <form action={deleteAction} className="admin-panel admin-danger-zone">
          <h2>Delete product</h2>
          <p className="admin-hint">
            Permanently removes the product from the store and from every cart.
            {values.orderCount > 0 &&
              ` It appears in ${values.orderCount} past order${values.orderCount === 1 ? "" : "s"} — those orders keep its name and price.`}
            {" "}To take it off sale temporarily, untick “Visible in store” instead.
          </p>
          <FormMessage state={deleteState} />
          <SubmitButton className="admin-btn danger" confirmMessage="Click again to delete" pendingLabel="Deleting…">
            Delete product
          </SubmitButton>
        </form>
      )}
    </>
  );
}
