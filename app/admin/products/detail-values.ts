// Shared by the product form (client) and the new/edit pages (server).

/** Product-page details; blank fields aren't shown in the store. Booleans are "", "yes" or "no". */
export type ProductDetailValues = {
  dimensions: string;
  weight: string;
  material: string;
  capacity: string;
  colour: string;
  finish: string;
  whatsIncluded: string;
  careInstructions: string;
  foodSafe: string;
  microwaveSafe: string;
  dishwasherSafe: string;
  returnable: boolean;
};

export const EMPTY_DETAILS: ProductDetailValues = {
  dimensions: "",
  weight: "",
  material: "",
  capacity: "",
  colour: "",
  finish: "",
  whatsIncluded: "",
  careInstructions: "",
  foodSafe: "",
  microwaveSafe: "",
  dishwasherSafe: "",
  returnable: true,
};
