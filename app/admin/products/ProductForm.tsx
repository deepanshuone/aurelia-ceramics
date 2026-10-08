"use client";

import { useActionState } from "react";
import FormMessage from "../../../components/admin/FormMessage";
import SubmitButton from "../../../components/admin/SubmitButton";
import { deleteProduct, saveProduct } from "./actions";
import type { ProductDetailValues } from "./detail-values";

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
  details: ProductDetailValues;
  isActive: boolean;
  isFeatured: boolean;
  /** How many past order lines include this product (shown as a warning before deleting). */
  orderCount: number;
};

const TEXT_DETAILS = [
  { name: "dimensions", label: "Dimensions", placeholder: "27 cm dia × 3 cm" },
  { name: "weight", label: "Weight", placeholder: "650 g" },
  { name: "capacity", label: "Capacity", placeholder: "350 ml" },
  { name: "material", label: "Material", placeholder: "Stoneware" },
  { name: "colour", label: "Colour", placeholder: "Sage green" },
  { name: "finish", label: "Finish", placeholder: "Matte glaze" },
] as const;

const YES_NO_DETAILS = [
  { name: "foodSafe", label: "Food safe" },
  { name: "microwaveSafe", label: "Microwave safe" },
  { name: "dishwasherSafe", label: "Dishwasher safe" },
] as const;

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

        <fieldset className="admin-fieldset">
          <legend>Product page details</legend>
          <p className="admin-hint">Fill in what you know. Anything left blank is simply not shown in the store.</p>
          <div className="admin-field-row">
            {TEXT_DETAILS.map((field) => (
              <label className="admin-field" key={field.name}>
                <span>{field.label}</span>
                <input
                  name={field.name}
                  defaultValue={values.details[field.name]}
                  maxLength={120}
                  placeholder={field.placeholder}
                />
              </label>
            ))}
          </div>
          <div className="admin-field-row">
            {YES_NO_DETAILS.map((field) => (
              <label className="admin-field" key={field.name}>
                <span>{field.label}</span>
                <select name={field.name} defaultValue={values.details[field.name]}>
                  <option value="">Not specified</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
            ))}
          </div>
          <label className="admin-field">
            <span>What&apos;s included</span>
            <textarea
              name="whatsIncluded"
              rows={2}
              defaultValue={values.details.whatsIncluded}
              maxLength={1000}
              placeholder="2 mugs, 2 saucers, gift box"
            />
          </label>
          <label className="admin-field">
            <span>Care instructions</span>
            <textarea
              name="careInstructions"
              rows={2}
              defaultValue={values.details.careInstructions}
              maxLength={1000}
              placeholder="Hand wash with a soft sponge. Avoid sudden temperature changes."
            />
          </label>
          <div className="admin-checks">
            <label>
              <input type="checkbox" name="returnable" defaultChecked={values.details.returnable} /> Returnable within
              the return window (untick for items that can&apos;t be returned for a change of mind)
            </label>
          </div>
        </fieldset>

        <label className="admin-field">
          <span>Other specifications — one per line, as “Label: Value”</span>
          <textarea
            name="specifications"
            rows={5}
            defaultValue={values.specifications}
            placeholder={"Material: Ceramic\nFinish: Glossy\nDishwasher Safe: Yes"}
          />
        </label>

        <label className="admin-field">
          <span>Image URLs — one per line, first is the main image (4–6 photos from different angles work best)</span>
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
