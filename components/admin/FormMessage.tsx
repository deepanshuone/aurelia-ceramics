import type { ActionState } from "../../lib/admin";

export default function FormMessage({ state }: { state: ActionState }) {
  if (state?.error) {
    return (
      <p className="form-error" role="alert">
        {state.error}
      </p>
    );
  }
  if (state?.success) {
    return (
      <p className="admin-success" role="status">
        {state.success}
      </p>
    );
  }
  return null;
}
